export interface Payment {
  id: string;
  tripId: string;
  userId: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  transactionId?: string; // SSLCommerz transaction ID (tran_id)
  validationId?: string; // SSLCommerz validation ID (val_id)
  paymentGatewayUrl?: string; // URL to redirect for payment
}