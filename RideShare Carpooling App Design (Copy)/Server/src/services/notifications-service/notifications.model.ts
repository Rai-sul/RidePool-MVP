export interface Notification {
  id: string;
  userId: string;
  type: 'trip_update' | 'payment_status' | 'promo' | 'system';
  message: string;
  read: boolean;
  createdAt: number;
  metadata?: any; // Additional data related to the notification
}