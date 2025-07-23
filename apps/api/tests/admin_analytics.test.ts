import request from 'supertest';
import app from '../src/index';

describe('/api/admin/analytics/usage', () => {
  it('should reject unauthenticated requests', async () => {
    const res = await request(app).get('/api/admin/analytics/usage');
    expect(res.status).toBe(401);
  });
  it('should reject non-admin users', async () => {
    // TODO: Mock non-admin auth
    // const token = await getTestUserToken({ isAdmin: false });
    // const res = await request(app)
    //   .get('/api/admin/analytics/usage')
    //   .set('Authorization', `Bearer ${token}`);
    // expect(res.status).toBe(403);
  });
  it('should allow admin users to fetch usage analytics', async () => {
    // TODO: Mock admin auth
    // const token = await getTestUserToken({ isAdmin: true });
    // const res = await request(app)
    //   .get('/api/admin/analytics/usage')
    //   .set('Authorization', `Bearer ${token}`);
    // expect(res.status).toBe(200);
    // expect(res.body).toHaveProperty('totalUsers');
  });
});

describe('/api/admin/analytics/business', () => {
  it('should reject unauthenticated requests', async () => {
    const res = await request(app).get('/api/admin/analytics/business');
    expect(res.status).toBe(401);
  });
  it('should reject non-admin users', async () => {
    // TODO: Mock non-admin auth
    // const token = await getTestUserToken({ isAdmin: false });
    // const res = await request(app)
    //   .get('/api/admin/analytics/business')
    //   .set('Authorization', `Bearer ${token}`);
    // expect(res.status).toBe(403);
  });
  it('should allow admin users to fetch business analytics', async () => {
    // TODO: Mock admin auth
    // const token = await getTestUserToken({ isAdmin: true });
    // const res = await request(app)
    //   .get('/api/admin/analytics/business')
    //   .set('Authorization', `Bearer ${token}`);
    // expect(res.status).toBe(200);
    // expect(res.body).toHaveProperty('revenue');
  });
});
