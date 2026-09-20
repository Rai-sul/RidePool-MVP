import { config } from '../config/env';

/**
 * Time windows for advance bookings.
 *
 * Every window is expressed in "units". Production runs on real minutes;
 * setting ADVANCE_TIME_UNIT=seconds compresses each unit to one second so a
 * 30-minute window can be exercised in 30 seconds during development and QA.
 * Nothing else in the feature hardcodes a duration.
 */
export const advanceWindow = {
  /** One configured unit in milliseconds (60000 in production, 1000 in test mode). */
  get unitMs(): number {
    return config.advanceBooking.unitSeconds * 1000;
  },

  /** Max spread between the earliest and latest pickup time inside one pool. */
  get poolWindowMs(): number {
    return config.advanceBooking.poolWindowUnits * this.unitMs;
  },

  get poolWindowSeconds(): number {
    return config.advanceBooking.poolWindowUnits * config.advanceBooking.unitSeconds;
  },

  /** How far before the earliest pickup the confirmation step opens. */
  get confirmLeadMs(): number {
    return config.advanceBooking.confirmLeadUnits * this.unitMs;
  },

  get confirmLeadSeconds(): number {
    return config.advanceBooking.confirmLeadUnits * config.advanceBooking.unitSeconds;
  },

  /** How long riders get to confirm once the step opens. */
  get confirmWindowMs(): number {
    return config.advanceBooking.confirmWindowUnits * this.unitMs;
  },

  get confirmWindowSeconds(): number {
    return config.advanceBooking.confirmWindowUnits * config.advanceBooking.unitSeconds;
  },

  /** Furthest ahead a rider may schedule a pickup. */
  get maxLeadMs(): number {
    return config.advanceBooking.maxLeadDays * 24 * 60 * 60 * 1000;
  },

  /**
   * A pickup time must be far enough out that the confirmation step still has
   * room to run before it, and not further out than the booking horizon.
   */
  validatePickupTime(scheduledPickupAt: Date, now: Date = new Date()): string | null {
    if (Number.isNaN(scheduledPickupAt.getTime())) {
      return 'Invalid pickup time';
    }

    const leadMs = scheduledPickupAt.getTime() - now.getTime();

    if (leadMs <= this.confirmLeadMs) {
      const units = config.advanceBooking.confirmLeadUnits;
      const unitName = config.advanceBooking.unitSeconds === 1 ? 'seconds' : 'minutes';
      return `Pickup time must be at least ${units} ${unitName} from now`;
    }

    if (leadMs > this.maxLeadMs) {
      return `Pickup time cannot be more than ${config.advanceBooking.maxLeadDays} days from now`;
    }

    return null;
  },

  /** The confirmation schedule derived from a pool's earliest pickup time. */
  scheduleFor(earliestPickupAt: Date): { confirmationOpensAt: Date; confirmationDeadlineAt: Date } {
    const confirmationOpensAt = new Date(earliestPickupAt.getTime() - this.confirmLeadMs);
    return {
      confirmationOpensAt,
      confirmationDeadlineAt: new Date(confirmationOpensAt.getTime() + this.confirmWindowMs),
    };
  },
};
