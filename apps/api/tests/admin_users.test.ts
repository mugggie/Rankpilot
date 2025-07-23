import request from 'supertest';
import app from '../src/index';

describe('/api/admin/users', () => {
  it('should reject unauthenticated requests', async () => {
    const res = await request(app).get('/api/admin/users');
    expect(res.status).toBe(401);
  });

  it('should reject non-admin users', async () => {
    // TODO: Mock non-admin auth
    // const token = await getTestUserToken({ isAdmin: false });
    // const res = await request(app)
    //   .get('/api/admin/users')
    //   .set('Authorization', `Bearer ${token}`);
    // expect(res.status).toBe(403);
  });

  it('should allow admin users to fetch user list', async () => {
    // TODO: Mock admin auth
    // const token = await getTestUserToken({ isAdmin: true });
    // const res = await request(app)
    //   .get('/api/admin/users')
    //   .set('Authorization', `Bearer ${token}`);
    // expect(res.status).toBe(200);
    // expect(res.body).toHaveProperty('users');
  });
});
