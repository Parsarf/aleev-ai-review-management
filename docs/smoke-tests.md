# Aleev Smoke Tests

This document outlines the critical smoke tests to verify the application is working correctly after deployment or major changes.

## Prerequisites

1. Application is deployed and accessible
2. Database is seeded with sample data
3. Environment variables are properly configured
4. External services (OpenAI, Stripe, Google) are accessible

## Test Execution

Run these tests in order to verify core functionality:

### 1. Health Check

**Endpoint**: `GET /api/healthz`

**Expected Response**:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "database": "connected"
}
```

**Status**: ✅ PASS / ❌ FAIL

---

### 2. Authentication Flow

#### 2.1 Sign In Page Loads
- Navigate to `/auth/signin`
- Verify page loads without errors
- Verify "Continue with Google" button is present

**Status**: ✅ PASS / ❌ FAIL

#### 2.2 Google OAuth (if configured)
- Click "Continue with Google"
- Complete OAuth flow
- Verify redirect to `/inbox`

**Status**: ✅ PASS / ❌ FAIL

---

### 3. Dashboard Access

#### 3.1 Inbox Page
- Navigate to `/inbox`
- Verify page loads with filters and review list
- Verify no JavaScript errors in console

**Status**: ✅ PASS / ❌ FAIL

#### 3.2 Analytics Page
- Navigate to `/analytics`
- Verify charts and KPIs load
- Verify no data errors

**Status**: ✅ PASS / ❌ FAIL

#### 3.3 Settings Page
- Navigate to `/settings`
- Verify business information loads
- Verify form elements are present

**Status**: ✅ PASS / ❌ FAIL

#### 3.4 Billing Page
- Navigate to `/billing`
- Verify subscription information displays
- Verify plan selection works

**Status**: ✅ PASS / ❌ FAIL

---

### 4. API Endpoints

#### 4.1 Reviews API
```bash
curl -X GET "https://your-domain.com/api/reviews" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected**: Returns list of reviews with pagination

**Status**: ✅ PASS / ❌ FAIL

#### 4.2 Analytics API
```bash
curl -X GET "https://your-domain.com/api/analytics?days=30" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected**: Returns analytics data with KPIs and trends

**Status**: ✅ PASS / ❌ FAIL

#### 4.3 Settings API
```bash
curl -X GET "https://your-domain.com/api/settings" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected**: Returns business settings and locations

**Status**: ✅ PASS / ❌ FAIL

---

### 5. AI Functionality

#### 5.1 Reply Generation
```bash
curl -X POST "https://your-domain.com/api/replies" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "action": "generate",
    "reviewId": "review-1",
    "tone": "professional"
  }'
```

**Expected**: Returns AI-generated reply with proper formatting

**Status**: ✅ PASS / ❌ FAIL

#### 5.2 Crisis Detection
Test with review containing crisis keywords:
```json
{
  "action": "generate",
  "reviewId": "review-3",
  "tone": "professional"
}
```

**Expected**: Returns reply with `isCrisis: true`

**Status**: ✅ PASS / ❌ FAIL

---

### 6. Database Operations

#### 6.1 Review Creation
```bash
curl -X POST "https://your-domain.com/api/reviews" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "locationId": "location-1",
    "platform": "GOOGLE",
    "platformId": "test-review-123",
    "stars": 4,
    "text": "Great service!",
    "authorName": "Test User"
  }'
```

**Expected**: Review created successfully

**Status**: ✅ PASS / ❌ FAIL

#### 6.2 Data Persistence
- Create a review
- Refresh the page
- Verify review appears in the list

**Status**: ✅ PASS / ❌ FAIL

---

### 7. External Integrations

#### 7.1 Stripe Integration (if configured)
- Navigate to billing page
- Click "Choose Plan"
- Verify Stripe checkout loads

**Status**: ✅ PASS / ❌ FAIL

#### 7.2 Google Integration (if configured)
- Navigate to settings > integrations
- Click "Connect" for Google
- Verify OAuth flow initiates

**Status**: ✅ PASS / ❌ FAIL

---

### 8. Error Handling

#### 8.1 Invalid API Requests
```bash
curl -X POST "https://your-domain.com/api/replies" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"invalid": "data"}'
```

**Expected**: Returns 400 Bad Request with validation errors

**Status**: ✅ PASS / ❌ FAIL

#### 8.2 Unauthorized Access
```bash
curl -X GET "https://your-domain.com/api/reviews"
```

**Expected**: Returns 401 Unauthorized

**Status**: ✅ PASS / ❌ FAIL

---

### 9. Performance Tests

#### 9.1 Page Load Times
- Inbox page: < 3 seconds
- Analytics page: < 5 seconds
- Settings page: < 2 seconds

**Status**: ✅ PASS / ❌ FAIL

#### 9.2 API Response Times
- Reviews API: < 1 second
- Analytics API: < 2 seconds
- Settings API: < 1 second

**Status**: ✅ PASS / ❌ FAIL

---

### 10. Security Tests

#### 10.1 Rate Limiting
- Make multiple rapid API requests
- Verify rate limiting kicks in after threshold

**Status**: ✅ PASS / ❌ FAIL

#### 10.2 Input Validation
- Submit malformed data to API endpoints
- Verify proper validation and error messages

**Status**: ✅ PASS / ❌ FAIL

---

## Test Results Summary

| Test Category | Status | Notes |
|---------------|--------|-------|
| Health Check | ⬜ | |
| Authentication | ⬜ | |
| Dashboard Access | ⬜ | |
| API Endpoints | ⬜ | |
| AI Functionality | ⬜ | |
| Database Operations | ⬜ | |
| External Integrations | ⬜ | |
| Error Handling | ⬜ | |
| Performance | ⬜ | |
| Security | ⬜ | |

**Overall Status**: ⬜ PASS / ⬜ FAIL

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check DATABASE_URL environment variable
   - Verify database is running and accessible
   - Run migrations: `npm run db:migrate`

2. **Authentication Issues**
   - Verify NEXTAUTH_SECRET is set
   - Check Google OAuth credentials
   - Ensure NEXTAUTH_URL matches deployment URL

3. **API Errors**
   - Check OpenAI API key
   - Verify Stripe credentials
   - Check rate limiting configuration

4. **Frontend Issues**
   - Check browser console for JavaScript errors
   - Verify all environment variables are set
   - Check network requests in DevTools

### Quick Fixes

```bash
# Reset database
npm run db:reset

# Check environment variables
npm run type-check

# Run tests
npm test

# Check build
npm run build
```

## Contact

If smoke tests fail, contact the development team with:
- Test results
- Error messages
- Browser console logs
- Server logs
- Environment details
