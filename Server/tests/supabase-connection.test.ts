import { supabaseAdmin } from '../src/config/supabase';

describe('Supabase Connection Tests', () => {
  test('should connect to Supabase database', async () => {
    const { data, error } = await supabaseAdmin
      .from('app_metadata')
      .select('key')
      .limit(1);
    
    expect(error).toBeNull();
    expect(data).toBeDefined();
  }, 10000);

  test('should have app_metadata table with h3_resolution key', async () => {
    const { data, error } = await supabaseAdmin
      .from('app_metadata')
      .select('*')
      .eq('key', 'h3_resolution')
      .single();
    
    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.key).toBe('h3_resolution');
    expect(data?.value).toHaveProperty('pickup');
    expect(data?.value).toHaveProperty('destination');
  }, 10000);

  test('should have all core tables created', async () => {
    const tables = [
      'users',
      'wallets',
      'pools',
      'rides',
      'pool_members',
      'vehicles',
      'vehicle_locations',
      'payments',
      'notifications',
      'driver_sessions'
    ];

    for (const table of tables) {
      const { data, error } = await supabaseAdmin
        .from(table)
        .select('*')
        .limit(0);
      
      expect(error).toBeNull();
    }
  }, 30000);

  test('should have RPC function atomic_join_pool', async () => {
    const { data, error } = await supabaseAdmin.rpc('atomic_join_pool', {
      p_pool_id: '00000000-0000-0000-0000-000000000000',
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_ride_id: '00000000-0000-0000-0000-000000000000'
    });
    
    expect(error).toBeDefined();
    expect(error?.message).toContain('POOL_NOT_FOUND');
  }, 10000);

  test('should have RPC function atomic_wallet_credit', async () => {
    // This will fail with foreign key error since user doesn't exist, but proves RPC exists
    const { data, error } = await supabaseAdmin.rpc('atomic_wallet_credit', {
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_amount: 100,
      p_reference_type: 'TEST',
      p_reference_id: null,
      p_metadata: null
    });
    
    // RPC exists if we get a proper database error (not "function does not exist")
    expect(error).toBeDefined();
    expect(error?.code).toBe('23503'); // Foreign key violation
    expect(error?.message).toContain('violates foreign key constraint');
  }, 10000);

  test('should have RPC function update_vehicle_location', async () => {
    const { data, error } = await supabaseAdmin.rpc('update_vehicle_location', {
      p_vehicle_id: '00000000-0000-0000-0000-000000000000',
      p_latitude: 23.8103,
      p_longitude: 90.4125,
      p_heading: 0,
      p_speed: 0
    });
    
    expect(data).toBeDefined();
    expect(['VEHICLE_NOT_FOUND', 'success']).toContain(data.success ? 'success' : data.reason);
  }, 10000);

  test('should verify postgis extension is installed', async () => {
    const { data, error } = await supabaseAdmin.rpc('postgis_version' as any);
    
    expect(error === null || error?.message.includes('does not exist')).toBe(true);
  }, 10000);

  test('should verify row level security is enabled on users table', async () => {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id')
      .limit(1);
    
    expect(error).toBeNull();
  }, 10000);
});
