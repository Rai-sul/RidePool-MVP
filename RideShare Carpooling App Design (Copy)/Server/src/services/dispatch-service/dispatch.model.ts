export interface Dispatch {
  id: string;
  tripId: string;
  driverId: string;
  status: 'pending' | 'accepted' | 'rejected';
}
