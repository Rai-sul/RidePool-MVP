
import * as grpc from '@grpc/grpc-js';
import { NotificationsClient } from '../proto/notifications_grpc_pb';

export const notificationsClient = new NotificationsClient(
  process.env.NOTIFICATIONS_SERVICE_URL || 'localhost:50058',
  grpc.credentials.createInsecure()
);
