import test from 'node:test';
import assert from 'node:assert/strict';
import { requireAdmin, requireRole } from '../src/middleware/authRoleMiddleware.js';
import { SlidingWindowRateLimiter } from '../src/middleware/rateLimiter.js';
import { reportService } from '../src/services/reportService.js';
import { store } from '../src/data/store.js';

function createMockContext({
  userRole,
  userId,
  headers = {},
  ip = '127.0.0.1'
}: {
  userRole?: string;
  userId?: string;
  headers?: Record<string, string>;
  ip?: string;
} = {}) {
  let statusCode = 200;
  let responseData: any = null;
  const resHeaders: Record<string, string> = {};

  const req: any = {
    headers: { ...headers },
    ip,
    khojContext: {
      userRole,
      userId,
      isAnonymous: !userId
    }
  };

  const res: any = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(data: any) {
      responseData = data;
      return res;
    },
    setHeader(name: string, value: string) {
      resHeaders[name.toLowerCase()] = value;
    }
  };

  return {
    req,
    res,
    getStatus: () => statusCode,
    getData: () => responseData,
    getHeader: (name: string) => resHeaders[name.toLowerCase()]
  };
}

test('Phase 29 — Security & RLS Audit Pass', async (t) => {
  await t.test('1. Role authorization: Unauthenticated request to requireAdmin returns 401', () => {
    const { req, res, getStatus, getData } = createMockContext();
    let nextCalled = false;

    requireAdmin(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, false, 'next() should not be called');
    assert.equal(getStatus(), 401, 'Unauthenticated access should return 401');
    assert.equal(getData().error.code, 'UNAUTHORIZED');
  });

  await t.test('2. Role authorization: Traveler role accessing admin-protected resource returns 403 Forbidden', () => {
    const { req, res, getStatus, getData } = createMockContext({
      userRole: 'traveler',
      userId: 'traveler-user-123'
    });
    let nextCalled = false;

    requireAdmin(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, false);
    assert.equal(getStatus(), 403, 'Traveler attempting admin action should return 403');
    assert.equal(getData().error.code, 'FORBIDDEN');
  });

  await t.test('3. Role authorization: Admin role succeeds and invokes next()', () => {
    const { req, res } = createMockContext({
      userRole: 'admin',
      userId: 'admin-user-001'
    });
    let nextCalled = false;

    requireAdmin(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, true, 'Authorized admin must successfully pass to next()');
  });

  await t.test('4. Role authorization: Provider role passes requireProvider but is blocked by requireAdmin', () => {
    const { req, res, getStatus, getData } = createMockContext({
      userRole: 'provider',
      userId: 'provider-001'
    });

    let adminNextCalled = false;
    requireAdmin(req, res, () => { adminNextCalled = true; });
    assert.equal(adminNextCalled, false);
    assert.equal(getStatus(), 403);
    assert.equal(getData().error.code, 'FORBIDDEN');

    let providerNextCalled = false;
    const requireProv = requireRole(['provider', 'admin']);
    requireProv(req, res, () => { providerNextCalled = true; });
    assert.equal(providerNextCalled, true, 'Provider role should pass requireProvider');
  });

  await t.test('5. Sliding-Window Rate Limiter: Blocks requests exceeding threshold with 429', () => {
    const testLimiter = new SlidingWindowRateLimiter({
      windowMs: 5000,
      maxRequests: 3,
      message: 'Rate limit exceeded'
    });

    const mockCtx = createMockContext({ ip: '192.168.1.50' });

    // Request 1: allowed
    let next1 = false;
    testLimiter.middleware(mockCtx.req, mockCtx.res, () => { next1 = true; });
    assert.equal(next1, true, 'Req 1 within limit');

    // Request 2: allowed
    let next2 = false;
    testLimiter.middleware(mockCtx.req, mockCtx.res, () => { next2 = true; });
    assert.equal(next2, true, 'Req 2 within limit');

    // Request 3: allowed
    let next3 = false;
    testLimiter.middleware(mockCtx.req, mockCtx.res, () => { next3 = true; });
    assert.equal(next3, true, 'Req 3 within limit');

    // Request 4: blocked with 429
    let next4 = false;
    testLimiter.middleware(mockCtx.req, mockCtx.res, () => { next4 = true; });
    assert.equal(next4, false, 'Req 4 must be blocked');
    assert.equal(mockCtx.getStatus(), 429, 'Blocked request must return 429');
    assert.equal(mockCtx.getData().error.code, 'RATE_LIMIT_EXCEEDED');
    assert.ok(mockCtx.getHeader('retry-after'), 'Must include Retry-After header');
  });

  await t.test('6. Input Validation & Moderation: Validates report reason and unpublishes listing upon action', () => {
    const exp = store.experiences[0];
    const initialStatus = exp.offering_status;

    // Create report
    const report = reportService.createReport({
      experience_id: exp.id,
      reporter_session_id: 'test-reporter-session',
      reason: 'fraud',
      details: 'Counterfeit tour guide pretending to be heritage master.'
    });

    assert.ok(report.id.startsWith('rep-'));
    assert.equal(report.status, 'pending');

    // Admin resolves with unpublish
    const resolved = reportService.resolveReport(report.id, 'unpublish');
    assert.equal(resolved.status, 'resolved');

    // Verify experience is now unpublished (status = draft)
    const updatedExp = store.experiences.find(e => e.id === exp.id);
    assert.equal(updatedExp?.offering_status, 'draft', 'Experience must be unpublished upon confirmed report resolution');

    // Restore experience status for other tests
    if (updatedExp) updatedExp.offering_status = initialStatus;
  });
});
