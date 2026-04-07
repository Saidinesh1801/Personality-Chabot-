const request = require('supertest');
const express = require('express');

describe('API Integration Tests', () => {
  let app;
  let token;

  beforeAll(() => {
    app = require('../server.js');
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('llmAvailable');
    });
  });

  describe('POST /api/auth/signup', () => {
    it('should create a new user', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ email: 'test' + Date.now() + '@example.com', password: 'test123' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      token = res.body.token;
    });

    it('should reject invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ email: 'invalid', password: 'test123' });
      expect(res.status).toBe(400);
    });

    it('should reject short password', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ email: 'test@example.com', password: '123' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    let loginToken;

    it('should login with valid credentials', async () => {
      await request(app)
        .post('/api/auth/signup')
        .send({ email: 'logintest@example.com', password: 'test123' });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'logintest@example.com', password: 'test123' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      loginToken = res.body.token;
    });

    it('should reject invalid password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'logintest@example.com', password: 'wrongpassword' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/chats', () => {
    it('should return empty array for new user', async () => {
      const res = await request(app)
        .get('/api/chats')
        .set('Authorization', 'Bearer ' + token);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('chats');
      expect(Array.isArray(res.body.chats)).toBe(true);
    });

    it('should require auth', async () => {
      const res = await request(app).get('/api/chats');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/chats', () => {
    it('should create a new chat', async () => {
      const res = await request(app)
        .post('/api/chats')
        .set('Authorization', 'Bearer ' + token)
        .send({ id: 'test-chat-1', title: 'Test Chat' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });

    it('should require chat id', async () => {
      const res = await request(app)
        .post('/api/chats')
        .set('Authorization', 'Bearer ' + token)
        .send({ title: 'Test' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/chats/:id', () => {
    it('should return chat by id', async () => {
      const res = await request(app)
        .get('/api/chats/test-chat-1')
        .set('Authorization', 'Bearer ' + token);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('chat');
    });

    it('should return 404 for non-existent chat', async () => {
      const res = await request(app)
        .get('/api/chats/non-existent')
        .set('Authorization', 'Bearer ' + token);
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/chat', () => {
    it('should reject empty message', async () => {
      const res = await request(app)
        .post('/api/chat')
        .set('Authorization', 'Bearer ' + token)
        .send({ message: '' });
      expect(res.status).toBe(400);
    });

    it('should reject missing message', async () => {
      const res = await request(app)
        .post('/api/chat')
        .set('Authorization', 'Bearer ' + token)
        .send({});
      expect(res.status).toBe(400);
    });

    it('should accept valid message', async () => {
      const res = await request(app)
        .post('/api/chat')
        .set('Authorization', 'Bearer ' + token)
        .send({ message: 'Hello' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('reply');
    });
  });

  describe('GET /api/plugins', () => {
    it('should return list of plugins', async () => {
      const res = await request(app)
        .get('/api/plugins')
        .set('Authorization', 'Bearer ' + token);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('plugins');
    });
  });

  describe('GET /api/teams', () => {
    it('should return empty teams for new user', async () => {
      const res = await request(app)
        .get('/api/teams')
        .set('Authorization', 'Bearer ' + token);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('teams');
    });
  });

  describe('DELETE /api/chats/:id', () => {
    it('should delete a chat', async () => {
      const res = await request(app)
        .delete('/api/chats/test-chat-1')
        .set('Authorization', 'Bearer ' + token);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });
  });
});
