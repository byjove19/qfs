// src/utils/currencyConverter.ts
import axios from 'axios';
import config from '../config/env';

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  timestamp: Date;
}

class CurrencyConverter {
  private cache: Map<string, { rate: number; timestamp: number }> = new Map();
  private cacheDuration = 5 * 60 * 1000; // 5 minutes

  async convert(amount: number, from: string, to: string): Promise<number> {
    if (from === to) return amount;

    const rate = await this.getExchangeRate(from, to);
    return amount * rate;
  }

  async getExchangeRate(from: string, to: string): Promise<number> {
    const cacheKey = `${from}-${to}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
      return cached.rate;
    }

    try {
      // Using a free currency API (you might want to use a paid service for production)
      const response = await axios.get(
        `https://api.exchangerate-api.com/v4/latest/${from}`
      );

      const data = response.data as { rates: { [key: string]: number } };
      const rate = data.rates[to];
      
      if (!rate) {
        throw new Error(`Exchange rate not available for ${from} to ${to}`);
      }

      this.cache.set(cacheKey, {
        rate,
        timestamp: Date.now()
      });

      return rate;
    } catch (error) {
      console.error('Currency conversion error:', error);
      
      // Fallback to fixed rates for demo purposes
      const fallbackRates: { [key: string]: number } = {
        'USD-EUR': 0.85,
        'EUR-USD': 1.18,
        'USD-GBP': 0.73,
        'GBP-USD': 1.37,
        'USD-JPY': 110.0,
        'JPY-USD': 0.0091
      };

      const fallbackRate = fallbackRates[`${from}-${to}`];
      if (fallbackRate) {
        return fallbackRate;
      }

      throw new Error(`Unable to get exchange rate for ${from} to ${to}`);
    }
  }

  getSupportedCurrencies(): string[] {
    return ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY'];
  }

  isValidCurrency(currency: string): boolean {
    return this.getSupportedCurrencies().includes(currency.toUpperCase());
  }
}

export default new CurrencyConverter();