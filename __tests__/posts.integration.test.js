const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const express = require('express');

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

test('GET /api/posts returns posts (integration)', async () => {
  // require models after mongoose connection is established
  const User = require('../backend/models/User');
  const Post = require('../backend/models/Post');

  // create a user and a post
  const user = new User({
    username: 'testuser',
    email: 'test@example.com',
    password: 'password',
    profile: { displayName: 'Test User' }
  });
  await user.save();

  const post = new Post({
    author: user._id,
    content: { text: 'Hello from integration test' }
  });
  await post.save();

  // mount posts router on an express app
  const postsRouter = require('../backend/routes/posts');
  const app = express();
  app.use(express.json());
  app.use('/api/posts', postsRouter);

  const res = await request(app).get('/api/posts');
  expect(res.status).toBe(200);
  expect(res.body).toBeDefined();
  expect(Array.isArray(res.body.posts)).toBe(true);
  expect(res.body.posts.length).toBeGreaterThanOrEqual(1);
  const p = res.body.posts.find(x => x._id === post._id.toString());
  expect(p).toBeDefined();
  expect(p.content.text).toBe('Hello from integration test');
});
