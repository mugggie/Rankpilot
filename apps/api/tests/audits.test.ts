import request from 'supertest';
import app from '../src/index';

describe('/api/audits', () => {
  it('should reject unauthenticated requests', async () => {
    const res = await request(app).get('/api/audits');
    expect(res.status).toBe(401);
  });

  it('should return paginated audits for authenticated user', async () => {
    // TODO: Mock auth, seed user/audits, and test paginated retrieval
    // const token = await getTestUserToken();
    // const res = await request(app)
    //   .get('/api/audits?page=1&pageSize=5')
    //   .set('Authorization', `Bearer ${token}`);
    // expect(res.status).toBe(200);
    // expect(res.body).toHaveProperty('audits');
  });
});
