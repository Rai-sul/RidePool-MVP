export type PaymentMethod = 'WALLET' | 'CARD' | 'MOBILE_BANKING' | 'CASH';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type WalletTransactionType = 'CREDIT' | 'DEBIT' | 'REFUND' | 'BONUS';

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  type: WalletTransactionType;
  amount: number;
  balance_before: number;
  balance_after: number;
  reference_type: string | null;
  reference_id: string | null;
  description?: string;
  created_at: string;
}

export interface Payment {
  id: string;
  ride_id: string;
  user_id: string;
  amount: number;
  payment_method: PaymentMethod;
  status: PaymentStatus;
  transaction_id: string | null;
  created_at: string;
}

export interface PaymentMethodInfo {
  id: string;
  user_id: string;
  type: 'CARD' | 'MOBILE_BANKING';
  last4?: string;
  brand?: string;
  provider?: string;
  is_default: boolean;
  created_at: string;
}

export interface AddFundsRequest {
  amount: number;
  payment_method_id?: string;
  payment_method?: PaymentMethod;
}

export interface ProcessPaymentRequest {
  ride_id: string;
  amount: number;
  payment_method: PaymentMethod;
  idempotency_key?: string;
}
