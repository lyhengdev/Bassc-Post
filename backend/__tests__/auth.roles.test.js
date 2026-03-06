import { jest } from '@jest/globals';

jest.unstable_mockModule('../src/utils/jwt.js', () => ({
  verifyAccessToken: jest.fn(),
}));

jest.unstable_mockModule('../src/models/index.js', () => ({
  User: {
    findById: jest.fn(),
  },
}));

let authorize;

beforeAll(async () => {
  ({ authorize } = await import('../src/middleware/auth.js'));
});

const createMockRes = () => {
  const res = {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.payload = body;
      return this;
    },
  };
  return res;
};

describe('role access middleware', () => {
  it('allows user with matching role', () => {
    const middleware = authorize('translator');
    const req = { user: { role: 'translator' } };
    const res = createMockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
    expect(res.payload).toBeNull();
  });

  it('blocks user with non-matching role', () => {
    const middleware = authorize('admin');
    const req = { user: { role: 'translator' } };
    const res = createMockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.payload).toEqual(expect.objectContaining({ success: false }));
  });

  it('returns 401 when user is missing', () => {
    const middleware = authorize('editor');
    const req = {};
    const res = createMockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.payload).toEqual(expect.objectContaining({ success: false }));
  });
});
