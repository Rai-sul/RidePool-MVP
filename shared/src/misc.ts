export interface Rating {
  id: string;
  ride_id: string;
  rater_id: string;
  rated_id: string;
  rating: number;
  comment: string | null;
  tags: string[] | null;
  created_at: string;
}

export interface CreateRatingRequest {
  ride_id: string;
  rated_id: string;
  rating: number;
  comment?: string;
  tags?: string[];
}

export type PriyoSathiStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'BLOCKED';

export interface PriyoSathi {
  id: string;
  user_id: string;
  companion_id: string;
  status: PriyoSathiStatus;
  created_at: string;
}

export interface AddPriyoSathiRequest {
  companion_id: string;
}

export interface InviteToPollRequest {
  companion_id: string;
  pool_id: string;
}

export interface SavedPlace {
  id: string;
  user_id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
  created_at: string;
  updated_at: string;
}

export interface CreateSavedPlaceRequest {
  label: string;
  address: string;
  lat: number;
  lng: number;
}

export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  discount_type: DiscountType;
  discount_value: number;
  max_discount_amount: number | null;
  min_ride_amount: number | null;
  usage_limit: number | null;
  usage_count: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
}

export interface ApplyPromoRequest {
  code: string;
  ride_id?: string;
}

export interface PromoValidationResult {
  valid: boolean;
  promo?: PromoCode;
  discount_amount?: number;
  error?: string;
}
