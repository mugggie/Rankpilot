import request from 'supertest';
import app from '../src/index';

describe('/api/audit/:id', () => {
  it('should reject unauthenticated requests', async () => {
    const res = await request(app).get('/api/audit/fakeid');
    expect(res.status).toBe(401);
  });

  it('should return audit details for authenticated user', async () => {
    // TODO: Mock auth, seed user/audit, and test detail retrieval
    // const token = await getTestUserToken();
    // const res = await request(app)
    //   .get('/api/audit/realid')
    //   .set('Authorization', `Bearer ${token}`);
    // expect(res.status).toBe(200);
    // expect(res.body).toHaveProperty('id');
  });
});
