import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Admin from '../src/models/Admin.js';
import Contact from '../src/models/Contact.js';
import Project from '../src/models/Project.js';
import Resume from '../src/models/Resume.js';
import PortfolioView from '../src/models/PortfolioView.js';
import GitHubSnapshot from '../src/models/GitHubSnapshot.js';

const serverDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(serverDirectory, '.env');
const envText = readFileSync(envPath, 'utf8');
const envResult = dotenv.config({ path: envPath, override: true });
const uriLine = envText.split(/\r?\n/).find(line => /^\s*MONGODB_URI\s*=/.test(line)) || '';
const rawUriValue = uriLine.replace(/^\s*MONGODB_URI\s*=\s*/, '').replace(/^['"]|['"]$/g, '');
const hasLiteralHash = rawUriValue.includes('#');

let failed = false;
const models = [Admin, Contact, Project, Resume, PortfolioView, GitHubSnapshot];

function fail(label, error) {
  failed = true;
  const code = error?.codeName || error?.code || error?.name || 'unknown';
  const message = String(error?.message || '')
    .replace(/mongodb(?:\+srv)?:\/\/[^\s"'<>]+/gi, 'mongodb+srv://[REDACTED]')
    .replace(/(username|password|credential|secret)(\s*[:=]\s*)\S+/gi, '$1$2[REDACTED]');
  const detail = message ? `: ${message}` : '';
  console.log(`FAIL ${label} (${String(code).replace(/[^A-Za-z0-9_-]/g, '')})${detail}`);
}

if (envResult.error) {
  fail('Reading server/.env', envResult.error);
} else {
  console.log('PASS Read server/.env');
}

const uri = process.env.MONGODB_URI;
let targetValid = false;

try {
  if (!uri) throw new Error('MONGODB_URI is missing.');
  if (hasLiteralHash) {
    throw new Error('MONGODB_URI contains a literal # character; encode reserved password characters (for example, # as %23).');
  }
  const parsed = new URL(uri);
  try {
    decodeURIComponent(parsed.password);
  } catch {
    throw new Error('MONGODB_URI password has invalid percent-encoding.');
  }
  const database = decodeURIComponent(parsed.pathname.replace(/^\/+/, '').split('/')[0] || '');
  if (parsed.protocol !== 'mongodb+srv:' || !parsed.hostname.endsWith('.mongodb.net')) {
    throw new Error('MONGODB_URI must target a MongoDB Atlas SRV host.');
  }
  if (database !== 'portfolio') throw new Error('MONGODB_URI must target the portfolio database.');
  targetValid = true;
  console.log('PASS Atlas SRV target is the portfolio database (credentials withheld)');
} catch (error) {
  fail('Atlas target validation', error);
}

if (targetValid) {
  if (models.every(model => model.schema && model.collection.name)) {
    console.log(`PASS ${models.length} Mongoose model schemas loaded (Mongoose ${mongoose.version})`);
  } else {
    fail('Mongoose model schema compatibility', new Error('One or more model schemas did not load.'));
  }

  let connected = false;
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 12000 });
    connected = true;
    console.log('PASS Atlas connectivity');
    console.log('PASS Atlas authentication');
  } catch (error) {
    if (error?.code === 8000 || /bad auth|authentication failed/i.test(error?.message || '')) {
      console.log('PASS Atlas network reachability (received MongoDB authentication response)');
      fail('Atlas authentication', error);
    } else {
      fail('Atlas connectivity', error);
    }
  }

  if (connected) {
    try {
      await mongoose.connection.db.admin().ping();
      console.log('PASS portfolio database ping');
    } catch (error) {
      fail('portfolio database ping', error);
    }

    try {
      const collections = await mongoose.connection.db
        .listCollections({}, { nameOnly: true })
        .toArray();
      console.log(`PASS database metadata access (${collections.length} collections visible)`);
    } catch (error) {
      fail('portfolio database metadata access', error);
    }

    for (const model of models) {
      try {
        await model.collection.findOne(
          {},
          { projection: { _id: 1 }, maxTimeMS: 5000 }
        );
        console.log(`PASS ${model.modelName} read access (${model.collection.name})`);
      } catch (error) {
        fail(`${model.modelName} read access`, error);
      }
    }
  }
}

try {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
} catch (error) {
  fail('Test connection cleanup', error);
}

process.exitCode = failed ? 1 : 0;
