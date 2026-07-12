import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface DriverLocationRealtime {
  latitude: number;
  longitude: number;
  heading?: number | null;
  recordedAt?: string | null;
}

type VehicleLocationRow = {
  lat: number | string | null;
  lng: number | string | null;
  heading?: number | string | null;
  recorded_at?: string | null;
};

function toDriverLocation(row: Partial<VehicleLocationRow> | null | undefined): DriverLocationRealtime | null {
  if (!row) return null;

  const latitude = Number(row.lat);
  const longitude = Number(row.lng);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const heading = row.heading == null ? null : Number(row.heading);

  return {
    latitude,
    longitude,
    heading: Number.isFinite(heading) ? heading : null,
    recordedAt: row.recorded_at ?? null,
  };
}

export function useDriverLocationRealtime(poolId: string | null, enabled = true) {
  const [driverLocation, setDriverLocation] = useState<DriverLocationRealtime | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!poolId || !enabled) {
      setDriverLocation(null);
      setIsConnected(false);
      return;
    }

    let isMounted = true;
    setDriverLocation(null);
    setIsConnected(false);

    const fetchLatestLocation = async () => {
      const { data, error } = await supabase
        .from('vehicle_locations')
        .select('lat, lng, heading, recorded_at')
        .eq('pool_id', poolId)
        .eq('is_active', true)
        .order('recorded_at', { ascending: false })
        .limit(1);

      if (error) {
        console.warn('[useDriverLocationRealtime] Initial location fetch failed:', error.message);
        return;
      }

      const latest = Array.isArray(data) ? data[0] : null;
      const location = toDriverLocation(latest as VehicleLocationRow | null);
      if (isMounted && location) {
        setDriverLocation(location);
      }
    };

    fetchLatestLocation();

    const channel = supabase
      .channel(`driver-location:${poolId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'vehicle_locations',
          filter: `pool_id=eq.${poolId}`,
        },
        (payload) => {
          const location = toDriverLocation(payload.new as VehicleLocationRow);
          if (isMounted && location) {
            setDriverLocation(location);
          }
        }
      )
      .subscribe((status) => {
        if (!isMounted) return;
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [poolId, enabled]);

  return { driverLocation, isConnected };
}
