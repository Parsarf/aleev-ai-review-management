# Fix 404 on /api/reviews in Vercel

## Problem
The route `/api/reviews` returns 404 (Function Invocation Not Found) in Vercel, even though it builds successfully locally.

## Verification (Local Build)
The route **is correctly configured** and **builds successfully**:
```
├ ƒ /api/reviews                     0 B            0 B
```

The `ƒ` symbol confirms it's registered as a function (API route).

## Solutions

### Solution 1: Clear Vercel Build Cache

1. **Vercel Dashboard**:
   - Go to your project → **Settings** → **General**
   - Scroll to **Build & Development Settings**
   - Under **Build Cache**, click **Clear Build Cache**
   - Click **Redeploy** on the latest deployment

2. **Via Vercel CLI** (if you have it):
   ```bash
   vercel --prod --force
   ```

### Solution 2: Trigger Fresh Deployment

1. **Empty Commit** (recommended):
   ```bash
   git commit --allow-empty -m "Trigger Vercel rebuild for /api/reviews"
   git push
   ```

2. **Or manually trigger**:
   - Vercel Dashboard → **Deployments** tab
   - Click `...` on latest deployment → **Redeploy**

### Solution 3: Verify Deployment Branch

1. **Check Vercel Settings**:
   - Settings → **Git** → **Production Branch**
   - Ensure it matches your branch (usually `main`)

2. **Verify Latest Commit**:
   - Check that the latest commit is deployed
   - Compare commit SHA in Vercel with your latest commit

### Solution 4: Check Build Output

After deployment, check:
1. **Vercel Dashboard** → **Functions** tab
2. Look for `/api/reviews` in the list
3. If missing, check **Build Logs** for errors

### Solution 5: Verify File Structure

Ensure Vercel is building from the correct directory:
- If using monorepo, verify **Root Directory** in Vercel settings
- Should point to directory containing `src/app/api/reviews/route.ts`

## Expected Build Output

In Vercel build logs, you should see:
```
Route (app)                         Size  First Load JS
├ ƒ /api/reviews                     0 B            0 B
```

If you see this, the route is built correctly.

## Testing After Deployment

1. **Check Functions Tab**:
   - Vercel Dashboard → **Functions**
   - `/api/reviews` should appear in the list

2. **Test the Route**:
   ```bash
   curl https://your-domain.vercel.app/api/reviews
   ```
   Expected: `401 Unauthorized` (not 404)

3. **Check Vercel Logs**:
   - View function logs for any runtime errors

## Why This Happens

- **Stale Build Cache**: Vercel caches build artifacts, sometimes excluding new routes
- **Incremental Builds**: Changes to API routes may not trigger full rebuild
- **Build Errors**: Silent failures during build can exclude routes
- **File Not Tracked**: If file wasn't in git, it won't be deployed

## Verification Checklist

- [x] Route file exists: `src/app/api/reviews/route.ts`
- [x] Has `export const runtime = "nodejs"`
- [x] Has `export async function GET()`
- [x] Has `export async function POST()`
- [x] Builds successfully locally
- [x] Appears in local build output
- [ ] Appears in Vercel Functions tab (check after redeploy)
- [ ] Returns 401 (not 404) when accessing route

## If Still Not Working

1. **Check Build Logs**:
   - Look for any errors or warnings
   - Check if route is mentioned in logs

2. **Compare with Working Routes**:
   - Check `/api/healthz` works
   - Compare file structure with working route

3. **Create Minimal Test Route**:
   ```typescript
   // src/app/api/test/route.ts
   export const runtime = "nodejs";
   import { NextResponse } from "next/server";
   export async function GET() {
     return NextResponse.json({ test: "ok" });
   }
   ```
   If this works but `/api/reviews` doesn't, there's something specific to that route.

