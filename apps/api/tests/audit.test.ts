import request from 'supertest';
import app from '../src/index'; // Adjust import if needed

describe('/api/audit', () => {
  it('should reject unauthenticated requests', async () => {
    const res = await request(app)
      .post('/api/audit')
      .send({ projectId: 'fake', url: 'https://example.com' });
    expect(res.status).toBe(401);
  });

  it('should enforce quota and create audit for authenticated user', async () => {
    // TODO: Mock auth, seed user/project, and test quota logic
    // const token = await getTestUserToken();
    // const res = await request(app)
    //   .post('/api/audit')
    //   .set('Authorization', `Bearer ${token}`)
    //   .send({ projectId, url: 'https://example.com' });
    // expect(res.status).toBe(202);
  });
});
