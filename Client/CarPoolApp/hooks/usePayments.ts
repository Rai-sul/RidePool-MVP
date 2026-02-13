import { useState, useCallback } from 'react';
import { paymentService, walletService } from '../services/payment.service';
import { PaymentMethod, Transaction } from '../types';

export const usePayments = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPaymentMethods = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await paymentService.getPaymentMethods();
      if (response.success && response.data) {
        setPaymentMethods(response.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch payment methods');
    } finally {
      setLoading(false);
    }
  }, []);

  const addPaymentMethod = useCallback(async (data: {
    type: string;
    details: any;
  }) => {
    try {
      setLoading(true);
      setError(null);
      const response = await paymentService.createPaymentMethod(data);
      if (response.success) {
        await fetchPaymentMethods();
        return { success: true };
      }
      throw new Error(response.message || 'Failed to add payment method');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to add payment method';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [fetchPaymentMethods]);

  const removePaymentMethod = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await paymentService.deletePaymentMethod(id);
      if (response.success) {
        await fetchPaymentMethods();
        return { success: true };
      }
      throw new Error(response.message || 'Failed to remove payment method');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to remove payment method';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [fetchPaymentMethods]);

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

  const addFunds = useCallback(async (amount: number, paymentMethodId: string) => {
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
      const response = await paymentService.getTransactions(params);
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
    paymentMethods,
    transactions,
    balance,
    loading,
    error,
    fetchPaymentMethods,
    addPaymentMethod,
    removePaymentMethod,
    fetchBalance,
    addFunds,
    fetchTransactions,
  };
};
