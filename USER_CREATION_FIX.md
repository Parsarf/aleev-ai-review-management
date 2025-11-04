# Fix for "User not found" Error

## Problem
The API route `/api/reviews` returns `{"error": "User not found"}` even though authentication succeeds.

## Root Cause
The PrismaAdapter should automatically create users when they sign in with Google, but there might be:
1. Database connection issues on Vercel
2. User created in a different database (local vs production)
3. Session strategy mismatch (JWT vs database sessions)

## Solutions Applied

### 1. Explicit Database Session Strategy
Updated `src/lib/auth.ts` to use database sessions:
```typescript
session: {
  strategy: "database", // Ensures user object is always available
},
```

### 2. Added Sign-In Callback
Added logging to track user creation during sign-in.

## Verification Steps

### Step 1: Check Database Connection
Verify `DATABASE_URL` on Vercel points to the correct database:
- Vercel Dashboard → Settings → Environment Variables
- Ensure `DATABASE_URL` is set correctly
- Ensure `DATABASE_DIRECT_URL` is set (if using connection pooling)

### Step 2: Verify User Exists in Database
Run this query in your production database:
```sql
SELECT id, email, name, role, "createdAt" 
FROM users 
WHERE email = 'your-email@gmail.com';
```

If no user exists, the PrismaAdapter might not be creating users.

### Step 3: Test Sign-In Flow
1. Sign out completely (clear cookies)
2. Sign in with Google again
3. Check Vercel function logs for:
   - "User will be created by PrismaAdapter" message
   - Any database errors

### Step 4: Manual User Creation (Temporary Fix)
If users aren't being created automatically, you can manually create one:

```sql
INSERT INTO users (id, email, name, role, "createdAt", "updatedAt")
VALUES (
  'clxxxxxxxxxxxxxxxxxx', -- Generate a CUID
  'your-email@gmail.com',
  'Your Name',
  'OWNER',
  NOW(),
  NOW()
);
```

Then link the Google account:
```sql
-- First, find the account ID from the accounts table
SELECT * FROM accounts WHERE "providerAccountId" = 'google-user-id';

-- Then update it to link to your user
UPDATE accounts 
SET "userId" = 'your-user-id'
WHERE "providerAccountId" = 'google-user-id';
```

## Long-Term Fix

The PrismaAdapter should handle this automatically. If it's not working:

1. **Check Prisma Schema**: Ensure User, Account, and Session models match NextAuth requirements
2. **Check Database Migrations**: Run `npx prisma migrate deploy` on Vercel
3. **Check Environment Variables**: All required vars must be set
4. **Review Vercel Logs**: Look for errors during sign-in

## Testing

After fixes, test:
```bash
curl -H "Cookie: next-auth.session-token=..." \
  https://your-domain.vercel.app/api/reviews
```

Expected: `401 Unauthorized` (if not logged in) or `200 OK` with reviews (if logged in)
Not Expected: `404 Not Found` or `{"error": "User not found"}`

