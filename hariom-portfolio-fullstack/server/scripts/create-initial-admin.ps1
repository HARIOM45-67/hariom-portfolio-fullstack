$ErrorActionPreference = 'Stop'

Set-Location (Join-Path $PSScriptRoot '..')

$existingCount = node --input-type=module -e @'
import 'dotenv/config';
import mongoose from 'mongoose';
import Admin from './src/models/Admin.js';
await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
try {
  process.stdout.write(String(await Admin.countDocuments({})));
} finally {
  await mongoose.disconnect();
}
'@

if ($LASTEXITCODE -ne 0) {
  throw 'Could not check the existing admin account count.'
}
if ($existingCount.Trim() -ne '0') {
  throw 'An admin account already exists; no account was created.'
}

$secureEmail = Read-Host 'Initial admin email (input is hidden)' -AsSecureString
$emailPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureEmail)

$securePassword = Read-Host 'Initial admin password (input is hidden)' -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
  $email = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($emailPointer)
  $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
  if ([string]::IsNullOrWhiteSpace($email)) {
    throw 'Admin email is required.'
  }
  if ([Text.Encoding]::UTF8.GetByteCount($password) -lt 12 -or
      [Text.Encoding]::UTF8.GetByteCount($password) -gt 72) {
    throw 'Password must be 12–72 UTF-8 bytes.'
  }

  $env:INITIAL_ADMIN_EMAIL = $email
  $env:INITIAL_ADMIN_PASSWORD = $password
  npm run create:admin
  if ($LASTEXITCODE -ne 0) {
    throw 'Initial admin creation failed; review the non-secret error above.'
  }

  $env:VERIFY_ADMIN_EMAIL = $email
  $env:VERIFY_ADMIN_PASSWORD = $password
  node --input-type=module -e @'
import 'dotenv/config';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import Admin from './src/models/Admin.js';
import app from './src/app.js';
import { authCookieName } from './src/middleware/auth.js';

const email = process.env.VERIFY_ADMIN_EMAIL;
const password = process.env.VERIFY_ADMIN_PASSWORD;
const origin = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',')[0].trim();
await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
let server;
try {
  const admin = await Admin.findOne({ email }).select('+password');
  if (!admin || !(await admin.verifyPassword(password))) {
    throw new Error('Stored admin password verification failed.');
  }
  console.log('PASS | Admin record exists and bcrypt password verification succeeded.');

  server = app.listen(0, '127.0.0.1');
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (login.status !== 200) throw new Error(`Admin login returned HTTP ${login.status}.`);
  const cookie = login.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
  const tokenCookie = cookie.split(';').map(value => value.trim())
    .find(value => value.startsWith(`${authCookieName}=`));
  if (!tokenCookie) throw new Error('Login did not return the admin session cookie.');
  const token = tokenCookie.slice(authCookieName.length + 1);
  const claims = jwt.verify(token, process.env.JWT_SECRET, {
    algorithms: ['HS256'],
    issuer: ['hariom-potofolio', 'hariom-portfolio']
  });
  if (claims.sub !== admin.id || claims.ver !== admin.tokenVersion) {
    throw new Error('JWT claims do not match the stored admin.');
  }
  console.log('PASS | Login succeeded and JWT signature, issuer, subject, and version verified.');

  const cookieHeader = `${authCookieName}=${token}`;
  for (const path of ['/api/auth/me', '/api/queries', '/api/analytics/summary']) {
    const response = await fetch(`${baseUrl}${path}`, { headers: { Cookie: cookieHeader } });
    if (response.status !== 200) throw new Error(`Protected API ${path} returned HTTP ${response.status}.`);
    console.log(`PASS | Protected API ${path} returned HTTP 200.`);
  }

  const logout = await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: { Origin: origin, Cookie: cookieHeader }
  });
  if (logout.status !== 204) throw new Error(`Admin logout returned HTTP ${logout.status}.`);
  const revoked = await fetch(`${baseUrl}/api/auth/me`, { headers: { Cookie: cookieHeader } });
  if (revoked.status !== 401) throw new Error(`Revoked session returned HTTP ${revoked.status}, not 401.`);
  console.log('PASS | Logout revoked the verification session.');
} finally {
  try {
    if (server?.listening) {
      await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}
'@
  if ($LASTEXITCODE -ne 0) {
    throw 'Admin verification failed; review the non-secret error above.'
  }
} finally {
  $env:INITIAL_ADMIN_EMAIL = $null
  $env:INITIAL_ADMIN_PASSWORD = $null
  $env:VERIFY_ADMIN_EMAIL = $null
  $env:VERIFY_ADMIN_PASSWORD = $null
  $email = $null
  $password = $null
  $secureEmail.Dispose()
  $securePassword.Dispose()
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($emailPointer)
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
}
