import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  type: 'CREDIT' | 'DEBIT' | 'REFUND' | 'BONUS';
  amount: number;
  balance_before: number;
  balance_after: number;
  reference_type?: string;
  reference_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface TopUpResult {
  success: boolean;
  transaction?: WalletTransaction;
  error?: string;
  newBalance?: number;
}

export class WalletService {
  async getOrCreateWallet(userId: string): Promise<Wallet | null> {
    let { data: wallet, error } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('[WalletService] Get wallet error:', error);
      return null;
    }

    if (!wallet) {
      const { data: newWallet, error: createError } = await supabaseAdmin
        .from('wallets')
        .insert({ user_id: userId, balance: 0, currency: 'BDT' })
        .select()
        .single();

      if (createError) {
        logger.error('[WalletService] Create wallet error:', createError);
        return null;
      }

      wallet = newWallet;
      logger.info(`[WalletService] Created wallet for user ${userId}`);
    }

    return wallet;
  }

  async getBalance(userId: string): Promise<number> {
    const wallet = await this.getOrCreateWallet(userId);
    return wallet?.balance ?? 0;
  }

  async topUp(
    userId: string,
    amount: number,
    paymentReference?: string,
    metadata?: Record<string, any>
  ): Promise<TopUpResult> {
    if (amount <= 0) {
      return { success: false, error: 'Amount must be positive' };
    }

    const { data: result, error } = await supabaseAdmin.rpc('atomic_wallet_credit', {
      p_user_id: userId,
      p_amount: amount,
      p_reference_type: 'TOPUP',
      p_reference_id: paymentReference || null,
      p_metadata: metadata ? JSON.stringify(metadata) : null,
    });

    if (error) {
      logger.error('[WalletService] Atomic credit error:', error);
      return { success: false, error: 'Failed to process top-up' };
    }

    if (!result.success) {
      return { success: false, error: result.message || 'Top-up failed' };
    }

    logger.info(`[WalletService] Top-up ${amount} BDT for user ${userId}, new balance: ${result.new_balance}`);

    return {
      success: true,
      transaction: { id: result.transaction_id } as WalletTransaction,
      newBalance: result.new_balance,
    };
  }

  async debit(
    userId: string,
    amount: number,
    referenceType: string,
    referenceId?: string,
    metadata?: Record<string, any>
  ): Promise<TopUpResult> {
    if (amount <= 0) {
      return { success: false, error: 'Amount must be positive' };
    }

    const { data: result, error } = await supabaseAdmin.rpc('atomic_wallet_debit', {
      p_user_id: userId,
      p_amount: amount,
      p_reference_type: referenceType,
      p_reference_id: referenceId || null,
      p_metadata: metadata ? JSON.stringify(metadata) : null,
    });

    if (error) {
      logger.error('[WalletService] Atomic debit error:', error);
      return { success: false, error: 'Failed to process debit' };
    }

    if (!result.success) {
      if (result.reason === 'INSUFFICIENT_BALANCE') {
        return {
          success: false,
          error: `Insufficient balance. Current: ${result.current_balance}, Required: ${result.required_amount}`,
        };
      }
      return { success: false, error: result.message || 'Debit failed' };
    }

    logger.info(`[WalletService] Debit ${amount} BDT for user ${userId}, new balance: ${result.new_balance}`);

    return {
      success: true,
      transaction: { id: result.transaction_id } as WalletTransaction,
      newBalance: result.new_balance,
    };
  }

  async refund(
    userId: string,
    amount: number,
    originalTransactionId: string,
    reason?: string
  ): Promise<TopUpResult> {
    if (amount <= 0) {
      return { success: false, error: 'Amount must be positive' };
    }

    const wallet = await this.getOrCreateWallet(userId);
    if (!wallet) {
      return { success: false, error: 'Failed to get wallet' };
    }

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore + amount;

    const { data: transaction, error: txnError } = await supabaseAdmin
      .from('wallet_transactions')
      .insert({
        wallet_id: wallet.id,
        type: 'REFUND',
        amount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        reference_type: 'REFUND',
        reference_id: originalTransactionId,
        metadata: { reason },
      })
      .select()
      .single();

    if (txnError) {
      logger.error('[WalletService] Refund transaction error:', txnError);
      return { success: false, error: 'Failed to create refund transaction' };
    }

    const { error: updateError } = await supabaseAdmin
      .from('wallets')
      .update({ balance: balanceAfter, updated_at: new Date().toISOString() })
      .eq('id', wallet.id);

    if (updateError) {
      logger.error('[WalletService] Refund balance update error:', updateError);
      return { success: false, error: 'Failed to update balance' };
    }

    logger.info(`[WalletService] Refund ${amount} BDT for user ${userId}, new balance: ${balanceAfter}`);

    return {
      success: true,
      transaction,
      newBalance: balanceAfter,
    };
  }

  async addBonus(
    userId: string,
    amount: number,
    bonusType: string,
    metadata?: Record<string, any>
  ): Promise<TopUpResult> {
    if (amount <= 0) {
      return { success: false, error: 'Amount must be positive' };
    }

    const wallet = await this.getOrCreateWallet(userId);
    if (!wallet) {
      return { success: false, error: 'Failed to get wallet' };
    }

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore + amount;

    const { data: transaction, error: txnError } = await supabaseAdmin
      .from('wallet_transactions')
      .insert({
        wallet_id: wallet.id,
        type: 'BONUS',
        amount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        reference_type: bonusType,
        metadata: metadata || null,
      })
      .select()
      .single();

    if (txnError) {
      logger.error('[WalletService] Bonus transaction error:', txnError);
      return { success: false, error: 'Failed to create bonus transaction' };
    }

    const { error: updateError } = await supabaseAdmin
      .from('wallets')
      .update({ balance: balanceAfter, updated_at: new Date().toISOString() })
      .eq('id', wallet.id);

    if (updateError) {
      logger.error('[WalletService] Bonus balance update error:', updateError);
      return { success: false, error: 'Failed to update balance' };
    }

    logger.info(`[WalletService] Bonus ${amount} BDT for user ${userId}, new balance: ${balanceAfter}`);

    return {
      success: true,
      transaction,
      newBalance: balanceAfter,
    };
  }

  async getTransactionHistory(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ transactions: WalletTransaction[]; total: number }> {
    const wallet = await this.getOrCreateWallet(userId);
    if (!wallet) {
      return { transactions: [], total: 0 };
    }

    const offset = (page - 1) * limit;

    const { data, error, count } = await supabaseAdmin
      .from('wallet_transactions')
      .select('*', { count: 'exact' })
      .eq('wallet_id', wallet.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('[WalletService] Get transactions error:', error);
      return { transactions: [], total: 0 };
    }

    return {
      transactions: data || [],
      total: count || 0,
    };
  }

  async hasEnoughBalance(userId: string, amount: number): Promise<boolean> {
    const balance = await this.getBalance(userId);
    return balance >= amount;
  }
}

export const walletService = new WalletService();
