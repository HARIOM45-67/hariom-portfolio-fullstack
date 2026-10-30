import 'dotenv/config';
import { pathToFileURL } from 'node:url';
import app from './app.js';
import mongoose, { connectDatabase } from './config/database.js';
import { cookieOptions, jwtSecret } from './middleware/auth.js';

let server;

export async function start() {
  jwtSecret();
  cookieOptions();
  const port = Number(process.env.PORT || 5000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a valid TCP port.');
  }

  await connectDatabase();
  server = app.listen(port, () => {
    console.info(`Portfolio API listening on port ${port}.`);
  });
  return server;
}

async function shutdown(signal) {
  console.info(`Received ${signal}; shutting down.`);
  if (server) {
    await new Promise((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
    });
  }
  await mongoose.disconnect();
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    shutdown(signal).catch(error => {
      console.error('Graceful shutdown failed:', error);
      process.exitCode = 1;
    });
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  start().catch(error => {
    console.error('API startup failed:', error.message);
    process.exitCode = 1;
  });
}
