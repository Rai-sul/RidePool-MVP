import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { walletService } from '../services/wallet.service';
import { z } from 'zod';

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
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const wallet = await walletService.getOrCreateWallet(userId);

      if (!wallet) {
        return res.status(500).json({
          success: false,
          error: { code: 'WALLET_ERROR', message: 'Failed to get wallet' },
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: {
          balance: wallet.balance,
          currency: wallet.currency,
          wallet_id: wallet.id,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async topUp(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const parseResult = TopUpSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: parseResult.error.issues,
          },
          timestamp: new Date().toISOString(),
        });
      }

      const { amount, payment_method, transaction_id } = parseResult.data;

      const result = await walletService.topUp(userId, amount, transaction_id, {
        payment_method,
        initiated_at: new Date().toISOString(),
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: { code: 'TOPUP_FAILED', message: result.error },
          timestamp: new Date().toISOString(),
        });
      }

      res.status(201).json({
        success: true,
        data: {
          transaction_id: result.transaction?.id,
          amount,
          new_balance: result.newBalance,
          message: 'Wallet topped up successfully',
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async withdraw(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const parseResult = WithdrawSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: parseResult.error.issues,
          },
          timestamp: new Date().toISOString(),
        });
      }

      const { amount } = parseResult.data;

      const result = await walletService.debit(userId, amount, 'WITHDRAW', undefined, {
        initiated_at: new Date().toISOString(),
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: { code: 'WITHDRAW_FAILED', message: result.error },
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: {
          transaction_id: result.transaction?.id,
          amount,
          new_balance: result.newBalance,
          message: 'Withdrawal successful',
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getTransactions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

      const result = await walletService.getTransactionHistory(userId, page, limit);

      res.json({
        success: true,
        data: {
          transactions: result.transactions,
          pagination: {
            page,
            limit,
            total: result.total,
            total_pages: Math.ceil(result.total / limit),
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async checkBalance(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const amount = parseFloat(req.query.amount as string);
      if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_AMOUNT', message: 'Valid amount is required' },
          timestamp: new Date().toISOString(),
        });
      }

      const hasBalance = await walletService.hasEnoughBalance(userId, amount);
      const currentBalance = await walletService.getBalance(userId);

      res.json({
        success: true,
        data: {
          has_sufficient_balance: hasBalance,
          current_balance: currentBalance,
          required_amount: amount,
          shortfall: hasBalance ? 0 : amount - currentBalance,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async payForRide(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const parseResult = DebitSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: parseResult.error.issues,
          },
          timestamp: new Date().toISOString(),
        });
      }

      const { amount, reference_type, reference_id } = parseResult.data;

      const result = await walletService.debit(userId, amount, reference_type, reference_id);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: { code: 'PAYMENT_FAILED', message: result.error },
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: {
          transaction_id: result.transaction?.id,
          amount,
          new_balance: result.newBalance,
          message: 'Payment successful',
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const walletController = new WalletController();
