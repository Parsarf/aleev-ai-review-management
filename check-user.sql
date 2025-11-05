-- Diagnostic SQL queries to check user/auth state
-- Run these against your production database

-- 1. Check all users in the database
SELECT 
    id, 
    email, 
    name, 
    role, 
    "createdAt", 
    "updatedAt"
FROM users 
ORDER BY "createdAt" DESC;

-- 2. Check active sessions and their linked users
SELECT 
    s.id as session_id,
    s."userId",
    s."sessionToken",
    s.expires,
    u.email as user_email,
    u.name as user_name
FROM sessions s
LEFT JOIN users u ON s."userId" = u.id
ORDER BY s.expires DESC;

-- 3. Check OAuth accounts and their linked users
SELECT 
    a.id as account_id,
    a."userId",
    a.provider,
    a."providerAccountId",
    a.email as account_email,
    u.email as user_email,
    u.id as user_id
FROM accounts a
LEFT JOIN users u ON a."userId" = u.id
ORDER BY a."createdAt" DESC;

-- 4. Find orphaned sessions (sessions without users)
SELECT 
    s.id,
    s."userId",
    s."sessionToken",
    s.expires
FROM sessions s
LEFT JOIN users u ON s."userId" = u.id
WHERE u.id IS NULL;

-- 5. Find orphaned accounts (accounts without users)
SELECT 
    a.id,
    a."userId",
    a.provider,
    a."providerAccountId",
    a.email
FROM accounts a
LEFT JOIN users u ON a."userId" = u.id
WHERE u.id IS NULL;
