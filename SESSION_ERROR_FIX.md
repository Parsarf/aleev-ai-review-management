# Fix for SESSION_ERROR with Invalid User ID

## Problem
The API route `/api/reviews` fails with a SESSION_ERROR because `prisma.user.findUnique()` is being called with an invalid or undefined user ID. This happens when NextAuth's session doesn't include a valid `user.id`.

## Root Causes

1. **User not created in database**: PrismaAdapter didn't create the user during sign-in
2. **Session callback not setting user.id**: The session callback didn't properly populate `user.id`
3. **Database session without linked user**: Session exists but user row is missing or ID mismatch
4. **Invalid session format**: Session contains invalid or malformed user ID

## Solutions Applied

### 1. Enhanced Session Callback
Updated `src/lib/auth.ts` to:
- Handle cases where `user` object might not be provided
- Add error handling when fetching user role
- Log warnings when user object is missing

### 2. User ID Validation
Added validation in `/api/reviews` route:
- Validate user ID before database queries
- Check for empty, null, or invalid string IDs
- Return clear error messages when ID is invalid

### 3. Prisma Error Handling
Added try-catch blocks around Prisma queries:
- Catch invalid ID format errors
- Log detailed error information
- Return user-friendly error messages

## Verification Steps

### Step 1: Check Session Data
After making a request, check Vercel logs for:
```
[GET /api/reviews] Session data: { userId: '...', userEmail: '...', ... }
```

If `userId` is `undefined` or `null`, the session callback isn't working.

### Step 2: Check Database Sessions
Query your database:
```sql
-- Check active sessions and their linked users
SELECT s.id, s."userId", s."sessionToken", s.expires, u.email
FROM sessions s
LEFT JOIN users u ON s."userId" = u.id
ORDER BY s.expires DESC
LIMIT 10;
```

If sessions have `userId` but no matching user exists, the user wasn't created.

### Step 3: Verify PrismaAdapter is Creating Users
1. Sign out completely
2. Sign in with Google
3. Check Vercel logs for:
   - "User will be created by PrismaAdapter"
   - Any database errors during sign-in
4. Query database to verify user was created

### Step 4: Check Environment Variables
Ensure on Vercel:
- `DATABASE_URL` points to production database
- `DATABASE_DIRECT_URL` is set (if using connection pooling)
- `NEXTAUTH_SECRET` is set and consistent
- `NEXTAUTH_URL` matches your production domain

## Expected Behavior

### Valid Session
```
[GET /api/reviews] Session data: { userId: 'clxxx...', userEmail: 'test@gmail.com', ... }
[GET /api/reviews] Querying user from database: clxxx...
[GET /api/reviews] User found: { userId: 'clxxx...', email: 'test@gmail.com', ... }
```

### Invalid User ID
```
[GET /api/reviews] Session data: { userId: undefined, userEmail: 'test@gmail.com', ... }
[GET /api/reviews] Invalid user ID in session: { userId: undefined, ... }
Response: 401 { error: "Invalid session", message: "..." }
```

### Invalid ID Format (Prisma Error)
```
[GET /api/reviews] Querying user from database: invalid-id
[GET /api/reviews] Prisma error querying user: { error: ..., errorMessage: "Invalid ..." }
Response: 401 { error: "Invalid user ID", message: "..." }
```

## Fixes to Try

### Fix 1: Ensure User is Created
If user doesn't exist in database:
1. Sign out completely
2. Clear all cookies
3. Sign in with Google again
4. Verify user is created in database

### Fix 2: Check Database Migrations
Ensure migrations are applied:
```bash
npx prisma migrate deploy
```

### Fix 3: Verify PrismaAdapter Configuration
Ensure `src/lib/auth.ts` has:
```typescript
adapter: PrismaAdapter(prisma) as Adapter,
session: {
  strategy: "database",
},
```

### Fix 4: Manual User Creation (Temporary)
If automatic creation isn't working:
```sql
-- Find session user ID
SELECT s."userId" FROM sessions s ORDER BY s.expires DESC LIMIT 1;

-- Create user with that ID (if it's a valid CUID)
INSERT INTO users (id, email, name, role, "createdAt", "updatedAt")
VALUES (
  'session-user-id-from-above',
  'your-email@gmail.com',
  'Your Name',
  'OWNER',
  NOW(),
  NOW()
);
```

## Testing

After fixes, test:
```bash
curl -H "Cookie: next-auth.session-token=..." \
  https://your-domain.vercel.app/api/reviews
```

Expected:
- ✅ `200 OK` with reviews (if logged in and user exists)
- ✅ `401 Unauthorized` with clear error message (if session invalid)
- ❌ Not: `500 Internal Server Error` or Prisma errors

