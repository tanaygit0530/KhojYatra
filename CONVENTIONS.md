# KhojYatra — Global Architecture & API Conventions

This document specifies the cross-cutting architecture and API conventions for the entire KhojYatra codebase. Every feature, service, route, and UI component must strictly adhere to these conventions.

---

## 1. Environment & Secrets Catalog

All environment variables must be defined in `.env.example` at the repo root and loaded via typed configuration (`backend/src/config/env.ts`). Real secret values must never be committed.

| Variable | Scope | Description | Fallback Behavior if Unset |
|---|---|---|---|
| `SUPABASE_URL` | Frontend & Backend | Supabase Project URL | Local mock / demo mode active |
| `SUPABASE_ANON_KEY` | Frontend & Backend | Frontend-safe Supabase public key | Mock authentication & public read fallback |
| `SUPABASE_SERVICE_ROLE_KEY` | **Backend ONLY** | Elevated DB admin key (**Never expose to client**) | Throws warning; operations fall back to mock service layer |
| `PORT` | Backend | HTTP port (default `4000`) | Defaults to `4000` |
| `JWT_ISSUER` | Backend | JWT issuer identifier (default `supabase`) | Defaults to `supabase` |
| `ANTHROPIC_API_KEY` | Backend | Claude API key for natural language intake/explanations | Falls back to deterministic rule-based intake & explanations |
| `WEATHER_API_KEY` | Backend | Real-time weather data API | Falls back to UI manual condition toggle ("clear" \| "rain" \| "extreme") |
| `MAPS_API_KEY` | Frontend & Backend | Map tiles & geocoding | Falls back to Haversine distance & Leaflet/OSM |
| `WHATSAPP_BUSINESS_TOKEN` | Backend | WhatsApp Business Cloud API webhook token | Accepts direct sample audio uploads in demo mode |
| `SARVAM_API_KEY` | Backend | Indian language speech-to-text API | Falls back to mock speech-to-text transcript parser |
| `RAPIDAPI_KEY` | Backend | External social/travel data integrations | Falls back to staged social seeds |

---

## 2. API Conventions

Every endpoint across all backend routes must adhere to the following rules:

### 2.1 Base Path
All endpoints must be prefixed with:
```
/api/v1/...
```

### 2.2 Authentication & Identity
- Authenticated requests pass a Supabase JWT in the standard header:
  ```http
  Authorization: Bearer <supabase_jwt>
  ```
- Anonymous traveler requests send a persistent UUID session identifier:
  ```http
  X-Session-Id: <uuid>
  ```
- The backend accepts **either** credential. If both are supplied, the authenticated user ID takes precedence, while the session ID is preserved for session history linking.

### 2.3 Response Envelope
All successful API responses must strictly follow the standard success envelope:
```json
{
  "data": { ... },
  "meta": {
    "page": 1,
    "total": 10
  }
}
```
(`meta` is optional for scalar/single entity responses).

### 2.4 Error Envelope
All error responses must strictly follow this exact JSON shape and use only the standardized error codes:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable error description",
    "details": { ... }
  }
}
```

#### Standard Error Codes & Status Mappings:
| Error Code | HTTP Status | Description |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Request payload failed Zod schema validation |
| `NOT_FOUND` | 404 | Requested entity or route was not found |
| `FORBIDDEN` | 403 | Insufficient permissions or role mismatch |
| `CONFLICT` | 409 | Resource state collision (e.g. slot capacity depleted, scheduling overlap) |
| `UPSTREAM_UNAVAILABLE` | 502 | Third-party service (Supabase, Weather, Anthropic) failed or timed out |
| `INTERNAL` | 500 | Unhandled internal server error |

### 2.5 Validation with Zod
- Every request body, query parameter set, and response payload must be validated against shared schemas located in `shared/types`.
- Frontend and backend import the exact same TypeScript types and Zod schemas without duplication.

---

## 3. Anonymous Session Handling Specification

KhojYatra allows travelers to immediately search, filter, adjust constraints, and build draft itineraries without logging in:

1. **Client Generation**:
   - On first app visit, `frontend/src/store/sessionStore.ts` checks `localStorage.getItem('khojyatra_session_id')`.
   - If missing, a random UUIDv4 is generated and persisted to `localStorage` as `khojyatra_session_id`.
2. **Header Injection**:
   - The frontend HTTP client (`frontend/src/lib/apiClient.ts`) automatically injects `X-Session-Id: <uuid>` on every outgoing fetch request.
3. **Backend Session Lifecycle**:
   - The backend session middleware checks `sessions` table for the incoming `X-Session-Id`.
   - If absent, an anonymous record is created: `{ id: session_id, user_id: null, constraint_json: {} }`.
4. **Account Linking on Sign-In**:
   - When an anonymous user signs up or logs in (`/auth`), the backend triggers an account link:
     ```sql
     UPDATE sessions SET user_id = :new_user_id WHERE id = :session_id;
     ```
   - All searches, draft itineraries, and recommendation events associated with the anonymous session remain seamlessly attached to the newly authenticated traveler profile.

---

## 4. Security & Isolation Rules

- **Zero Service-Role Leaks**: The `SUPABASE_SERVICE_ROLE_KEY` must only ever be imported in `backend/src/db/supabaseClient.ts`. No package under `frontend/` may ever reference or import this key.
- **Client Storage**: Only the Supabase anon key (`VITE_SUPABASE_ANON_KEY`) is permitted in frontend bundles.
- **Strict Row-Level Security**: Direct client-side queries to Supabase must adhere to RLS policies. The backend service-role client is strictly reserved for administrative tasks, seed scripts, and verified transaction reconciliations.
