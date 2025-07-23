import request from 'supertest';
import app from '../src/index';

describe('/api/tier', () => {
  it('should reject unauthenticated requests', async () => {
    const res = await request(app).get('/api/tier');
    expect(res.status).toBe(401);
  });

  it('should return quota info for authenticated user', async () => {
    // TODO: Mock auth, seed user, and test quota retrieval
    // const token = await getTestUserToken();
    // const res = await request(app)
    //   .get('/api/tier')
    //   .set('Authorization', `Bearer ${token}`);
    // expect(res.status).toBe(200);
    // expect(res.body).toHaveProperty('tier');
  });
});
