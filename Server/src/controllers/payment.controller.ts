import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabaseAdmin } from '../config/supabase';
import { walletService } from '../services/wallet.service';
import { auditService } from '../services/audit.service';
import { logger } from '../utils/logger';
import { z } from 'zod';

const ProcessPaymentSchema = z.object({
  ride_id: z.string().uuid(),
  amount: z.number().positive(),
  payment_method: z.enum(['WALLET', 'CARD', 'MOBILE_BANKING', 'CASH']),
  idempotency_key: z.string().uuid().optional(),
});

export class PaymentController {
  async processPayment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const parseResult = ProcessPaymentSchema.safeParse(req.body);
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

      const { ride_id, amount, payment_method, idempotency_key } = parseResult.data;

      const { data: paymentResult, error: paymentError } = await supabaseAdmin.rpc(
        'atomic_process_payment',
        {
          p_ride_id: ride_id,
          p_user_id: userId,
          p_amount: amount,
          p_payment_method: payment_method,
          p_idempotency_key: idempotency_key || null,
        }
      );

      if (paymentError) {
        logger.error('[PaymentController] atomic_process_payment error:', paymentError);
        throw paymentError;
      }

      if (!paymentResult.success) {
        if (paymentResult.duplicate) {
          return res.json({
            success: true,
            data: {
              payment_id: paymentResult.payment_id,
              status: paymentResult.status,
              message: 'Payment already processed (idempotent)',
              duplicate: true,
            },
            timestamp: new Date().toISOString(),
          });
        }

        return res.status(400).json({
          success: false,
          error: {
            code: paymentResult.reason,
            message: paymentResult.message,
          },
          timestamp: new Date().toISOString(),
        });
      }

      let gatewaySuccess = false;
      let gatewayTransactionId: string | null = null;
      let gatewayError: string | null = null;

      try {
        if (payment_method === 'WALLET') {
          const walletResult = await walletService.debit(userId, amount, 'RIDE_PAYMENT', ride_id);

          if (!walletResult.success) {
            gatewayError = walletResult.error || 'Wallet debit failed';
          } else {
            gatewaySuccess = true;
            gatewayTransactionId = walletResult.transaction?.id || null;
          }
        } else if (payment_method === 'CASH') {
          gatewaySuccess = true;
          gatewayTransactionId = `CASH-${Date.now()}`;
        } else {
          gatewaySuccess = true;
          gatewayTransactionId = `GATEWAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
      } catch (err: any) {
        gatewayError = err.message || 'Payment gateway error';
        logger.error('[PaymentController] Gateway error:', err);
      }

      if (gatewaySuccess && gatewayTransactionId) {
        await supabaseAdmin.rpc('complete_payment', {
          p_payment_id: paymentResult.payment_id,
          p_transaction_id: gatewayTransactionId,
          p_gateway_response: { method: payment_method, timestamp: new Date().toISOString() },
        });

        await auditService.logUserAction(userId, 'PAYMENT_COMPLETED', 'payment', paymentResult.payment_id, {
          amount,
          payment_method,
          ride_id,
          transaction_id: gatewayTransactionId,
        });

        return res.json({
          success: true,
          data: {
            payment_id: paymentResult.payment_id,
            status: 'COMPLETED',
            amount,
            transaction_id: gatewayTransactionId,
            message: 'Payment processed successfully',
          },
          timestamp: new Date().toISOString(),
        });
      } else {
        await supabaseAdmin.rpc('fail_payment', {
          p_payment_id: paymentResult.payment_id,
          p_error_message: gatewayError || 'Unknown error',
          p_error_code: 'GATEWAY_ERROR',
        });

        await auditService.logUserAction(userId, 'PAYMENT_FAILED', 'payment', paymentResult.payment_id, {
          amount,
          payment_method,
          ride_id,
          error: gatewayError,
        });

        return res.status(400).json({
          success: false,
          error: {
            code: 'PAYMENT_FAILED',
            message: gatewayError || 'Payment processing failed',
            payment_id: paymentResult.payment_id,
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      next(error);
    }
  }

  async getPaymentHistory(req: AuthRequest, res: Response, next: NextFunction) {
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
      const offset = (page - 1) * limit;

      const { data: payments, error, count } = await supabaseAdmin
        .from('payments')
        .select('*, rides(id, pickup_address, dropoff_address, created_at)', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        data: {
          payments,
          pagination: {
            page,
            limit,
            total: count || 0,
            total_pages: Math.ceil((count || 0) / limit),
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getPaymentById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { paymentId } = req.params;

      const { data: payment, error } = await supabaseAdmin
        .from('payments')
        .select('*, rides(*)')
        .eq('id', paymentId)
        .eq('user_id', userId)
        .single();

      if (error || !payment) {
        return res.status(404).json({
          success: false,
          error: { code: 'PAYMENT_NOT_FOUND', message: 'Payment not found' },
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: { payment },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async refundPayment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
      }

      const { paymentId } = req.params;
      const { reason } = req.body;

      const { data: payment, error: paymentError } = await supabaseAdmin
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (paymentError || !payment) {
        return res.status(404).json({
          success: false,
          error: { code: 'PAYMENT_NOT_FOUND', message: 'Payment not found' },
          timestamp: new Date().toISOString(),
        });
      }

      if (payment.status !== 'COMPLETED') {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_STATUS', message: 'Only completed payments can be refunded' },
          timestamp: new Date().toISOString(),
        });
      }

      if (payment.payment_method === 'WALLET') {
        const refundResult = await walletService.refund(
          payment.user_id,
          payment.amount,
          paymentId,
          reason
        );

        if (!refundResult.success) {
          return res.status(400).json({
            success: false,
            error: { code: 'REFUND_FAILED', message: refundResult.error },
            timestamp: new Date().toISOString(),
          });
        }
      }

      await supabaseAdmin
        .from('payments')
        .update({
          status: 'REFUNDED',
          metadata: {
            ...(payment.metadata || {}),
            refunded_at: new Date().toISOString(),
            refund_reason: reason,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentId);

      await auditService.logUserAction(userId, 'PAYMENT_FAILED', 'payment', paymentId, {
        original_amount: payment.amount,
        refund_reason: reason,
        payment_method: payment.payment_method,
      });

      res.json({
        success: true,
        data: {
          payment_id: paymentId,
          status: 'REFUNDED',
          message: 'Payment refunded successfully',
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const paymentController = new PaymentController();
