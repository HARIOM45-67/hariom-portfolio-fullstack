import mongoose from 'mongoose';

export function getDatabaseSelectionDiagnostic(
  connection = mongoose.connection,
  expectedDatabase = 'portfolio'
) {
  const activeDatabase = connection.name || '';
  return {
    activeDatabase,
    expectedDatabase,
    matches: activeDatabase === expectedDatabase
  };
}
