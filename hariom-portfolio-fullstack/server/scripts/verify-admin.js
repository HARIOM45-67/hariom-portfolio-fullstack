import 'dotenv/config';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import Admin from '../src/models/Admin.js';
import app from '../src/app.js';
import { authCookieName } from '../src/middleware/auth.js';

async function verifyAdmin() {
  const email = process.env.VERIFY_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.VERIFY_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('input validation: hidden email and password are required.');
  }

  const origin = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',')[0].trim();
  let stage = 'MongoDB connection';

  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
    console.log('PASS | MongoDB connection verified.');

    stage = 'admin lookup';
    const admin = await Admin.findOne({ email }).select('+password');
    if (!admin) {
      throw new Error('No admin record matches the entered email.');
    }
    console.log('PASS | Existing admin record found.');

    stage = 'bcrypt comparison';
    if (!(await admin.verifyPassword(password))) {
      throw new Error('Password did not match the stored bcrypt hash.');
    }
    console.log('PASS | Bcrypt password comparison verified.');

    stage = 'admin login';
    const agent = request.agent(app);
    const login = await agent
      .post('/api/auth/login')
      .set('Origin', origin)
      .send({ email, password });
    if (login.status !== 200) throw new Error(`Admin login returned HTTP ${login.status}.`);
    console.log('PASS | Admin login succeeded.');

    stage = 'session cookie';
    const sessionCookie = login.headers['set-cookie']
      ?.map(value => value.split(';')[0])
      .find(value => value.startsWith(`${authCookieName}=`));
    if (!sessionCookie) throw new Error('Admin login did not return a session cookie.');

    stage = 'JWT verification';
    const token = sessionCookie.slice(authCookieName.length + 1);
    let claims;
    try {
      claims = jwt.verify(token, process.env.JWT_SECRET, {
        algorithms: ['HS256'],
        issuer: ['hariom-potofolio', 'hariom-portfolio']
      });
    } catch (error) {
      throw new Error(`JWT signature or issuer validation failed (${error.name}).`);
    }
    if (claims.sub !== admin.id || claims.ver !== admin.tokenVersion) {
      throw new Error('JWT claims do not match the existing admin record.');
    }
    console.log('PASS | JWT signature, issuer, subject, and version verified.');

    for (const path of ['/api/auth/me', '/api/queries', '/api/analytics/summary']) {
      stage = `protected route ${path}`;
      const response = await agent.get(path);
      if (response.status !== 200) throw new Error(`Protected API ${path} returned HTTP ${response.status}.`);
      console.log(`PASS | Protected API ${path} returned HTTP 200.`);
    }

    stage = 'logout';
    const logout = await agent.post('/api/auth/logout').set('Origin', origin);
    if (logout.status !== 204) throw new Error(`Admin logout returned HTTP ${logout.status}.`);
    const revoked = await agent.get('/api/auth/me');
    if (revoked.status !== 401) throw new Error(`Revoked session returned HTTP ${revoked.status}, not 401.`);
    console.log('PASS | Logout revoked the verification session.');
  } catch (error) {
    if (error.message.startsWith('No admin record') ||
        error.message.startsWith('Password did not match') ||
        error.message.startsWith('Admin login returned') ||
        error.message.startsWith('Admin login did not') ||
        error.message.startsWith('JWT ') ||
        error.message.startsWith('Protected API ') ||
        error.message.startsWith('Revoked session')) {
      error.message = `${stage}: ${error.message}`;
    } else if (stage === 'MongoDB connection') {
      error.message = `${stage} failed (${error.name}).`;
    } else {
      error.message = `${stage} failed (${error.name}).`;
    }
    throw error;
  } finally {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  }
}

verifyAdmin().catch(error => {
  console.error(`FAIL | ${error.message}`);
  process.exitCode = 1;
});
