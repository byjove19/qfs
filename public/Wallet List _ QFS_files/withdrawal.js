// withdrawal.js - Add this to your existing JavaScript
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing withdrawal modal...');
    setTimeout(initWithdrawalModal, 200);
});

function initWithdrawalModal() {
    if (typeof bootstrap === 'undefined') {
        console.error('Bootstrap is not loaded. Please include Bootstrap 5.');
        return;
    }

    const withdrawalModalElement = document.getElementById('withdrawalModal');
    if (!withdrawalModalElement) {
        console.error('Withdrawal modal element not found');
        return;
    }

    console.log('Bootstrap found, withdrawal modal element found');
    
    const withdrawalModal = new bootstrap.Modal(withdrawalModalElement, {
        backdrop: 'static',
        keyboard: false,
        focus: true
    });
    
    let currentWithdrawalStep = 1;
    let selectedWithdrawalCurrency = '';
    let selectedWithdrawalMethod = '';
    let currentWithdrawalData = {};
    
    // Update all withdrawal buttons to open the modal with correct currency
    document.querySelectorAll('.withdraw-modal-trigger').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            selectedWithdrawalCurrency = this.getAttribute('data-currency') || 'USD';
            console.log('Opening withdrawal modal for currency:', selectedWithdrawalCurrency);
            resetWithdrawalForm();
            updateAvailableBalance(selectedWithdrawalCurrency);
            withdrawalModal.show();
        });
    });
    
    // Fix for select dropdowns
    withdrawalModalElement.addEventListener('shown.bs.modal', function () {
        withdrawalModalElement.removeAttribute('aria-hidden');
        
        const selects = withdrawalModalElement.querySelectorAll('select');
        selects.forEach(select => {
            select.style.pointerEvents = 'auto';
            select.style.position = 'relative';
            select.style.zIndex = '1';
        });
    });
    
    // Step navigation
    const nextToWithdrawalStep2 = document.getElementById('nextToWithdrawalStep2');
    const backToWithdrawalStep1 = document.getElementById('backToWithdrawalStep1');
    const confirmWithdrawalBtn = document.getElementById('confirmWithdrawalBtn');
    const withdrawAgain = document.getElementById('withdrawAgain');
    const printWithdrawalReceipt = document.getElementById('printWithdrawalReceipt');
    
    if (nextToWithdrawalStep2) {
        nextToWithdrawalStep2.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (validateWithdrawalStep1()) {
                showWithdrawalStep(2);
                updateWithdrawalReviewDetails();
            }
        });
    }
    
    if (backToWithdrawalStep1) {
        backToWithdrawalStep1.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            showWithdrawalStep(1);
        });
    }
    
    if (confirmWithdrawalBtn) {
        confirmWithdrawalBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (validateWithdrawalStep2()) {
                showWithdrawalReceiptStep();
            }
        });
    }
    
    if (withdrawAgain) {
        withdrawAgain.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            resetWithdrawalForm();
            showWithdrawalStep(1);
        });
    }
    
    if (printWithdrawalReceipt) {
        printWithdrawalReceipt.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            printWithdrawalReceiptFunction();
        });
    }
    
    // Withdrawal method change handler
    const withdrawalMethod = document.getElementById('withdrawalMethod');
    if (withdrawalMethod) {
        withdrawalMethod.addEventListener('change', function() {
            console.log('Withdrawal method changed to:', this.value);
            selectedWithdrawalMethod = this.value;
            updateMethodDetails();
            updateProcessingTime();
        });
    }
    
    // Currency change handler
    const withdrawalCurrencySelect = document.getElementById('withdrawalCurrencySelect');
    if (withdrawalCurrencySelect) {
        withdrawalCurrencySelect.addEventListener('change', function() {
            console.log('Withdrawal currency changed to:', this.value);
            updateAvailableBalance(this.value);
            updateWithdrawalFee();
        });
    }
    
    // Amount change handler
    const withdrawalAmount = document.getElementById('withdrawalAmount');
    if (withdrawalAmount) {
        withdrawalAmount.addEventListener('input', updateWithdrawalReviewDetails);
    }
    
    function showWithdrawalStep(step) {
        console.log('Showing withdrawal step:', step);
        
        // Hide all steps
        document.querySelectorAll('.withdrawal-step').forEach(el => {
            el.classList.remove('active');
            el.classList.add('d-none');
        });
        
        // Hide all button groups
        document.querySelectorAll('#withdrawalStep1Buttons, #withdrawalStep2Buttons, #withdrawalStep3Buttons').forEach(el => {
            el.classList.add('d-none');
        });
        
        // Show current step
        const stepElement = document.getElementById(`withdrawalStep${step}`);
        const buttonsElement = document.getElementById(`withdrawalStep${step}Buttons`);
        
        if (stepElement) {
            stepElement.classList.remove('d-none');
            stepElement.classList.add('active');
        }
        if (buttonsElement) buttonsElement.classList.remove('d-none');
        
        currentWithdrawalStep = step;
    }
    
    function updateMethodDetails() {
        const method = document.getElementById('withdrawalMethod').value;
        selectedWithdrawalMethod = method;
        
        // Hide all method details
        document.querySelectorAll('.method-details').forEach(el => {
            el.classList.add('d-none');
        });
        
        // Show the appropriate method details
        if (method === 'bank') {
            document.getElementById('bankDetails').classList.remove('d-none');
        } else if (method === 'crypto') {
            document.getElementById('cryptoDetails').classList.remove('d-none');
        } else if (['paypal', 'skrill', 'neteller'].includes(method)) {
            document.getElementById('ewalletDetails').classList.remove('d-none');
        }
    }
    
    function updateProcessingTime() {
        const method = document.getElementById('withdrawalMethod').value;
        const currency = document.getElementById('withdrawalCurrencySelect').value;
        let processingTime = '1-3 Business Days';
        
        if (method === 'crypto') {
            processingTime = '15-30 Minutes';
        } else if (['paypal', 'skrill', 'neteller'].includes(method)) {
            processingTime = '1-2 Business Days';
        }
        
        const reviewProcessingTime = document.getElementById('reviewProcessingTime');
        const finalProcessingTime = document.getElementById('finalProcessingTime');
        
        if (reviewProcessingTime) reviewProcessingTime.textContent = processingTime;
        if (finalProcessingTime) finalProcessingTime.textContent = processingTime;
    }
    
    function updateAvailableBalance(currency) {
        // This would typically fetch from your backend
        // For now, using placeholder data
        const balanceElement = document.getElementById('availableBalance');
        if (balanceElement) {
            balanceElement.textContent = `Available Balance: ${currency} 0.00`;
        }
    }
    
    function updateWithdrawalFee() {
        const currency = document.getElementById('withdrawalCurrencySelect').value;
        const method = document.getElementById('withdrawalMethod').value;
        let feeRate = '0.00';
        
        if (method === 'bank') feeRate = '1.50';
        else if (method === 'crypto') feeRate = '0.50';
        else feeRate = '2.00';
        
        const feeInfo = document.getElementById('withdrawalFeeInfo');
        if (feeInfo) {
            feeInfo.textContent = `Fee (${feeRate}%+0.00) Total Fee: ${currency} 0.00`;
        }
    }
    
    function validateWithdrawalStep1() {
        const currency = document.getElementById('withdrawalCurrencySelect').value;
        const amount = document.getElementById('withdrawalAmount').value;
        const method = document.getElementById('withdrawalMethod').value;
        
        console.log('Validating withdrawal step 1:', { currency, amount, method });
        
        if (!currency) {
            showAlert('Please select a currency', 'error');
            return false;
        }
        
        if (!amount || parseFloat(amount) <= 0) {
            showAlert('Please enter a valid amount', 'error');
            return false;
        }
        
        if (!method) {
            showAlert('Please select a withdrawal method', 'error');
            return false;
        }
        
        // Validate method-specific fields
        if (method === 'bank') {
            const bankName = document.getElementById('bankName').value;
            const accountNumber = document.getElementById('accountNumber').value;
            const accountHolderName = document.getElementById('accountHolderName').value;
            
            if (!bankName || !accountNumber || !accountHolderName) {
                showAlert('Please fill in all required bank details', 'error');
                return false;
            }
        } else if (method === 'crypto') {
            const walletAddress = document.getElementById('walletAddress').value;
            const networkType = document.getElementById('networkType').value;
            
            if (!walletAddress) {
                showAlert('Please enter your wallet address', 'error');
                return false;
            }
            if (!networkType) {
                showAlert('Please select a network type', 'error');
                return false;
            }
        } else if (['paypal', 'skrill', 'neteller'].includes(method)) {
            const ewalletEmail = document.getElementById('ewalletEmail').value;
            if (!ewalletEmail) {
                showAlert('Please enter your e-wallet email address', 'error');
                return false;
            }
        }
        
        return true;
    }
    
    function validateWithdrawalStep2() {
        const confirmCheckbox = document.getElementById('confirmWithdrawal');
        
        if (!confirmCheckbox || !confirmCheckbox.checked) {
            showAlert('Please confirm that all withdrawal details are correct', 'error');
            return false;
        }
        
        return true;
    }
    
    function updateWithdrawalReviewDetails() {
        const amount = parseFloat(document.getElementById('withdrawalAmount').value) || 0;
        const currency = document.getElementById('withdrawalCurrencySelect').value || 'USD';
        const method = document.getElementById('withdrawalMethod').value || 'bank';
        
        // Calculate fees (placeholder calculation)
        let feePercentage = 0;
        if (method === 'bank') feePercentage = 0.015; // 1.5%
        else if (method === 'crypto') feePercentage = 0.005; // 0.5%
        else feePercentage = 0.02; // 2%
        
        const fee = amount * feePercentage;
        const netAmount = amount - fee;
        
        const reviewAmount = document.getElementById('reviewAmount');
        const reviewFee = document.getElementById('reviewFee');
        const reviewNetAmount = document.getElementById('reviewNetAmount');
        const reviewMethod = document.getElementById('reviewMethod');
        const reviewTotal = document.getElementById('reviewTotal');
        
        if (reviewAmount) reviewAmount.textContent = `${currency} ${amount.toFixed(2)}`;
        if (reviewFee) reviewFee.textContent = `${currency} ${fee.toFixed(2)}`;
        if (reviewNetAmount) reviewNetAmount.textContent = `${currency} ${netAmount.toFixed(2)}`;
        if (reviewTotal) reviewTotal.textContent = `${currency} ${amount.toFixed(2)}`;
        
        // Format method name for display
        let methodDisplay = '';
        switch(method) {
            case 'bank': methodDisplay = 'Bank Transfer'; break;
            case 'crypto': methodDisplay = 'Crypto Wallet'; break;
            case 'paypal': methodDisplay = 'PayPal'; break;
            case 'skrill': methodDisplay = 'Skrill'; break;
            case 'neteller': methodDisplay = 'Neteller'; break;
            default: methodDisplay = method;
        }
        if (reviewMethod) reviewMethod.textContent = methodDisplay;
    }
    
    function showWithdrawalReceiptStep() {
        // Collect all withdrawal data
        currentWithdrawalData = {
            amount: parseFloat(document.getElementById('withdrawalAmount').value) || 0,
            currency: document.getElementById('withdrawalCurrencySelect').value || 'USD',
            withdrawalMethod: document.getElementById('withdrawalMethod').value,
            notes: document.getElementById('withdrawalNotes')?.value || '',
            transactionId: 'WTXN' + Date.now() + Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toISOString(),
            // Method-specific data
            bankDetails: {},
            cryptoDetails: {},
            ewalletDetails: {}
        };
        
        // Collect method-specific data
        const method = currentWithdrawalData.withdrawalMethod;
        if (method === 'bank') {
            currentWithdrawalData.bankDetails = {
                bankName: document.getElementById('bankName').value,
                accountNumber: document.getElementById('accountNumber').value,
                accountHolderName: document.getElementById('accountHolderName').value,
                ibanSwift: document.getElementById('ibanSwift').value
            };
        } else if (method === 'crypto') {
            currentWithdrawalData.cryptoDetails = {
                walletAddress: document.getElementById('walletAddress').value,
                networkType: document.getElementById('networkType').value
            };
        } else if (['paypal', 'skrill', 'neteller'].includes(method)) {
            currentWithdrawalData.ewalletDetails = {
                email: document.getElementById('ewalletEmail').value
            };
        }
        
        // Update the receipt display
        const finalWithdrawalAmount = document.getElementById('finalWithdrawalAmount');
        const withdrawalTransactionId = document.getElementById('withdrawalTransactionId');
        const finalWithdrawalMethod = document.getElementById('finalWithdrawalMethod');
        
        if (finalWithdrawalAmount) {
            finalWithdrawalAmount.textContent = `${currentWithdrawalData.currency} ${currentWithdrawalData.amount.toFixed(2)}`;
        }
        
        if (withdrawalTransactionId) {
            withdrawalTransactionId.textContent = currentWithdrawalData.transactionId;
        }
        
        if (finalWithdrawalMethod) {
            let methodDisplay = '';
            switch(currentWithdrawalData.withdrawalMethod) {
                case 'bank': methodDisplay = 'Bank Transfer'; break;
                case 'crypto': methodDisplay = 'Crypto Wallet'; break;
                case 'paypal': methodDisplay = 'PayPal'; break;
                case 'skrill': methodDisplay = 'Skrill'; break;
                case 'neteller': methodDisplay = 'Neteller'; break;
                default: methodDisplay = currentWithdrawalData.withdrawalMethod;
            }
            finalWithdrawalMethod.textContent = methodDisplay;
        }
        
        // Show step 3 (receipt)
        showWithdrawalStep(3);
        
        // Auto-submit to server after showing receipt
        setTimeout(() => {
            processWithdrawalToServer();
        }, 1000);
    }
    
    async function processWithdrawalToServer() {
        // Show loading state in step 3
        const withdrawAgainBtn = document.getElementById('withdrawAgain');
        const printWithdrawalReceiptBtn = document.getElementById('printWithdrawalReceipt');
        const statusMessage = document.getElementById('withdrawalStatusMessage');
        
        if (statusMessage) {
            statusMessage.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Submitting to server...';
        }
        
        if (withdrawAgainBtn) withdrawAgainBtn.disabled = true;
        if (printWithdrawalReceiptBtn) printWithdrawalReceiptBtn.disabled = true;
        
        try {
            const formData = new FormData();
            formData.append('amount', currentWithdrawalData.amount);
            formData.append('currency', currentWithdrawalData.currency);
            formData.append('withdrawalMethod', currentWithdrawalData.withdrawalMethod);
            formData.append('description', `Withdrawal via ${currentWithdrawalData.withdrawalMethod}`);
            formData.append('transactionId', currentWithdrawalData.transactionId);
            
            // Add method-specific data
            if (currentWithdrawalData.withdrawalMethod === 'bank') {
                formData.append('bankName', currentWithdrawalData.bankDetails.bankName);
                formData.append('accountNumber', currentWithdrawalData.bankDetails.accountNumber);
                formData.append('accountHolderName', currentWithdrawalData.bankDetails.accountHolderName);
                if (currentWithdrawalData.bankDetails.ibanSwift) {
                    formData.append('ibanSwift', currentWithdrawalData.bankDetails.ibanSwift);
                }
            } else if (currentWithdrawalData.withdrawalMethod === 'crypto') {
                formData.append('walletAddress', currentWithdrawalData.cryptoDetails.walletAddress);
                formData.append('networkType', currentWithdrawalData.cryptoDetails.networkType);
            } else if (['paypal', 'skrill', 'neteller'].includes(currentWithdrawalData.withdrawalMethod)) {
                formData.append('ewalletEmail', currentWithdrawalData.ewalletDetails.email);
            }
            
            // Add notes if provided
            if (currentWithdrawalData.notes) {
                formData.append('userNotes', currentWithdrawalData.notes);
            }
            
            const response = await fetch('/withdrawal/process', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRF-Token': getCSRFToken()
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                if (statusMessage) {
                    statusMessage.innerHTML = '<i class="fas fa-check-circle text-success me-2"></i> Successfully submitted! Pending admin approval.';
                }
                showAlert('Withdrawal request submitted successfully! It will be processed after admin approval.', 'success');
                console.log('Withdrawal processed successfully:', result.data);
            } else {
                if (statusMessage) {
                    statusMessage.innerHTML = '<i class="fas fa-exclamation-triangle text-warning me-2"></i> Submission failed. Please try again.';
                }
                showAlert(result.message || 'Withdrawal failed. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Withdrawal processing error:', error);
            if (statusMessage) {
                statusMessage.innerHTML = '<i class="fas fa-exclamation-triangle text-danger me-2"></i> Network error. Please check connection.';
            }
            showAlert('Network error. Please check your connection and try again.', 'error');
        } finally {
            // Restore button state
            if (withdrawAgainBtn) withdrawAgainBtn.disabled = false;
            if (printWithdrawalReceiptBtn) printWithdrawalReceiptBtn.disabled = false;
        }
    }
    
    function resetWithdrawalForm() {
        console.log('Resetting withdrawal form');
        
        const form1 = document.getElementById('withdrawalFormStep1');
        const form2 = document.getElementById('withdrawalFormStep2');
        
        if (form1) form1.reset();
        if (form2) form2.reset();
        
        // Hide all method details
        document.querySelectorAll('.method-details').forEach(el => {
            el.classList.add('d-none');
        });
        
        const currencySelect = document.getElementById('withdrawalCurrencySelect');
        if (currencySelect && selectedWithdrawalCurrency) {
            currencySelect.value = selectedWithdrawalCurrency;
        }
        
        currentWithdrawalStep = 1;
        selectedWithdrawalMethod = '';
        currentWithdrawalData = {};
        showWithdrawalStep(1);
    }
    
    function printWithdrawalReceiptFunction() {
        const finalWithdrawalAmount = document.getElementById('finalWithdrawalAmount');
        const withdrawalTransactionId = document.getElementById('withdrawalTransactionId');
        if (!finalWithdrawalAmount || !withdrawalTransactionId) return;
        
        const receiptContent = `
            <!DOCTYPE html>
            <html>
                <head>
                    <title>QFS Withdrawal Receipt</title>
                    <style>
                        body { 
                            font-family: Arial, sans-serif; 
                            padding: 30px; 
                            max-width: 500px; 
                            margin: 0 auto; 
                            color: #333; 
                            background: white;
                        }
                        .receipt-header { 
                            text-align: center; 
                            margin-bottom: 30px; 
                            border-bottom: 2px solid #333; 
                            padding-bottom: 20px; 
                        }
                        .receipt-details { 
                            margin: 25px 0; 
                        }
                        .detail-row { 
                            display: flex; 
                            justify-content: space-between; 
                            margin: 12px 0; 
                            padding: 8px 0; 
                            border-bottom: 1px solid #eee; 
                        }
                        .thank-you { 
                            text-align: center; 
                            margin-top: 40px; 
                            font-style: italic; 
                            color: #666; 
                        }
                        .amount-highlight { 
                            font-size: 24px; 
                            font-weight: bold; 
                            color: #283ba7ff; 
                            text-align: center; 
                            margin: 20px 0; 
                            padding: 15px;
                            background: #f8f9fa;
                            border-radius: 8px;
                        }
                        .status-pending {
                            color: #ffc107;
                            font-weight: bold;
                        }
                        .instructions {
                            background: #f8f9fa;
                            padding: 15px;
                            border-radius: 8px;
                            margin: 15px 0;
                            font-size: 14px;
                        }
                        @media print { 
                            body { 
                                padding: 20px; 
                            }
                            .no-print {
                                display: none !important;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="receipt-header">
                        <h1 style="margin: 0; color: #333;">QFS</h1>
                        <h2 style="margin: 10px 0; color: #555;">Withdrawal Receipt</h2>
                        <p style="margin: 5px 0; color: #777;">Date: ${new Date().toLocaleDateString()} | Time: ${new Date().toLocaleTimeString()}</p>
                    </div>
                    <div class="receipt-details">
                        <div class="detail-row">
                            <strong>Transaction ID:</strong>
                            <span>${withdrawalTransactionId.textContent}</span>
                        </div>
                        <div class="detail-row">
                            <strong>Status:</strong>
                            <span class="status-pending">Pending Approval</span>
                        </div>
                        <div class="detail-row">
                            <strong>Withdrawal Method:</strong>
                            <span>${document.getElementById('finalWithdrawalMethod').textContent}</span>
                        </div>
                        <div class="amount-highlight">${finalWithdrawalAmount.textContent}</div>
                    </div>
                    <div class="instructions">
                        <p><strong>Next Steps:</strong></p>
                        <p>1. Your withdrawal is pending admin approval</p>
                        <p>2. You will be notified once processed</p>
                        <p>3. Processing time: ${document.getElementById('finalProcessingTime').textContent}</p>
                        <p>4. Keep this receipt for your records</p>
                    </div>
                    <div class="thank-you">
                        <p>Thank you for choosing QFS!</p>
                    </div>
                    <div class="no-print" style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                        <button onclick="window.print()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
                            Print Receipt
                        </button>
                        <button onclick="window.close()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">
                            Close
                        </button>
                    </div>
                </body>
            </html>
        `;
        
        const printWindow = window.open('', '_blank', 'width=600,height=700');
        if (printWindow) {
            printWindow.document.write(receiptContent);
            printWindow.document.close();
            
            setTimeout(() => {
                printWindow.print();
            }, 500);
        }
    }
    
    console.log('Withdrawal modal initialized successfully');
}