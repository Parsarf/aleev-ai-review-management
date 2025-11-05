# Vercel Deployment Checklist for /api/reviews

## ✅ Local Verification (PASSED)
- [x] Route file exists at `src/app/api/reviews/route.ts`
- [x] Has `export const runtime = "nodejs"`
- [x] Has `export async function GET()` handler
- [x] Has `export async function POST()` handler
- [x] Build shows route in functions list: `├ ƒ /api/reviews`
- [x] No conflicting `pages/api/reviews` routes
- [x] All TypeScript errors resolved
- [x] All changes committed and pushed to `main` branch

## 🔍 Vercel Deployment Debugging Steps

### 1. Check Vercel Dashboard → Functions Tab
- Go to your Vercel project dashboard
- Navigate to **Functions** tab
- Look for `/api/reviews` in the list
- **If missing**: Route wasn't included in build

### 2. Verify Deployment Branch
- Check which branch Vercel is deploying from
- Should be `main` (or your production branch)
- Verify latest commit `02be9c7` is deployed

### 3. Check Build Logs
- Go to **Deployments** tab in Vercel
- Click on latest deployment
- Check **Build Logs** for:
  - Any errors during build
  - TypeScript compilation errors
  - Missing dependencies
  - Route registration messages

### 4. Trigger New Deployment
If route still missing:
```bash
# Option A: Push an empty commit to trigger rebuild
git commit --allow-empty -m "Trigger Vercel rebuild"
git push

# Option B: Redeploy from Vercel dashboard
# Dashboard → Deployments → ... → Redeploy
```

### 5. Clear Build Cache
- Vercel Dashboard → Settings → General
- Scroll to "Build Cache"
- Clear cache and redeploy

### 6. Verify Environment Variables
- Ensure all required env vars are set in Vercel
- Especially: `DATABASE_URL`, `NEXTAUTH_SECRET`, etc.

## 🧪 Testing the Route

### Expected Behavior:
- **Without auth**: Should return `401 Unauthorized` (NOT 404)
- **With auth**: Should return review data or empty array

### Test Commands:
```bash
# Test locally (should work)
curl http://localhost:3000/api/reviews

# Test on Vercel (should return 401, not 404)
curl https://your-domain.vercel.app/api/reviews
```

## 📋 Route Configuration Summary

**File Path:** `src/app/api/reviews/route.ts`
**Runtime:** Node.js (for Prisma compatibility)
**HTTP Methods:** GET, POST
**Authentication:** Required (via middleware)
**Platform Filter:** Google-only (hardcoded)

## 🔧 If Still Not Working

1. **Check middleware configuration** - Should include `/api/reviews/:path*` in matcher
2. **Verify Next.js version** - Should be compatible with App Router
3. **Check for build-time errors** - Route might be excluded if build fails
4. **Compare with working routes** - Check `/api/healthz` works to verify App Router is functioning

