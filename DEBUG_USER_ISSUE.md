# Debugging "User not found" Issue

## Problem
- `/api/reviews` executes successfully
- Returns `{"error": "User not found"}`
- Session exists with `session.user.id`
- But no User row exists in production database with that ID

## Diagnostic Steps

### 1. Check Production Database

Connect to your production database and run:

```sql
-- Check all users
SELECT id, email, name, role, "createdAt", "updatedAt" 
FROM users 
ORDER BY "createdAt" DESC 
LIMIT 10;

-- Check sessions (should show active sessions)
SELECT s.id, s."userId", s."sessionToken", s.expires, u.email
FROM sessions s
LEFT JOIN users u ON s."userId" = u.id
ORDER BY s.expires DESC
LIMIT 10;

-- Check accounts (OAuth provider links)
SELECT a.id, a."userId", a.provider, a."providerAccountId", u.email
FROM accounts a
LEFT JOIN users u ON a."userId" = u.id
ORDER BY a."createdAt" DESC
LIMIT 10;
```

### 2. Check Vercel Logs

After making a request to `/api/reviews`, check Vercel function logs for:

```
[GET /api/reviews] Session data: { userId: '...', userEmail: '...' }
[GET /api/reviews] Querying user from database: '...'
[GET /api/reviews] User not found in database: { ... }
```

This will show:
- What user ID is in the session
- Whether a user exists with a different ID
- Whether the user exists by email but with wrong ID

### 3. Verify Environment Variables

In Vercel Dashboard → Settings → Environment Variables:

- `DATABASE_URL` - Should point to production database
- `DATABASE_DIRECT_URL` - Should be set if using connection pooling
- `NEXTAUTH_SECRET` - Must be set and match across deployments
- `NEXTAUTH_URL` - Should be your production domain

### 4. Check Database Migrations

Ensure migrations are applied to production:

```bash
# On Vercel, migrations should run automatically if using:
# "vercel-build": "prisma generate && prisma migrate deploy && next build"

# Or manually run:
npx prisma migrate deploy
```

### 5. Test Sign-In Flow

1. **Sign out completely** (clear all cookies)
2. **Sign in with Google**
3. **Check logs** for "User will be created by PrismaAdapter"
4. **Query database** to see if user was created
5. **Check accounts table** to see if Google account was linked

### 6. Verify PrismaAdapter is Working

The PrismaAdapter should automatically:
- Create User when signing in with Google for the first time
- Create Account record linking Google OAuth to User
- Create Session record for the active session

If this isn't happening, check:
- Prisma schema matches NextAuth requirements
- Database connection is working
- No errors in Vercel logs during sign-in

## Common Issues & Fixes

### Issue 1: User ID Mismatch
**Symptom**: Session has ID `A` but user exists with ID `B`

**Fix**: This usually means the session was created against a different database or user was deleted. Sign out and sign in again.

### Issue 2: User Not Created on Sign-In
**Symptom**: Signing in doesn't create a User row

**Possible causes**:
- PrismaAdapter not working correctly
- Database write permissions issue
- Migration not applied (missing User table structure)

**Fix**: 
- Check Vercel logs during sign-in for errors
- Verify Prisma schema has all required NextAuth fields
- Run migrations: `npx prisma migrate deploy`

### Issue 3: Different Databases
**Symptom**: User exists locally but not in production

**Fix**: Verify `DATABASE_URL` on Vercel points to production database, not local.

### Issue 4: Session Strategy Mismatch
**Symptom**: Session exists but user lookup fails

**Fix**: We've set `session: { strategy: "database" }` in auth.ts. This ensures sessions are stored in the database and user ID is available.

## Quick Fix (Temporary)

If you need to manually create a user:

```sql
-- 1. Create the user
INSERT INTO users (id, email, name, role, "createdAt", "updatedAt")
VALUES (
  'clxxxxxxxxxxxxxxxxxx', -- Generate a CUID or use the session user ID
  'your-email@gmail.com',
  'Your Name',
  'OWNER',
  NOW(),
  NOW()
);

-- 2. Link the Google account (find account ID from accounts table first)
UPDATE accounts 
SET "userId" = 'your-user-id'
WHERE "providerAccountId" = 'google-user-id-from-oauth';
```

## Testing After Fix

1. Sign out completely
2. Sign in with Google
3. Make request to `/api/reviews`
4. Expected: `200 OK` with reviews array (even if empty)
5. Not expected: `404` with "User not found"

