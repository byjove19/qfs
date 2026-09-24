// controllers/withdrawalController.js

const Transaction = require('../models/Transaction');
const Wallet = require('../models/Wallet');
const User = require('../models/User');
const mongoose = require('mongoose');

const withdrawalController = {
    // GET Withdrawal Page
    getWithdrawalPage: async (req, res) => {
        try {
            const userId = req.session.user?._id;
            
            if (!userId) {
                req.flash('error', 'Please login to withdraw funds');
                return res.redirect('/auth/login');
            }

            // Get user's wallets for balance display
            const wallets = await Wallet.find({ userId }).lean();
            
            res.render('transactions/withdraw', {
                title: 'Withdraw Funds - QFS',
                wallets,
                user: req.session.user,
                messages: {
                    error: req.flash('error'),
                    success: req.flash('success')
                },
                formData: req.flash('formData')[0] || {}
            });
        } catch (error) {
            console.error('Withdrawal page error:', error);
            req.flash('error', 'Failed to load withdrawal page');
            res.redirect('/transactions');
        }
    },

    // Process Withdrawal Request
    processWithdrawal: async (req, res) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            const {
                withdrawal_method,
                currency,
                amount,
                notes,
                // Bank details
                bank_name,
                account_number,
                account_holder,
                // Crypto details
                wallet_address,
                network_type,
                // E-wallet details
                ewallet_email
            } = req.body;

            const userId = req.session.user?._id;

            if (!userId) {
                await session.abortTransaction();
                session.endSession();
                req.flash('error', 'Please login to withdraw funds');
                return res.redirect('/auth/login');
            }

            // Validate required fields
            if (!withdrawal_method || !currency || !amount) {
                await session.abortTransaction();
                session.endSession();
                req.flash('formData', req.body);
                req.flash('error', 'Please fill all required fields');
                return res.redirect('/transactions/withdraw');
            }

            const amountNum = parseFloat(amount);
            if (isNaN(amountNum) || amountNum <= 0) {
                await session.abortTransaction();
                session.endSession();
                req.flash('formData', req.body);
                req.flash('error', 'Invalid amount');
                return res.redirect('/transactions/withdraw');
            }

            // Check user's wallet balance
            const wallet = await Wallet.findOne({ 
                userId, 
                currency: currency.toUpperCase() 
            }).session(session);

            if (!wallet) {
                await session.abortTransaction();
                session.endSession();
                req.flash('formData', req.body);
                req.flash('error', `No ${currency} wallet found`);
                return res.redirect('/transactions/withdraw');
            }

            // Calculate fees
            const fees = calculateWithdrawalFees(amountNum, withdrawal_method);
            const totalDeduction = amountNum + fees.totalFee;

            if (wallet.balance < totalDeduction) {
                await session.abortTransaction();
                session.endSession();
                req.flash('formData', req.body);
                req.flash('error', `Insufficient balance. Available: ${wallet.balance} ${currency}, Required: ${totalDeduction} ${currency} (including fees)`);
                return res.redirect('/transactions/withdraw');
            }

            // Method-specific validation
            let methodDetails = {};
            let processingTime = '1-3 business days';
            
            switch (withdrawal_method) {
                case 'bank':
                    if (!bank_name || !account_number || !account_holder) {
                        await session.abortTransaction();
                        session.endSession();
                        req.flash('formData', req.body);
                        req.flash('error', 'Please fill all bank details');
                        return res.redirect('/transactions/withdraw');
                    }
                    methodDetails = {
                        bank_name,
                        account_number,
                        account_holder
                    };
                    processingTime = '1-3 business days';
                    break;

                case 'crypto':
                    if (!wallet_address) {
                        await session.abortTransaction();
                        session.endSession();
                        req.flash('formData', req.body);
                        req.flash('error', 'Wallet address is required');
                        return res.redirect('/transactions/withdraw');
                    }
                    methodDetails = {
                        wallet_address,
                        network_type: network_type || 'ERC20'
                    };
                    processingTime = '15-30 minutes';
                    break;

                case 'paypal':
                case 'skrill':
                case 'neteller':
                    if (!ewallet_email) {
                        await session.abortTransaction();
                        session.endSession();
                        req.flash('formData', req.body);
                        req.flash('error', 'Email address is required');
                        return res.redirect('/transactions/withdraw');
                    }
                    methodDetails = {
                        ewallet_email
                    };
                    processingTime = '1-2 business days';
                    break;

                default:
                    await session.abortTransaction();
                    session.endSession();
                    req.flash('formData', req.body);
                    req.flash('error', 'Invalid withdrawal method');
                    return res.redirect('/transactions/withdraw');
            }

            // Deduct amount from wallet
            const oldBalance = wallet.balance;
            wallet.balance -= totalDeduction;
            wallet.lastAction = new Date();
            await wallet.save({ session });

            // Create withdrawal transaction
            const transaction = new Transaction({
                userId,
                walletId: wallet._id,
                type: 'withdrawal',
                method: withdrawal_method,
                amount: amountNum,
                currency: currency.toUpperCase(),
                status: 'pending',
                description: `Withdrawal to ${withdrawal_method}`,
                fee: fees.totalFee,
                metadata: {
                    withdrawalMethod: withdrawal_method,
                    methodDetails,
                    userNotes: notes,
                    netAmount: amountNum - fees.totalFee,
                    processingTime: processingTime,
                    requiresApproval: true,
                    submittedAt: new Date(),
                    originalBalance: oldBalance,
                    newBalance: wallet.balance,
                    fees: {
                        percentage: fees.percentageFee,
                        fixed: fees.fixedFee,
                        total: fees.totalFee
                    }
                }
            });

            await transaction.save({ session });

            await session.commitTransaction();
            session.endSession();

            console.log(`Withdrawal created: ${transaction._id} for user ${userId}`);
            
            req.flash('success', 
                `Withdrawal request submitted successfully! ${amountNum} ${currency} will be processed within ${processingTime}.`
            );
            res.redirect('/transactions');
            
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            console.error('Withdrawal process error:', error);
            req.flash('error', 'Failed to process withdrawal request: ' + error.message);
            req.flash('formData', req.body);
            res.redirect('/transactions/withdraw');
        }
    },

    // Get Withdrawal List for User
    getWithdrawalList: async (req, res) => {
        try {
            const userId = req.session.user?._id;
            
            if (!userId) {
                req.flash('error', 'Please login to view withdrawals');
                return res.redirect('/auth/login');
            }

            const page = parseInt(req.query.page) || 1;
            const limit = 10;
            const skip = (page - 1) * limit;

            const [withdrawals, total] = await Promise.all([
                Transaction.find({ 
                    userId: userId,
                    type: 'withdrawal'
                })
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Transaction.countDocuments({ 
                    userId: userId,
                    type: 'withdrawal'
                })
            ]);

            res.render('transactions/withdrawal-list', {
                title: 'Withdrawal History - QFS',
                withdrawals,
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                user: req.session.user,
                messages: {
                    error: req.flash('error'),
                    success: req.flash('success')
                }
            });
        } catch (error) {
            console.error('Withdrawal list error:', error);
            req.flash('error', 'Failed to load withdrawal history');
            res.redirect('/transactions');
        }
    }
};

// Helper function to calculate withdrawal fees
function calculateWithdrawalFees(amount, method) {
    let percentageFee = 0;
    let fixedFee = 0;

    switch (method) {
        case 'bank':
            percentageFee = 0.025; // 2.5%
            fixedFee = 0.30;
            break;
        case 'crypto':
            percentageFee = 0.005; // 0.5%
            fixedFee = 0;
            break;
        case 'paypal':
        case 'skrill':
        case 'neteller':
            percentageFee = 0.03; // 3%
            fixedFee = 0.25;
            break;
        default:
            percentageFee = 0.02; // 2%
            fixedFee = 0.20;
    }

    const percentageAmount = amount * percentageFee;
    const totalFee = percentageAmount + fixedFee;

    return {
        percentageFee: percentageFee * 100,
        fixedFee,
        percentageAmount,
        totalFee
    };
}

module.exports = withdrawalController;