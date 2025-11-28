# ⚠️ AUTHENTICATION BYPASS MODE - CRITICAL WARNING ⚠️

> **Status:** BYPASS MODE IS CURRENTLY **ENABLED**  
> **Last Updated:** November 2025  
> **Author:** Development Team

---

## 🚨 DO NOT DEPLOY TO PRODUCTION WITH BYPASS ENABLED 🚨

Authentication bypass mode is currently **ENABLED** in both the frontend portal and backend API. This completely disables all authentication checks and grants admin access to everyone.

### Why Bypass Mode Exists

Due to cross-origin cookie issues between:
- **Portal (Dev):** `http://localhost:5173`
- **Backend (Prod):** `https://hanzimaster-backend-v2.isak-parild.workers.dev`

Better Auth's cookie-based authentication cannot work across different origins in development. As a temporary workaround, auth is bypassed.

---

## 📍 Files That Need Changing Before Production

### 1. Backend Auth Middleware
**File:** `hanzimaster-backend-v2/src/middleware/auth.ts`

```typescript
// ⚠️ CHANGE THIS TO FALSE:
const AUTH_BYPASS_MODE = true;  // ← CHANGE TO false
```

### 2. Portal Auth Context
**File:** `hanzimaster-portal-v2/src/contexts/AuthContext.tsx`

```typescript
// ⚠️ CHANGE THIS TO FALSE:
const BYPASS_MODE = true;  // ← CHANGE TO false
```

### 3. Portal API Context
**File:** `hanzimaster-portal-v2/src/contexts/APIContext.tsx`

```typescript
// ⚠️ CHANGE THIS TO FALSE:
const BYPASS_MODE = true;  // ← CHANGE TO false
```

### 4. Portal API Service
**File:** `hanzimaster-portal-v2/src/services/api.ts`

```typescript
// ⚠️ CHANGE THIS TO FALSE:
const BYPASS_MODE = true;  // ← CHANGE TO false
```

---

## ✅ Production Checklist

Before deploying to production, verify:

- [ ] `AUTH_BYPASS_MODE = false` in `backend/src/middleware/auth.ts`
- [ ] `BYPASS_MODE = false` in `portal/src/contexts/AuthContext.tsx`
- [ ] `BYPASS_MODE = false` in `portal/src/contexts/APIContext.tsx`
- [ ] `BYPASS_MODE = false` in `portal/src/services/api.ts`
- [ ] Better Auth is properly configured with CORS
- [ ] Environment variables are set:
  - `CLERK_JWKS_URL` (if using Clerk)
  - `CLERK_JWT_ISSUER` (if using Clerk)
  - `JWT_SECRET` (for legacy auth)
  - `ALLOWED_ORIGINS` includes production portal URL
- [ ] Run full auth flow test (sign up, sign in, sign out)

---

## 🔧 Proper Fix Options

### Option 1: Same-Origin Deployment
Deploy portal and backend on same domain:
- `api.hanzimaster.com` → Backend
- `portal.hanzimaster.com` → Portal (same root domain)

### Option 2: Token-Based Auth (No Cookies)
Switch from cookie-based to header-based JWT auth:
- Frontend stores JWT in memory/localStorage
- Frontend sends JWT in `Authorization: Bearer <token>` header
- Works across any origins

### Option 3: Local Backend for Development
Run backend locally when developing portal:
```bash
cd hanzimaster-backend-v2
pnpm dev  # Runs on localhost:8787
```

Then set portal's `VITE_API_URL=http://localhost:8787`

---

## 🔴 Security Impact of Bypass Mode

When bypass is enabled:

| Risk | Impact |
|------|--------|
| **No Authentication** | Anyone can access all endpoints |
| **Admin Access** | All requests treated as admin |
| **Data Exposure** | All user data readable |
| **Data Modification** | Anyone can create/edit/delete content |
| **Cost Exposure** | ElevenLabs/OpenAI APIs can be abused |

---

## 📞 Emergency Rollback

If bypass mode was accidentally deployed to production:

1. **Immediately** set `AUTH_BYPASS_MODE = false` in backend
2. Deploy: `npx wrangler deploy`
3. Verify auth is working
4. Audit logs for unauthorized access
5. Rotate any exposed API keys

---

## Related Files

- `hanzimaster-backend-v2/src/middleware/auth.ts` - Backend auth
- `hanzimaster-portal-v2/src/contexts/AuthContext.tsx` - Portal auth state
- `hanzimaster-portal-v2/src/contexts/APIContext.tsx` - Portal API client
- `hanzimaster-portal-v2/src/services/api.ts` - Portal API singleton
- `hanzimaster-portal-v2/src/lib/auth-client.ts` - Better Auth client config

