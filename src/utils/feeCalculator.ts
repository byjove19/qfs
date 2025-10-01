// src/utils/feeCalculator.ts
export interface FeeStructure {
  percentage: number;
  fixed: number;
  min: number;
  max?: number;
}

export interface TransactionFees {
  send: FeeStructure;
  withdrawal: FeeStructure;
  exchange: FeeStructure;
  deposit: FeeStructure;
}

class FeeCalculator {
  private fees: TransactionFees = {
    send: {
      percentage: 0.01, // 1%
      fixed: 0.50,
      min: 0.10,
      max: 10.00
    },
    withdrawal: {
      percentage: 0.015, // 1.5%
      fixed: 1.00,
      min: 0.50,
      max: 15.00
    },
    exchange: {
      percentage: 0.005, // 0.5%
      fixed: 0.25,
      min: 0.05,
      max: 5.00
    },
    deposit: {
      percentage: 0, // Free deposits
      fixed: 0,
      min: 0,
      max: 0
    }
  };

  calculateFee(amount: number, type: keyof TransactionFees): number {
    const feeStructure = this.fees[type];
    let fee = (amount * feeStructure.percentage) + feeStructure.fixed;

    // Apply minimum fee
    if (fee < feeStructure.min) {
      fee = feeStructure.min;
    }

    // Apply maximum fee if specified
    if (feeStructure.max && fee > feeStructure.max) {
      fee = feeStructure.max;
    }

    return Math.round(fee * 100) / 100; // Round to 2 decimal places
  }

  calculateNetAmount(amount: number, type: keyof TransactionFees): number {
    const fee = this.calculateFee(amount, type);
    return amount - fee;
  }

  getFeeStructure(type: keyof TransactionFees): FeeStructure {
    return { ...this.fees[type] };
  }

  updateFeeStructure(type: keyof TransactionFees, newStructure: Partial<FeeStructure>) {
    this.fees[type] = { ...this.fees[type], ...newStructure };
  }
}

export default new FeeCalculator();