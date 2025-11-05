#!/bin/bash
# Script to verify route is correctly configured for deployment

echo "🔍 Verifying /api/reviews route configuration..."
echo ""

# Check file exists
if [ ! -f "src/app/api/reviews/route.ts" ]; then
  echo "❌ Route file not found at src/app/api/reviews/route.ts"
  exit 1
fi
echo "✅ Route file exists at src/app/api/reviews/route.ts"

# Check for required exports
if ! grep -q "export const runtime = \"nodejs\"" src/app/api/reviews/route.ts; then
  echo "❌ Missing runtime export"
  exit 1
fi
echo "✅ Runtime export present"

if ! grep -q "export async function GET" src/app/api/reviews/route.ts; then
  echo "❌ Missing GET handler"
  exit 1
fi
echo "✅ GET handler present"

if ! grep -q "export async function POST" src/app/api/reviews/route.ts; then
  echo "❌ Missing POST handler"
  exit 1
fi
echo "✅ POST handler present"

# Check for conflicting routes
if [ -f "pages/api/reviews.ts" ] || [ -f "pages/api/reviews/index.ts" ]; then
  echo "⚠️  WARNING: Conflicting pages/api/reviews file found"
  echo "   This may prevent app/api/reviews from working"
fi

# Check file structure
if [ ! -d "src/app/api" ]; then
  echo "❌ src/app/api directory not found"
  exit 1
fi
echo "✅ App router structure correct"

echo ""
echo "✅ All checks passed! Route should be deployable."
echo ""
echo "📋 Next steps for Vercel:"
echo "   1. Clear build cache in Vercel dashboard"
echo "   2. Trigger a new deployment"
echo "   3. Check Functions tab to verify /api/reviews appears"
