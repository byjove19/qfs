// src/services/transactionService.ts
import { Types } from 'mongoose';
import Transaction, { ITransaction, TransactionType, TransactionStatus } from '../models/Transaction';
import { TransactionFilters, CreateTransactionData } from '../types/transaction';

class TransactionService {
  
  /**
   * Create a new transaction
   */
  async createTransaction(data: CreateTransactionData): Promise<ITransaction> {
    try {
      const {
        userId,
        walletId,
        type,
        amount,
        currency,
        description,
        fee = 0,
        metadata = {}
      } = data;

      // Calculate net amount
      const netAmount = type.includes('sent') || type === 'withdrawal' 
        ? amount - fee 
        : amount + fee;

      // Generate unique reference ID
      const referenceId = `TXN${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      const transaction = new Transaction({
        referenceId,
        user: new Types.ObjectId(userId),
        wallet: new Types.ObjectId(walletId),
        type,
        amount,
        currency: currency.toUpperCase(),
        fee,
        netAmount,
        description,
        metadata,
        status: 'pending' // Default status
      });

      return await transaction.save();
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw new Error('Failed to create transaction');
    }
  }

  /**
   * Get transactions for a user with filters
   */
  async getUserTransactions(
    userId: Types.ObjectId,
    filters: TransactionFilters = {}
  ): Promise<{ transactions: ITransaction[]; total: number }> {
    try {
      const {
        type,
        status,
        wallet,
        fromDate,
        toDate,
        page = 1,
        limit = 20
      } = filters;

      // Build filter query
      const filter: any = { user: userId };
      
      if (type && type !== 'all') filter.type = type;
      if (status && status !== 'all') filter.status = status;
      if (wallet && wallet !== 'all') filter.wallet = wallet;
      
      // Date range filter
      if (fromDate || toDate) {
        filter.createdAt = {};
        if (fromDate) filter.createdAt.$gte = fromDate;
        if (toDate) filter.createdAt.$lte = toDate;
      }

      const skip = (page - 1) * limit;

      const [transactions, total] = await Promise.all([
        Transaction.find(filter)
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip)
          .populate('wallet', 'currency balance')
          .populate('metadata.recipient', 'firstName lastName email')
          .populate('metadata.sender', 'firstName lastName email')
          .exec(),
        Transaction.countDocuments(filter)
      ]);

      return { transactions, total };
    } catch (error) {
      console.error('Error getting user transactions:', error);
      throw new Error('Failed to fetch transactions');
    }
  }

  /**
   * Get single transaction by ID for a user
   */
  async getTransactionById(
    transactionId: string,
    userId: Types.ObjectId
  ): Promise<ITransaction | null> {
    try {
      return await Transaction.findOne({
        _id: transactionId,
        user: userId
      })
      .populate('wallet', 'currency balance')
      .populate('metadata.recipient', 'firstName lastName email avatar')
      .populate('metadata.sender', 'firstName lastName email avatar')
      .exec();
    } catch (error) {
      console.error('Error getting transaction by ID:', error);
      throw new Error('Failed to fetch transaction');
    }
  }

  /**
   * Update transaction status
   */
  async updateTransactionStatus(
    transactionId: string,
    status: TransactionStatus,
    userId?: Types.ObjectId
  ): Promise<ITransaction | null> {
    try {
      const filter: any = { _id: transactionId };
      if (userId) filter.user = userId;

      return await Transaction.findOneAndUpdate(
        filter,
        { status },
        { new: true }
      );
    } catch (error) {
      console.error('Error updating transaction status:', error);
      throw new Error('Failed to update transaction status');
    }
  }

  /**
   * Format transaction for frontend display
   */
  formatTransactionForDisplay(transaction: ITransaction): any {
    const isPositive = !transaction.type.includes('sent') && 
                      transaction.type !== 'withdrawal' && 
                      transaction.type !== 'exchange_from';

    const statusInfo = this.getStatusInfo(transaction.status);
    const typeInfo = this.getTypeInfo(transaction.type);

    return {
      id: transaction._id,
      referenceId: transaction.referenceId,
      type: typeInfo.displayName,
      originalType: transaction.type,
      amount: Math.abs(transaction.amount),
      displayAmount: `${isPositive ? '+' : '-'} ${transaction.currency} ${Math.abs(transaction.amount).toLocaleString()}`,
      currency: transaction.currency,
      fee: transaction.fee,
      netAmount: Math.abs(transaction.netAmount),
      status: transaction.status,
      statusClass: statusInfo.class,
      statusText: statusInfo.text,
      description: transaction.description,
      metadata: transaction.metadata,
      createdAt: transaction.createdAt,
      formattedDate: this.formatDate(transaction.createdAt),
      icon: typeInfo.icon,
      isPositive
    };
  }

  private getStatusInfo(status: TransactionStatus): { class: string; text: string } {
    const statusMap = {
      completed: { class: 'text-success', text: 'Success' },
      pending: { class: 'text-warning', text: 'Pending' },
      failed: { class: 'text-danger', text: 'Failed' },
      cancelled: { class: 'text-secondary', text: 'Cancelled' },
      disputed: { class: 'text-danger', text: 'Disputed' }
    };
    return statusMap[status] || { class: 'text-secondary', text: status };
  }

  private getTypeInfo(type: TransactionType): { displayName: string; icon: string } {
    const typeMap: Record<string, { displayName: string; icon: string }> = {
      deposit: { displayName: 'Deposit', icon: '/images/transactions/deposit.svg' },
      withdrawal: { displayName: 'Withdrawal', icon: '/images/transactions/withdrawal.svg' },
      send: { displayName: 'Payment Sent', icon: '/images/transactions/send.svg' },
      received: { displayName: 'Payment Received', icon: '/images/transactions/received.svg' },
      exchange_from: { displayName: 'Exchange From', icon: '/images/transactions/exchange.svg' },
      exchange_to: { displayName: 'Exchange To', icon: '/images/transactions/exchange.svg' },
      request_sent: { displayName: 'Request Sent', icon: '/images/transactions/request.svg' },
      request_received: { displayName: 'Request Received', icon: '/images/transactions/request.svg' },
      payment_sent: { displayName: 'Payment Sent', icon: '/images/transactions/send.svg' },
      payment_received: { displayName: 'Payment Received', icon: '/images/transactions/received.svg' },
      crypto_sent: { displayName: 'Crypto Sent', icon: '/images/transactions/crypto-send.svg' },
      crypto_received: { displayName: 'Crypto Received', icon: '/images/transactions/crypto-received.svg' }
    };
    return typeMap[type] || { displayName: type, icon: '/images/transactions/default.svg' };
  }

  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).replace(/\//g, '-');
  }
}

export default new TransactionService();