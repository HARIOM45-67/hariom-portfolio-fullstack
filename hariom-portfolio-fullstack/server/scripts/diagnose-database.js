import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/database.js';
import { getDatabaseSelectionDiagnostic } from '../src/config/databaseDiagnostics.js';

try {
  const connection = await connectDatabase();
  const diagnostic = getDatabaseSelectionDiagnostic(connection);
  console.info(`${diagnostic.matches ? 'PASS' : 'FAIL'} | MongoDB database selection`, diagnostic);
  if (!diagnostic.matches) process.exitCode = 1;
} catch (error) {
  console.error('FAIL | MongoDB connection could not be verified.', { error: error.name });
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
