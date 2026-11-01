import 'dotenv/config';
import { pathToFileURL } from 'node:url';
import mongoose from 'mongoose';
import { z } from 'zod';
import { connectDatabase } from '../src/config/database.js';
import Admin from '../src/models/Admin.js';

const emailSchema = z.string().trim().email().max(254);

export async function createInitialAdmin() {
  const parsedEmail = emailSchema.safeParse(process.env.INITIAL_ADMIN_EMAIL);
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  if (!parsedEmail.success || typeof password !== 'string' ||
      password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error('Set a valid INITIAL_ADMIN_EMAIL and a 12–72 byte INITIAL_ADMIN_PASSWORD in the server environment.');
  }

  await connectDatabase();
  if (await Admin.exists({})) {
    throw new Error('An admin account already exists; the initial admin setup can only run once.');
  }

  const admin = await Admin.create({ email: parsedEmail.data.toLowerCase(), password });
  console.info('Initial admin created successfully. Remove the setup credentials from the environment.');
  return admin;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createInitialAdmin()
    .catch(error => {
      console.error(`Admin setup failed: ${error.message}`);
      process.exitCode = 1;
    })
    .finally(async () => {
      if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    });
}
