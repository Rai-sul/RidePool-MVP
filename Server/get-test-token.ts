
import { supabase, supabaseAdmin } from './src/config/supabase';

const TEST_EMAIL = 'test_user@example.com';
const TEST_PASSWORD = 'password123';

async function getTestToken() {
  console.log(`Attempting to get token for ${TEST_EMAIL}...`);

  // 1. Try to sign in
  let { data, error } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (error) {
    console.log('Sign in failed, attempting to create user...');
    
    // 2. If sign in fails, try to create user (auto-confirmed)
    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true
    });

    if (createError) {
      // If user already exists but sign in failed, maybe password is wrong or other issue
      console.error('Error creating user:', createError.message);
      return;
    }

    console.log('User created successfully in Auth.');
    
    // Create user in public table as well
    if (createData.user) {
        const { error: publicError } = await supabaseAdmin
            .from('users')
            .insert([{ id: createData.user.id }]);
            
        if (publicError) {
            console.log('Note: User might already exist in public table or error creating:', publicError.message);
        } else {
            console.log('User profile created in public table.');
        }
    }

    // 3. Sign in again
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    if (signInError) {
      console.error('Error signing in after creation:', signInError.message);
      return;
    }

    data = signInData;
  }

  if (data.session) {
    console.log('\nSUCCESS! Here is your access token for Postman:\n');
    console.log(data.session.access_token);
    console.log('\nUse this token in the "Authorization" header with value: Bearer <token>');
  } else {
    console.error('Failed to get session.');
  }
}

getTestToken();
