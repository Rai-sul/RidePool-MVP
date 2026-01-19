import { VehicleType } from '../types';

const PLATFORM_SURCHARGE_BDT = 10;
const FULL_POOL_BONUS_PERCENT = 0.05;
const BASE_RATE_CAR = 50;
const BASE_RATE_CNG = 30;
const PER_KM_RATE = 15;
const PER_MINUTE_RATE = 2;

export interface FareBreakdown {
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  poolDiscount: number;
  fullPoolBonus: number;
  displayedFare: number;
  actualCharge: number;
  platformSurcharge: number;
  savings: number;
  farePerPerson: number;
}

export interface DriverEarningsBreakdown {
  totalFare: number;
  platformCommission: number;
  driverEarnings: number;
  dailyBonus: number;
  tips: number;
  netEarnings: number;
}

export class FareService {
  calculateBaseFare(distanceKm: number, vehicleType: VehicleType | string): number {
    const baseRate = vehicleType === 'CAR' ? BASE_RATE_CAR : BASE_RATE_CNG;
    return baseRate + distanceKm * PER_KM_RATE;
  }

  calculateTimeFare(durationMinutes: number): number {
    return durationMinutes * PER_MINUTE_RATE;
  }

  getPoolDiscountRate(passengerCount: number): number {
    if (passengerCount >= 4) return 0.40;
    if (passengerCount >= 3) return 0.35;
    if (passengerCount >= 2) return 0.25;
    return 0;
  }

  applyPoolDiscount(baseFare: number, passengerCount: number): number {
    const discountRate = this.getPoolDiscountRate(passengerCount);
    return Math.round(baseFare * (1 - discountRate));
  }

  calculateFullFare(
    distanceKm: number,
    durationMinutes: number,
    vehicleType: VehicleType | string,
    passengerCount: number
  ): FareBreakdown {
    const baseFare = this.calculateBaseFare(distanceKm, vehicleType);
    const timeFare = this.calculateTimeFare(durationMinutes);
    const totalBeforeDiscount = baseFare + timeFare;
    
    const discountRate = this.getPoolDiscountRate(passengerCount);
    const poolDiscount = Math.round(totalBeforeDiscount * discountRate);
    
    let fullPoolBonus = 0;
    if (passengerCount >= 4) {
      fullPoolBonus = Math.round(totalBeforeDiscount * FULL_POOL_BONUS_PERCENT);
    }
    
    const discountedFare = totalBeforeDiscount - poolDiscount - fullPoolBonus;
    const farePerPerson = Math.ceil(discountedFare / passengerCount);
    
    const displayedFare = farePerPerson;
    const actualCharge = farePerPerson + PLATFORM_SURCHARGE_BDT;
    
    const soloFare = this.calculateBaseFare(distanceKm, vehicleType) + this.calculateTimeFare(durationMinutes);
    const savings = Math.max(0, soloFare - displayedFare);
    
    return {
      baseFare,
      distanceFare: distanceKm * PER_KM_RATE,
      timeFare,
      poolDiscount,
      fullPoolBonus,
      displayedFare,
      actualCharge,
      platformSurcharge: PLATFORM_SURCHARGE_BDT,
      savings,
      farePerPerson,
    };
  }

  calculateDriverEarnings(
    totalFare: number,
    tripsCompletedToday: number,
    tips: number = 0
  ): DriverEarningsBreakdown {
    const platformCommission = Math.round(totalFare * 0.20);
    const driverEarnings = totalFare - platformCommission;
    
    let dailyBonus = 0;
    const bonusSets = Math.floor(tripsCompletedToday / 3);
    dailyBonus = bonusSets * 100;
    
    const netEarnings = driverEarnings + dailyBonus + tips;
    
    return {
      totalFare,
      platformCommission,
      driverEarnings,
      dailyBonus,
      tips,
      netEarnings,
    };
  }

  estimateFare(
    distanceKm: number,
    vehicleType: VehicleType | string,
    estimatedPassengers: number = 2
  ): { minFare: number; maxFare: number; estimatedFare: number } {
    const baseFare = this.calculateBaseFare(distanceKm, vehicleType);
    const estimatedDuration = Math.ceil((distanceKm / 25) * 60);
    const timeFare = this.calculateTimeFare(estimatedDuration);
    const totalFare = baseFare + timeFare;
    
    const maxDiscount = this.getPoolDiscountRate(4);
    const minDiscount = this.getPoolDiscountRate(2);
    const estimatedDiscount = this.getPoolDiscountRate(estimatedPassengers);
    
    return {
      minFare: Math.round(totalFare * (1 - maxDiscount) / 4),
      maxFare: Math.round(totalFare * (1 - minDiscount) / 2),
      estimatedFare: Math.round(totalFare * (1 - estimatedDiscount) / estimatedPassengers),
    };
  }

  getPlatformSurcharge(): number {
    return PLATFORM_SURCHARGE_BDT;
  }
}

export const fareService = new FareService();