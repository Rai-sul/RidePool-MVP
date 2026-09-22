import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { walletService } from '../services/wallet.service';
import { z } from 'zod';

import { createdResponse, errorResponse, successResponse, unauthorizedResponse } from '../utils/response';

const TopUpSchema = z.object({
  amount: z.number().positive().max(50000),
  payment_method: z.enum(['BKASH', 'NAGAD', 'ROCKET', 'CARD']),
  transaction_id: z.string().min(5).max(100).optional(),
});

const DebitSchema = z.object({
  amount: z.number().positive(),
  reference_type: z.string().min(1).max(50),
  reference_id: z.string().uuid().optional(),
});

const WithdrawSchema = z.object({
  amount: z.number().positive().max(50000),
});

export class WalletController {
  async getBalance(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return unauthorizedResponse(res, 'Authentication required');
      }

      const wallet = await walletService.getOrCreateWallet(userId);

      if (!wallet) {
        return errorResponse(res, 'WALLET_ERROR', 'Failed to get wallet', 500);
      }

      successResponse(res, {
        balance: wallet.balance,
        currency: wallet.currency,
        wallet_id: wallet.id,
      });
    } catch (error) {
      next(error);
    }
  }

  async topUp(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return unauthorizedResponse(res, 'Authentication required');
      }

      const parseResult = TopUpSchema.safeParse(req.body);
      if (!parseResult.success) {
        return errorResponse(res, 'VALIDATION_ERROR', 'Invalid request data', 400, parseResult.error.issues);
      }

      const { amount, payment_method, transaction_id } = parseResult.data;

      const result = await walletService.topUp(userId, amount, transaction_id, {
        payment_method,
        initiated_at: new Date().toISOString(),
      });

      if (!result.success) {
        return errorResponse(res, 'TOPUP_FAILED', result.error, 400);
      }

      createdResponse(res, {
        transaction_id: result.transaction?.id,
        amount,
        new_balance: result.newBalance,
        message: 'Wallet topped up successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async withdraw(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return unauthorizedResponse(res, 'Authentication required');
      }

      const parseResult = WithdrawSchema.safeParse(req.body);
      if (!parseResult.success) {
        return errorResponse(res, 'VALIDATION_ERROR', 'Invalid request data', 400, parseResult.error.issues);
      }

      const { amount } = parseResult.data;

      const result = await walletService.debit(userId, amount, 'WITHDRAW', undefined, {
        initiated_at: new Date().toISOString(),
      });

      if (!result.success) {
        return errorResponse(res, 'WITHDRAW_FAILED', result.error, 400);
      }

      successResponse(res, {
        transaction_id: result.transaction?.id,
        amount,
        new_balance: result.newBalance,
        message: 'Withdrawal successful',
      });
    } catch (error) {
      next(error);
    }
  }

  async getTransactions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return unauthorizedResponse(res, 'Authentication required');
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

      const result = await walletService.getTransactionHistory(userId, page, limit);

      successResponse(res, {
        transactions: result.transactions,
        pagination: {
          page,
          limit,
          total: result.total,
          total_pages: Math.ceil(result.total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async checkBalance(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return unauthorizedResponse(res, 'Authentication required');
      }

      const amount = parseFloat(req.query.amount as string);
      if (isNaN(amount) || amount <= 0) {
        return errorResponse(res, 'INVALID_AMOUNT', 'Valid amount is required', 400);
      }

      const hasBalance = await walletService.hasEnoughBalance(userId, amount);
      const currentBalance = await walletService.getBalance(userId);

      successResponse(res, {
        has_sufficient_balance: hasBalance,
        current_balance: currentBalance,
        required_amount: amount,
        shortfall: hasBalance ? 0 : amount - currentBalance,
      });
    } catch (error) {
      next(error);
    }
  }

  async payForRide(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return unauthorizedResponse(res, 'Authentication required');
      }

      const parseResult = DebitSchema.safeParse(req.body);
      if (!parseResult.success) {
        return errorResponse(res, 'VALIDATION_ERROR', 'Invalid request data', 400, parseResult.error.issues);
      }

      const { amount, reference_type, reference_id } = parseResult.data;

      const result = await walletService.debit(userId, amount, reference_type, reference_id);

      if (!result.success) {
        return errorResponse(res, 'PAYMENT_FAILED', result.error, 400);
      }

      successResponse(res, {
        transaction_id: result.transaction?.id,
        amount,
        new_balance: result.newBalance,
        message: 'Payment successful',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const walletController = new WalletController();
