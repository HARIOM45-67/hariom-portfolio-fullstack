import { afterAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectDatabase } from '../src/config/database.js';
import { getDatabaseSelectionDiagnostic } from '../src/config/databaseDiagnostics.js';

let mongo;

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

describe('MongoDB database selection diagnostic', () => {
  it('reports the active database without exposing the connection URI', async () => {
    mongo = await MongoMemoryServer.create();
    const connection = await connectDatabase(mongo.getUri('portfolio'));

    expect(getDatabaseSelectionDiagnostic(connection)).toEqual({
      activeDatabase: 'portfolio',
      expectedDatabase: 'portfolio',
      matches: true
    });
  });

  it('reports a mismatch without including connection details', () => {
    const diagnostic = getDatabaseSelectionDiagnostic({ name: 'test' });

    expect(diagnostic).toEqual({
      activeDatabase: 'test',
      expectedDatabase: 'portfolio',
      matches: false
    });
    expect(JSON.stringify(diagnostic)).not.toMatch(/mongodb(?:\+srv)?:\/\//i);
  });
});
