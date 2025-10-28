const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

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

test('like toggle and comment creation flow', async () => {
  const User = require('../backend/models/User');
  const Post = require('../backend/models/Post');

  // create user and sign token
  const user = new User({ username: 'liker', email: 'liker@example.com', password: 'password', profile: { displayName: 'Liker' } });
  await user.save();
  const token = jwt.sign({ userId: user._id.toString(), username: user.username }, process.env.JWT_SECRET || 'genz_social_secret_key_2024');

  // create a post by another user
  const other = new User({ username: 'author', email: 'author@example.com', password: 'password', profile: { displayName: 'Author' } });
  await other.save();
  const post = new Post({ author: other._id, content: { text: 'A post to like' } });
  await post.save();

  // mount app
  const postsRouter = require('../backend/routes/posts');
  const commentsRouter = require('../backend/routes/comments');
  const app = express();
  app.use(express.json());
  app.use('/api/posts', postsRouter);
  app.use('/api/comments', commentsRouter);

  // toggle like (should like)
  const likeRes1 = await request(app).post(`/api/posts/${post._id}/like`).set('Authorization', 'Bearer ' + token);
  expect(likeRes1.status).toBe(200);
  expect(likeRes1.body.success).toBe(true);
  expect(likeRes1.body.liked).toBe(true);
  expect(likeRes1.body.likesCount).toBe(1);

  // toggle like again (unlike)
  const likeRes2 = await request(app).post(`/api/posts/${post._id}/like`).set('Authorization', 'Bearer ' + token);
  expect(likeRes2.status).toBe(200);
  expect(likeRes2.body.success).toBe(true);
  expect(likeRes2.body.liked).toBe(false);
  expect(likeRes2.body.likesCount).toBe(0);

  // create a comment
  const commentRes = await request(app).post(`/api/posts/${post._id}/comments`).set('Authorization', 'Bearer ' + token).send({ text: 'Nice post!' });
  expect(commentRes.status).toBe(201);
  expect(commentRes.body.success).toBe(true);
  expect(commentRes.body.comment).toBeDefined();
  expect(commentRes.body.comment.content.text).toBe('Nice post!');

  // fetch comments
  const listRes = await request(app).get(`/api/posts/${post._id}/comments`);
  expect(listRes.status).toBe(200);
  expect(listRes.body.comments.length).toBeGreaterThanOrEqual(1);
  const c = listRes.body.comments.find(x => x._id === commentRes.body.comment._id);
  expect(c).toBeDefined();
  expect(c.content.text).toBe('Nice post!');
});
