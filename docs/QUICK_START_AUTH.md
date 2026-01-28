# Quick Start: Test Authentication

## Prerequisites
- Supabase running: `supabase start`
- Frontend running: `cd frontend && npm run dev`

## 5-Minute Setup

### 1. Create User
```
http://127.0.0.1:54323 → Authentication → Users → Add user
Email: admin@test.com
Password: password123
Auto Confirm User: YES
```

### 2. Make Admin
```sql
-- In Studio SQL Editor
UPDATE profiles SET role = 'admin', full_name = 'Admin User' WHERE email = 'admin@test.com';
```

### 3. Test Login
```
http://localhost:5173
Login with admin@test.com / password123
Should see Dashboard with "admin" badge
```

### 4. Test Logout
```
Click user dropdown → Sign out
Should redirect to /login
```

### 5. Test Protected Routes
```
Go directly to: http://localhost:5173/properties (without login)
Should redirect to /login?redirect=/properties
Login → Should redirect back to /properties
```

## Troubleshooting

### Can't login / "Invalid credentials"
- Check user was created in Studio → Authentication → Users
- Verify email is correct (check for typos)
- Ensure "Auto Confirm User" was checked
- Check browser console (F12) for errors

### Infinite redirect loop
- Check Supabase is running: `supabase status`
- Verify `.env` has correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Restart frontend dev server

### Profile not created / role is null
Check database trigger exists:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

Manually create profile if needed:
```sql
INSERT INTO profiles (id, email, role)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'admin@test.com'),
  'admin@test.com',
  'admin'
);
```

### TopBar doesn't show user info
- Open browser console (F12)
- Check for errors loading profile
- Verify profile exists: `SELECT * FROM profiles WHERE email = 'admin@test.com';`
