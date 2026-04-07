# Pool Management - Key Code Snippets

## 1. Driver Accepts Pool - Full Code Flow

### Controller: `driver.controller.ts` (Lines 626-827)

```typescript
async acceptPool(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    
    // Validation: Check driver doesn't have active pool
    const { data: existingPool } = await supabaseAdmin
      .from('pools')
      .select('id')
      .eq('driver_id', userId)
      .in('status', ['WAITING_FOR_DRIVER', 'READY_TO_START', 'STARTED'])
      .single();

    if (existingPool) {
      return res.status(400).json({
        error: { code: 'ALREADY_HAS_POOL', message: 'Driver already has active pool' }
      });
    }

    // Validation: Check driver online
    const { data: vehicle } = await supabaseAdmin
      .from('vehicle_locations')
      .select('vehicle_id')
      .eq('driver_id', userId)
      .eq('is_active', true)
      .single();

    if (!vehicle) {
      return res.status(400).json({
        error: { code: 'NOT_ONLINE', message: 'Driver must be online' }
      });
    }

    // Validation: Check vehicle type match
    const { data: poolToAccept } = await supabaseAdmin
      .from('pools')
      .select('vehicle_type')
      .eq('id', poolId)
      .single();

    const { data: driverVehicle } = await supabaseAdmin
      .from('vehicles')
      .select('vehicle_type')
      .eq('id', vehicle.vehicle_id)
      .single();

    if (driverVehicle && poolToAccept.vehicle_type !== driverVehicle.vehicle_type) {
      return res.status(400).json({
        error: { code: 'VEHICLE_TYPE_MISMATCH' }
      });
    }

    // === ATOMIC RPC CALL ===
    const { data: result, error: rpcError } = await supabaseAdmin.rpc('atomic_accept_pool', {
      p_pool_id: poolId,
      p_driver_id: userId,
      p_vehicle_id: vehicle.vehicle_id,
    });

    if (rpcError) {
      if (rpcError.message?.includes('ALREADY_ASSIGNED')) {
        return res.status(409).json({
          error: { code: 'POOL_ALREADY_ASSIGNED' }
        });
      }
      throw rpcError;
    }

    // === UPDATE DRIVER SESSION ===
    await supabaseAdmin
      .from('driver_sessions')
      .update({ status: 'BUSY' })
      .eq('driver_id', userId)
      .eq('status', 'ONLINE');

    // === UPDATE VEHICLE LOCATION ===
    await supabaseAdmin
      .from('vehicle_locations')
      .update({
        pool_id: poolId,
        is_available: false,
      })
      .eq('driver_id', userId);

    // === CLEAR CACHED ROUTE ===
    await smartRouteService.clearPoolRoute(poolId);

    // === FETCH POOL DETAILS ===
    const { data: pool } = await supabaseAdmin
      .from('pools')
      .select(`
        *,
        pool_members(
          user_id,
          ride_id,
          rides(pickup_lat, pickup_lng, pickup_address, dropoff_lat, dropoff_lng, dropoff_address),
          users:user_id(id, full_name, average_rating)
        )
      `)
      .eq('id', poolId)
      .single();

    // === BUILD PASSENGER LIST ===
    const passengers = pool?.pool_members?.map((pm: any) => ({
      user_id: pm.user_id,
      name: pm.users?.full_name || 'Rider',
      rating: pm.users?.average_rating || 0,
      pickup: {
        lat: pm.rides?.pickup_lat,
        lng: pm.rides?.pickup_lng,
        address: pm.rides?.pickup_address,
      },
      dropoff: {
        lat: pm.rides?.dropoff_lat,
        lng: pm.rides?.dropoff_lng,
        address: pm.rides?.dropoff_address,
      },
    })) || [];

    // === CALCULATE NAVIGATION TO NEAREST PICKUP ===
    const { data: driverLoc } = await supabaseAdmin
      .from('vehicle_locations')
      .select('lat, lng')
      .eq('driver_id', userId)
      .single();

    let nearestPickup = null;
    if (driverLoc && passengers.length > 0) {
      let minDist = Infinity;
      for (const p of passengers) {
        if (p.pickup?.lat && p.pickup?.lng) {
          const dist = calculateDistance(
            driverLoc.lat,
            driverLoc.lng,
            p.pickup.lat,
            p.pickup.lng
          );
          if (dist < minDist) {
            minDist = dist;
            nearestPickup = p.pickup;
          }
        }
      }
    }

    // === RETURN RESPONSE ===
    res.json({
      success: true,
      data: {
        pool_id: poolId,
        status: 'READY_TO_START',
        passengers,
        destination: {
          lat: pool?.destination_lat,
          lng: pool?.destination_lng,
          address: pool?.destination_address,
        },
        nearest_pickup: nearestPickup,
        navigation_url: `https://www.google.com/maps/dir/?api=1&destination=${nearestPickup?.lat},${nearestPickup?.lng}`,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
}
```

---

## 2. Passenger Joins Pool - Full Code Flow

### Controller: `pool.controller.ts` (Lines 290-480)

```typescript
async joinPool(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    const { poolId } = req.params;
    const { ride_id } = req.body;

    // === PENALTY CHECK ===
    const cooldownStatus = await penaltyService.isUserInCooldown(userId);
    if (cooldownStatus.inCooldown) {
      return res.status(403).json({
        error: {
          code: 'COOLDOWN_ACTIVE',
          message: `Cooldown for ${Math.ceil(cooldownStatus.remainingSeconds / 60)} minutes`,
          ends_at: cooldownStatus.endsAt,
        },
      });
    }

    // === VALIDATE RIDE ===
    const { data: ride, error: rideError } = await supabaseAdmin
      .from('rides')
      .select('*')
      .eq('id', ride_id)
      .eq('user_id', userId)
      .single();

    if (rideError || !ride) {
      return res.status(404).json({
        error: { code: 'RIDE_NOT_FOUND' }
      });
    }

    // === VALIDATE POOL ===
    const { data: pool, error: poolError } = await supabaseAdmin
      .from('pools')
      .select('*')
      .eq('id', poolId)
      .single();

    if (poolError || !pool) {
      return res.status(404).json({
        error: { code: 'POOL_NOT_FOUND' }
      });
    }

    // === CHECK COMPATIBILITY ===
    const compatibility = poolMatchingService.isRideCompatibleWithPool(ride, pool);
    if (!compatibility.compatible) {
      return res.status(400).json({
        error: {
          code: 'INCOMPATIBLE',
          reason: compatibility.reason,
        },
      });
    }

    // === ATOMIC RPC CALL ===
    const { data: joinResult, error: joinError } = await supabaseAdmin.rpc(
      'atomic_join_pool',
      {
        p_pool_id: poolId,
        p_user_id: userId,
        p_ride_id: ride_id,
      }
    );

    if (joinError) {
      if (joinError.message?.includes('POOL_FULL')) {
        return res.status(400).json({
          error: { code: 'POOL_FULL' }
        });
      }
      if (joinError.message?.includes('POOL_NOT_AVAILABLE')) {
        return res.status(400).json({
          error: { code: 'POOL_NOT_AVAILABLE' }
        });
      }
      throw joinError;
    }

    // === RECALCULATE FARE ===
    const { data: poolWithMembers } = await supabaseAdmin
      .from('pools')
      .select(`*,pool_members(user_id, ride_id)`)
      .eq('id', poolId)
      .single();

    let farePerPerson = fareService.applyPoolDiscount(
      fareService.calculateBaseFare(ride.distance_km || 10, pool.vehicle_type),
      joinResult.current_passengers
    );

    if (poolWithMembers?.pool_members?.length > 0) {
      const rideIds = poolWithMembers.pool_members
        .map((m: any) => m.ride_id)
        .filter(Boolean);
      
      const { data: memberRides } = await supabaseAdmin
        .from('rides')
        .select('*')
        .in('id', rideIds);

      if (memberRides && memberRides.length > 0) {
        const members = memberRides.map((r: any) => ({
          userId: r.user_id,
          pickup: { latitude: r.pickup_lat, longitude: r.pickup_lng },
          dropoff: { latitude: r.dropoff_lat, longitude: r.dropoff_lng },
          pickupAddress: r.pickup_address,
          dropoffAddress: r.dropoff_address,
        }));

        const fareResult = await rideEstimationService.recalculatePoolFare(
          members,
          poolWithMembers.vehicle_type
        );
        
        if (fareResult.success) {
          farePerPerson = fareResult.farePerPerson;
        }
      }
    }

    // === NOTIFY OTHER MEMBERS ===
    let creatorNotified = false;
    for (const member of poolWithMembers.pool_members) {
      if (member.user_id !== userId) {
        await notificationService.sendPushNotification(member.user_id, {
          title: 'Fare Updated - New Rider Joined!',
          message: `A new rider joined your pool. Your fare is now ৳${farePerPerson} per person.`,
          type: 'POOL_MATCH',
          metadata: { poolId, farePerPerson, newPassengers: joinResult.current_passengers },
        });
        
        if (member.user_id === pool.creator_user_id) {
          creatorNotified = true;
        }
      }
    }

    // === NOTIFY POOL CREATOR ===
    if (!creatorNotified) {
      await notificationService.sendPoolFoundNotification(pool.creator_user_id, poolId);
    }

    // === TRIGGER LOOKUP TIMER ===
    await lookupTimeService.handleMemberJoined(poolId);

    // === RESPONSE ===
    res.json({
      success: true,
      data: {
        pool_id: poolId,
        member_id: joinResult.member_id,
        compatibility_score: compatibility.score,
        fare_per_person: farePerPerson,
        current_passengers: joinResult.current_passengers,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
}
```

---

## 3. Passenger Leaves Pool - Full Code Flow

### Controller: `pool.controller.ts` (Lines 585-850)

```typescript
async leavePool(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    const { poolId } = req.params;

    // === ATOMIC RPC CALL ===
    const { data: result, error } = await supabaseAdmin.rpc('atomic_leave_pool', {
      p_pool_id: poolId,
      p_user_id: userId,
    });

    if (error) throw error;

    if (!result.success) {
      if (result.reason === 'NOT_MEMBER') {
        return res.status(404).json({
          error: { code: 'NOT_IN_POOL' }
        });
      }
      if (result.reason === 'RIDE_IN_PROGRESS') {
        return res.status(400).json({
          error: { code: 'RIDE_IN_PROGRESS' }
        });
      }
      return res.status(400).json({
        error: { code: result.reason }
      });
    }

    // === APPLY PENALTIES ===
    const { data: ride } = await supabaseAdmin
      .from('rides')
      .select('created_at')
      .eq('id', result.ride_id)
      .single();

    if (ride) {
      const penaltyResult = await penaltyService.recordCancellation(
        userId,
        result.ride_id,
        ride.created_at
      );

      // Notify if cooldown applied
      if (penaltyResult.penaltyApplied) {
        await notificationService.sendPushNotification(userId, {
          title: 'Cooldown Applied',
          message: 'Due to multiple cancellations, you have a 7-minute cooldown.',
          type: 'SYSTEM',
          metadata: { cooldown_ends_at: penaltyResult.cooldownEndsAt },
        });
      }
    }

    // === PRIYO SATHI PENALTY ===
    const priyoSathiPenalty = await priyoSathiService.applyPriyoSathiCancellationPenalty(
      userId,
      result.ride_id,
      poolId
    );
    
    if (priyoSathiPenalty.penaltyApplied) {
      logger.info(`[Pool] Priyo Sathi penalty applied: ${priyoSathiPenalty.reason}`);
    }

    // === CHECK REMAINING MEMBERS ===
    const { data: poolWithMembers } = await supabaseAdmin
      .from('pools')
      .select(`
        *,
        pool_members(user_id, ride_id, left_at)
      `)
      .eq('id', poolId)
      .single();

    // Filter to only active members (left_at IS NULL)
    const activeMembers = poolWithMembers?.pool_members?.filter(
      (m: any) => m.left_at === null
    ) || [];

    // === AUTO-CANCEL IF < 2 MEMBERS ===
    if (activeMembers.length <= 1) {
      logger.info(
        `[Pool] ${activeMembers.length} member(s) left in pool ${poolId}, auto-cancelling`
      );

      // Cancel lookup timer
      lookupTimeService.cancelLookupTimer(poolId);

      // Update pool status
      await supabaseAdmin
        .from('pools')
        .update({
          status: 'CANCELLED',
          updated_at: new Date().toISOString(),
        })
        .eq('id', poolId);

      // If 1 member remains, cancel their ride and notify
      if (activeMembers.length === 1) {
        const lastMember = activeMembers[0];

        if (lastMember.ride_id) {
          await supabaseAdmin
            .from('rides')
            .update({
              pool_id: null,
              status: 'CANCELLED',
              cancelled_reason: 'Pool cancelled - not enough riders',
              updated_at: new Date().toISOString(),
            })
            .eq('id', lastMember.ride_id);
        }

        // Notify remaining member
        await notificationService.sendPushNotification(lastMember.user_id, {
          title: 'Pool Cancelled',
          message: 'Your pool was automatically cancelled because all other riders left.',
          type: 'POOL_CANCELLED',
          metadata: { poolId, reason: 'not_enough_riders' },
        });
      }

      return res.json({
        success: true,
        data: {
          message: 'Left pool successfully',
          pool_cancelled: true,
          reason: activeMembers.length === 0
            ? 'You were the only member'
            : 'Only 1 member remaining',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // === RECALCULATE FARE IF > 1 MEMBER REMAINS ===
    if (activeMembers.length > 1) {
      const rideIds = activeMembers
        .map((m: any) => m.ride_id)
        .filter(Boolean);

      const { data: memberRides } = await supabaseAdmin
        .from('rides')
        .select('*')
        .in('id', rideIds);

      if (memberRides && memberRides.length > 0) {
        const members = memberRides.map((r: any) => ({
          userId: r.user_id,
          pickup: { latitude: r.pickup_lat, longitude: r.pickup_lng },
          dropoff: { latitude: r.dropoff_lat, longitude: r.dropoff_lng },
          pickupAddress: r.pickup_address,
          dropoffAddress: r.dropoff_address,
        }));

        const fareResult = await rideEstimationService.recalculatePoolFare(
          members,
          poolWithMembers.vehicle_type
        );

        if (fareResult.success) {
          const farePerPerson = fareResult.farePerPerson;

          // Notify remaining members
          for (const member of activeMembers) {
            await notificationService.sendPushNotification(member.user_id, {
              title: 'Fare Updated - Member Left',
              message: `A member left your pool. Your fare is now ৳${farePerPerson} per person.`,
              type: 'POOL_FARE_UPDATE',
              metadata: { poolId, farePerPerson, newPassengers: activeMembers.length },
            });
          }

          // Update rides with new fare
          for (const ride of memberRides) {
            await supabaseAdmin
              .from('rides')
              .update({ estimated_fare: farePerPerson })
              .eq('id', ride.id);
          }
        }
      }
    }

    // === RESPONSE ===
    res.json({
      success: true,
      data: {
        message: 'Left pool successfully',
        pool_cancelled: false,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
}
```

---

## 4. RPC Functions

### atomic_accept_pool (SQL)

```sql
CREATE OR REPLACE FUNCTION public.atomic_accept_pool(
  p_pool_id UUID,
  p_driver_id UUID,
  p_vehicle_id UUID
) RETURNS JSON AS $$
DECLARE
  v_pool RECORD;
BEGIN
  SELECT * INTO v_pool FROM pools 
  WHERE id = p_pool_id AND driver_id IS NULL 
    AND status IN ('WAITING_FOR_DRIVER', 'WAITING_FOR_RIDERS')
  FOR UPDATE SKIP LOCKED;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false, 
      'reason', 'ALREADY_ASSIGNED', 
      'message', 'Pool is no longer available or already has a driver'
    );
  END IF;
  
  IF v_pool.current_passengers < 2 THEN
    RETURN json_build_object(
      'success', false, 
      'reason', 'INSUFFICIENT_PASSENGERS', 
      'message', 'Pool needs at least 2 passengers'
    );
  END IF;
  
  UPDATE pools 
  SET driver_id = p_driver_id, 
      vehicle_id = p_vehicle_id, 
      status = 'READY_TO_START', 
      updated_at = NOW()
  WHERE id = p_pool_id;
  
  RETURN json_build_object(
    'success', true, 
    'pool_id', p_pool_id, 
    'assigned_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### atomic_join_pool (SQL)

```sql
CREATE OR REPLACE FUNCTION public.atomic_join_pool(
  p_pool_id UUID,
  p_user_id UUID,
  p_ride_id UUID
) RETURNS JSON AS $$
DECLARE
  v_pool RECORD;
  v_member_id UUID;
  v_new_count INTEGER;
BEGIN
  SELECT * INTO v_pool FROM pools WHERE id = p_pool_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'POOL_NOT_FOUND: Pool does not exist';
  END IF;
  
  IF v_pool.status NOT IN ('WAITING_FOR_RIDERS', 'WAITING_FOR_DRIVER') THEN
    RAISE EXCEPTION 'POOL_NOT_AVAILABLE: Pool is no longer accepting riders';
  END IF;
  
  IF v_pool.current_passengers >= v_pool.max_passengers THEN
    RAISE EXCEPTION 'POOL_FULL: Pool has reached maximum capacity';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pool_members 
    WHERE pool_id = p_pool_id AND user_id = p_user_id AND left_at IS NULL
  ) THEN
    RAISE EXCEPTION 'ALREADY_MEMBER: User is already in this pool';
  END IF;
  
  v_member_id := gen_random_uuid();
  v_new_count := v_pool.current_passengers + 1;
  
  INSERT INTO pool_members (id, pool_id, user_id, ride_id, join_type, joined_at)
  VALUES (v_member_id, p_pool_id, p_user_id, p_ride_id, 'MATCHED', NOW());
  
  UPDATE pools 
  SET current_passengers = v_new_count,
      status = CASE WHEN v_new_count >= max_passengers 
                    THEN 'WAITING_FOR_DRIVER'::text 
                    ELSE status END,
      updated_at = NOW()
  WHERE id = p_pool_id;
  
  UPDATE rides 
  SET pool_id = p_pool_id, 
      status = 'WAITING_FOR_DRIVER', 
      updated_at = NOW() 
  WHERE id = p_ride_id;
  
  RETURN json_build_object(
    'success', true, 
    'member_id', v_member_id, 
    'current_passengers', v_new_count,
    'pool_status', CASE WHEN v_new_count >= v_pool.max_passengers 
                        THEN 'WAITING_FOR_DRIVER' ELSE v_pool.status END
  );
EXCEPTION
  WHEN OTHERS THEN RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### atomic_leave_pool (SQL)

```sql
CREATE OR REPLACE FUNCTION public.atomic_leave_pool(
  p_pool_id UUID,
  p_user_id UUID
) RETURNS JSON AS $$
DECLARE
  v_member RECORD;
  v_pool RECORD;
BEGIN
  SELECT * INTO v_member FROM pool_members 
  WHERE pool_id = p_pool_id AND user_id = p_user_id AND left_at IS NULL 
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false, 
      'reason', 'NOT_MEMBER', 
      'message', 'User is not a member of this pool'
    );
  END IF;
  
  SELECT * INTO v_pool FROM pools WHERE id = p_pool_id FOR UPDATE;
  
  IF v_pool.status IN ('STARTED', 'COMPLETED') THEN
    RETURN json_build_object(
      'success', false, 
      'reason', 'RIDE_IN_PROGRESS', 
      'message', 'Cannot leave a pool that has started'
    );
  END IF;
  
  UPDATE pool_members SET left_at = NOW() WHERE id = v_member.id;
  
  UPDATE pools
  SET current_passengers = GREATEST(current_passengers - 1, 0),
      status = CASE WHEN current_passengers - 1 < 2 
                    THEN 'WAITING_FOR_RIDERS'::text 
                    ELSE status END,
      updated_at = NOW()
  WHERE id = p_pool_id;
  
  UPDATE rides 
  SET pool_id = NULL, 
      status = 'CANCELLED', 
      cancelled_reason = 'Left pool', 
      updated_at = NOW() 
  WHERE id = v_member.ride_id;
  
  RETURN json_build_object(
    'success', true, 
    'member_id', v_member.id, 
    'ride_id', v_member.ride_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 5. Notification Service Methods

```typescript
// notification.service.ts

async sendPushNotification(userId: string, payload: NotificationPayload): Promise<void> {
  try {
    // Store in database
    await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      title: payload.title,
      message: payload.message,
      type: payload.type,
      metadata: payload.metadata || null,
      is_read: false,
    });

    // Send FCM if configured
    if (this.fcmServerKey) {
      await this.sendToFCM(userId, payload);
    }

    logger.info(`[Notification] Sent to ${userId}: ${payload.type}`);
  } catch (error) {
    logger.error(`[Notification] Failed to send to ${userId}:`, error);
  }
}

async sendPoolFoundNotification(userId: string, poolId: string): Promise<void> {
  await this.sendPushNotification(userId, {
    title: 'Pool Found!',
    message: 'A matching pool has been found for your ride request.',
    type: 'POOL_MATCH',
    metadata: { pool_id: poolId },
  });
}

async sendPoolCancelledNotification(userId: string, poolId: string, reason: string): Promise<void> {
  await this.sendPushNotification(userId, {
    title: 'Pool Cancelled',
    message: reason,
    type: 'POOL_MATCH',
    metadata: { pool_id: poolId, cancelled: true },
  });
}

async sendDriverAssignedNotification(
  userId: string,
  poolId: string,
  driverInfo: { name?: string; vehicle?: string }
): Promise<void> {
  await this.sendPushNotification(userId, {
    title: 'Driver Assigned!',
    message: `Your driver is on the way${driverInfo.vehicle ? ` in a ${driverInfo.vehicle}` : ''}.`,
    type: 'DRIVER_ASSIGNED',
    metadata: { pool_id: poolId, driver: driverInfo },
  });
}
```

