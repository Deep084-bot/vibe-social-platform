const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const express = require('express');
const path = require('path');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

test('upload avatar and update profile (integration)', async () => {
  // require routers after mongoose connection
  const authRouter = require('../backend/routes/auth');
  const uploadsRouter = require('../backend/routes/uploads');
  const usersRouter = require('../backend/routes/users');

  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  app.use('/api/uploads', uploadsRouter);
  app.use('/api/users', usersRouter);

  // register
  const regRes = await request(app).post('/api/auth/register').send({
    username: 'itestuser',
    email: 'itest@example.com',
    password: 'password123',
    displayName: 'Integration Tester'
  });
  expect(regRes.status).toBe(201);
  const token = regRes.body.token;
  expect(token).toBeDefined();

  // tiny 1x1 png (base64)
  const onePx = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=', 'base64');

  // upload avatar
  const upRes = await request(app)
    .post('/api/uploads')
    .set('Authorization', 'Bearer ' + token)
    .attach('avatar', onePx, 'avatar.png');

  expect(upRes.status).toBe(200);
  expect(upRes.body).toBeDefined();
  expect(upRes.body.success).toBe(true);
  expect(upRes.body.files).toBeDefined();
  expect(upRes.body.files.avatar).toBeDefined();

  const avatarUrl = upRes.body.files.avatar;

  // update profile to use new avatar
  const updRes = await request(app)
    .put('/api/users/me')
    .set('Authorization', 'Bearer ' + token)
    .send({ displayName: 'Updated Name', avatar: avatarUrl });

  expect(updRes.status).toBe(200);
  expect(updRes.body.success).toBe(true);
  expect(updRes.body.user).toBeDefined();
  expect(updRes.body.user.profile.avatar).toBe(avatarUrl);
});
