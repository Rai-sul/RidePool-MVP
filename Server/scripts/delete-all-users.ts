/**
 * Script to delete all users from Supabase auth.users table
 * 
 * Usage: npx ts-node scripts/delete-all-users.ts
 * 
 * WARNING: This will permanently delete ALL users. Use with caution!
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function deleteAllUsers() {
  console.log('⚠️  WARNING: This will delete ALL users from auth.users table!');
  console.log('Starting in 3 seconds... Press Ctrl+C to cancel.\n');
  
  await new Promise(resolve => setTimeout(resolve, 3000));

  try {
    // Fetch all users (paginated)
    let page = 1;
    const perPage = 100;
    let totalDeleted = 0;

    while (true) {
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage,
      });

      if (listError) {
        console.error('Error listing users:', listError.message);
        break;
      }

      if (!users || users.length === 0) {
        console.log('No more users to delete.');
        break;
      }

      console.log(`Found ${users.length} users on page ${page}`);

      for (const user of users) {
        // Delete from public.users first (if exists)
        await supabaseAdmin.from('users').delete().eq('id', user.id);

        // Delete from auth.users
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

        if (deleteError) {
          console.error(`❌ Failed to delete user ${user.email || user.id}:`, deleteError.message);
        } else {
          console.log(`✅ Deleted user: ${user.email || user.id}`);
          totalDeleted++;
        }
      }

      // If we got fewer users than perPage, we're done
      if (users.length < perPage) {
        break;
      }

      // Don't increment page since we're deleting users
      // The next page 1 will have remaining users
    }

    console.log(`\n🎉 Done! Total users deleted: ${totalDeleted}`);
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

deleteAllUsers();
