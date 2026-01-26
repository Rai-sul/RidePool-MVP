import { 
  AlternativeSuggestion, 
  AlternativeAction,
  PoolSearchAnalytics,
  PoolSearchMetadata,
  NearbyPoolInfo,
  Ride,
  Pool,
  Location
} from '../types';
import { supabase } from '../config/supabase';
import { calculateDistance } from '../utils/helper';
import { h3Utils } from '../utils/h3.utils';

export class PoolSearchResponseService {
  private readonly PEAK_HOURS = [
    { start: '07:00', end: '09:00', name: 'Morning Rush' },
    { start: '17:00', end: '19:00', name: 'Evening Rush' },
  ];

  /**
   * Generate alternative suggestions when no pools are found
   */
  async generateAlternatives(
    ride: Ride,
    analytics: PoolSearchAnalytics,
    metadata: PoolSearchMetadata
  ): Promise<AlternativeSuggestion[]> {
    const suggestions: AlternativeSuggestion[] = [];

    // 1. CREATE POOL - Always the primary option
    suggestions.push({
      action: 'CREATE_POOL',
      title: 'Create Your Own Pool',
      description: 'Start a new pool and wait for others to join your route',
      icon: 'plus-circle',
      priority: 1,
      metadata: {
        estimatedWaitTime: '2-5 minutes',
        potentialSavings: '30-40%',
      },
    });

    // 2. JOIN WAITLIST - If no pools but peak hours coming
    if (this.isPeakHoursSoon()) {
      suggestions.push({
        action: 'JOIN_WAITLIST',
        title: 'Join Waitlist',
        description: "We'll notify you when a pool matches your route",
        icon: 'bell',
        priority: 2,
        metadata: {
          estimatedMatches: this.estimateUpcomingMatches(analytics),
          nextPeakHour: this.getNextPeakHour(),
        },
      });
    }

    // 3. ADJUST DESTINATION - If nearby pools exist
    if (metadata.hasNearbyPools && metadata.nearbyPools && metadata.nearbyPools.length > 0) {
      const nearest = metadata.nearbyPools[0];
      suggestions.push({
        action: 'ADJUST_DESTINATION',
        title: 'Adjust Your Destination',
        description: `${metadata.nearbyPools.length} pool(s) found ${nearest.distance.toFixed(1)}km away`,
        icon: 'map-pin',
        priority: 3,
        metadata: {
          nearestPoolDistance: nearest.distance,
          alternativeDestination: nearest.destination,
          poolsAvailable: metadata.nearbyPools.length,
        },
      });
    }

    // 4. EXPAND SEARCH - If search radius is still small
    if (analytics.searchRadius < 10) {
      suggestions.push({
        action: 'EXPAND_SEARCH',
        title: 'Expand Search Area',
        description: `Search up to ${analytics.searchRadius + 2}km from your destination`,
        icon: 'search',
        priority: 4,
        metadata: {
          currentRadius: analytics.searchRadius,
          suggestedRadius: analytics.searchRadius + 2,
        },
      });
    }

    // 5. TRY DIFFERENT TIME - If not during peak hours
    if (!this.isCurrentlyPeakHours() && metadata.peakHours) {
      suggestions.push({
        action: 'TRY_DIFFERENT_TIME',
        title: 'Try Peak Hours',
        description: `More pools available during ${this.getNextPeakHourName()}`,
        icon: 'clock',
        priority: 5,
        metadata: {
          peakHours: metadata.peakHours,
          currentlyPeak: false,
        },
      });
    }

    return suggestions.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Find nearby pools that didn't match criteria
   */
  async findNearbyIncompatiblePools(
    ride: Ride,
    maxDistance: number = 5
  ): Promise<NearbyPoolInfo[]> {
    try {
      const destination: Location = {
        latitude: ride.dropoff_lat,
        longitude: ride.dropoff_lng,
      };

      const destinationH3 = h3Utils.latLngToH3(destination, 7);
      const searchHexagons = h3Utils.getH3Ring(destinationH3, 3); // Wider search

      const { data: rawPools, error } = await supabase
        .from('pools')
        .select('*')
        .in('destination_h3_index', searchHexagons)
        .in('status', ['WAITING_FOR_RIDERS', 'WAITING_FOR_DRIVER'] as any[])
        .limit(10);

      if (error || !rawPools) {
        return [];
      }

      // Filter out expired pools (WAITING_FOR_RIDERS but older than lookup time)
      const LOOKUP_TIME_MS = parseInt(process.env.LOOKUP_TIME_MS || '300000', 10);
      const now = Date.now();
      const pools = rawPools.filter((pool: any) => {
        if (pool.status !== 'WAITING_FOR_RIDERS') {
          return true;
        }
        const poolCreatedAt = new Date(pool.created_at).getTime();
        const poolAge = now - poolCreatedAt;
        return poolAge < LOOKUP_TIME_MS;
      });

      const nearbyPools: NearbyPoolInfo[] = [];

      for (const pool of pools) {
        const distance = calculateDistance(
          destination.latitude,
          destination.longitude,
          pool.destination_lat,
          pool.destination_lng
        );

        if (distance <= maxDistance) {
          let reason = 'Unknown incompatibility';

          // Determine incompatibility reason
          if (pool.vehicle_type !== ride.vehicle_type) {
            reason = `Different vehicle type: ${pool.vehicle_type}`;
          } else if (pool.current_passengers >= pool.max_passengers) {
            reason = 'Pool is full';
          } else if (
            pool.gender_restriction === 'FEMALE_ONLY' &&
            ride.gender_restriction !== 'FEMALE_ONLY'
          ) {
            reason = 'Gender restriction mismatch';
          } else {
            reason = 'Destination too far';
          }

          nearbyPools.push({
            poolId: pool.id,
            distance,
            destination: pool.destination_address || 'Unknown',
            currentPassengers: pool.current_passengers,
            maxPassengers: pool.max_passengers,
            incompatibilityReason: reason,
          });
        }
      }

      return nearbyPools.sort((a, b) => a.distance - b.distance);
    } catch (error) {
      console.error('[PoolSearchResponse] Error finding nearby pools:', error);
      return [];
    }
  }

  /**
   * Generate search analytics for better insights
   */
  generateAnalytics(
    poolsChecked: number,
    incompatibleReasons: Record<string, number>,
    searchRadius: number
  ): PoolSearchAnalytics {
    return {
      totalPoolsChecked: poolsChecked,
      destinationHexagonsSearched: 0,
      pickupHexagonsSearched: 0,
      incompatibleReasons,
      searchRadius,
      peakHoursNearby: this.isCurrentlyPeakHours() || this.isPeakHoursSoon(),
    };
  }

  /**
   * Build comprehensive metadata about the search
   */
  async buildSearchMetadata(
    ride: Ride,
    nearbyPools: NearbyPoolInfo[]
  ): Promise<PoolSearchMetadata> {
    return {
      hasNearbyPools: nearbyPools.length > 0,
      nearbyPools: nearbyPools.slice(0, 5),
      suggestedDestinationAdjustment:
        nearbyPools.length > 0
          ? {
              direction: 'towards nearest pool',
              distanceKm: nearbyPools[0].distance,
            }
          : undefined,
      peakHours: this.PEAK_HOURS.map(ph => ({
        start: ph.start,
        end: ph.end,
      })),
      estimatedWaitTime: this.estimateWaitTime(),
    };
  }

  /**
   * Check if current time is during peak hours
   */
  private isCurrentlyPeakHours(): boolean {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinutes;

    return this.PEAK_HOURS.some(peak => {
      const [startHour, startMin] = peak.start.split(':').map(Number);
      const [endHour, endMin] = peak.end.split(':').map(Number);
      const startTime = startHour * 60 + startMin;
      const endTime = endHour * 60 + endMin;

      return currentTime >= startTime && currentTime <= endTime;
    });
  }

  /**
   * Check if peak hours are coming soon (within 30 minutes)
   */
  private isPeakHoursSoon(): boolean {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinutes;

    return this.PEAK_HOURS.some(peak => {
      const [startHour, startMin] = peak.start.split(':').map(Number);
      const startTime = startHour * 60 + startMin;

      const timeDiff = startTime - currentTime;
      return timeDiff > 0 && timeDiff <= 30;
    });
  }

  /**
   * Get next peak hour name
   */
  private getNextPeakHourName(): string {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinutes;

    for (const peak of this.PEAK_HOURS) {
      const [startHour, startMin] = peak.start.split(':').map(Number);
      const startTime = startHour * 60 + startMin;

      if (currentTime < startTime) {
        return peak.name;
      }
    }

    return this.PEAK_HOURS[0].name;
  }

  /**
   * Get next peak hour time
   */
  private getNextPeakHour(): string {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinutes;

    for (const peak of this.PEAK_HOURS) {
      const [startHour, startMin] = peak.start.split(':').map(Number);
      const startTime = startHour * 60 + startMin;

      if (currentTime < startTime) {
        return peak.start;
      }
    }

    return this.PEAK_HOURS[0].start;
  }

  /**
   * Estimate upcoming matches based on analytics
   */
  private estimateUpcomingMatches(analytics: PoolSearchAnalytics): string {
    if (analytics.peakHoursNearby) {
      return '3-5 pools expected during peak hours';
    }
    return '1-2 pools expected within 30 minutes';
  }

  /**
   * Estimate wait time for a match
   */
  private estimateWaitTime(): number {
    if (this.isCurrentlyPeakHours()) {
      return 5; // 5 minutes during peak
    } else if (this.isPeakHoursSoon()) {
      return 15; // 15 minutes if peak is soon
    }
    return 30; // 30 minutes otherwise
  }
}

export const poolSearchResponseService = new PoolSearchResponseService();
