-- ============================================
-- Test User Setup Instructions
-- ============================================
--
-- STEP 1: Create the user via Supabase Studio
-- -------------------------------------------
-- 1. Open Supabase Studio: http://127.0.0.1:54323
-- 2. Go to: Authentication → Users
-- 3. Click: "Add user"
-- 4. Fill in:
--    Email: admin@test.com
--    Password: password123
--    ✅ IMPORTANT: Check "Auto Confirm User" (required for local dev)
-- 5. Click: "Create user"
--
-- STEP 2: Verify the profile was created automatically
-- -------------------------------------------
-- The database trigger should have automatically created a profile.
-- Run this query to check:

SELECT
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.created_at
FROM profiles p
WHERE p.email = 'admin@test.com';

-- Expected: 1 row with role = 'employee' (default)

-- STEP 3: Promote user to admin
-- -------------------------------------------
-- Run this to give the user admin privileges:

UPDATE profiles
SET role = 'admin',
    full_name = 'Admin User'
WHERE email = 'admin@test.com';

-- STEP 4: Verify admin promotion
-- -------------------------------------------

SELECT
  p.id,
  p.email,
  p.full_name,
  p.role
FROM profiles p
WHERE p.email = 'admin@test.com';

-- Expected: role = 'admin', full_name = 'Admin User'

-- ============================================
-- Additional Test Users (Optional)
-- ============================================

-- After creating users via Studio UI, you can assign different roles:

-- Employee user:
-- UPDATE profiles SET role = 'employee', full_name = 'Employee Test'
-- WHERE email = 'employee@test.com';

-- Agent user:
-- UPDATE profiles SET role = 'agent', full_name = 'Agent Test'
-- WHERE email = 'agent@test.com';

-- Manager user:
-- UPDATE profiles SET role = 'manager', full_name = 'Manager Test'
-- WHERE email = 'manager@test.com';
