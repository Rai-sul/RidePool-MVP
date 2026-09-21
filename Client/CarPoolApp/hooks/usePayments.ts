import { useState, useCallback } from 'react';
import { walletService } from '../services/payment.service';
import { Transaction } from '../types';

// Covers the wallet endpoints the backend actually exposes: balance, top-up
// and transaction history.
//
// Stored payment methods are deliberately absent. There is no /payments/methods
// route on the server and no table behind it, so the previous
// getPaymentMethods / createPaymentMethod / deletePaymentMethod calls could
// only ever have 404'd. Add them back alongside the server endpoints.
export const usePayments = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await walletService.getBalance();
      if (response.success && response.data) {
        setBalance(response.data.balance);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch balance');
    } finally {
      setLoading(false);
    }
  }, []);

  const addFunds = useCallback(async (amount: number, paymentMethodId?: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await walletService.addFunds(amount, paymentMethodId);
      if (response.success) {
        await fetchBalance();
        return { success: true };
      }
      throw new Error(response.message || 'Failed to add funds');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to add funds';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [fetchBalance]);

  const fetchTransactions = useCallback(async (params?: {
    page?: number;
    limit?: number;
  }) => {
    try {
      setLoading(true);
      setError(null);
      const response = await walletService.getTransactions(params);
      if (response.success && response.data) {
        setTransactions(response.data.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    transactions,
    balance,
    loading,
    error,
    fetchBalance,
    addFunds,
    fetchTransactions,
  };
};
