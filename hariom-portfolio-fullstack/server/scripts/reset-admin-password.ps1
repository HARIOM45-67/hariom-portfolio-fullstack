$ErrorActionPreference = 'Stop'
$serverDirectory = Split-Path -Parent $PSScriptRoot
Set-Location $serverDirectory

$secureEmail = $null
$securePassword = $null
$securePasswordConfirmation = $null
$emailPointer = $null
$passwordPointer = $null
$confirmationPointer = $null
$email = $null
$password = $null
$passwordConfirmation = $null

try {
  $secureEmail = Read-Host 'Existing admin email (input is hidden)' -AsSecureString
  $emailPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureEmail)
  $securePassword = Read-Host 'New admin password (input is hidden)' -AsSecureString
  $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
  $securePasswordConfirmation = Read-Host 'Confirm new admin password (input is hidden)' -AsSecureString
  $confirmationPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePasswordConfirmation)

  $email = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($emailPointer)
  $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
  $passwordConfirmation = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($confirmationPointer)

  if ([string]::IsNullOrWhiteSpace($email)) {
    throw 'Admin email is required.'
  }
  if (-not [string]::Equals($password, $passwordConfirmation, [StringComparison]::Ordinal)) {
    throw 'The password entries do not match.'
  }
  $passwordBytes = [Text.Encoding]::UTF8.GetByteCount($password)
  if ($passwordBytes -lt 12 -or $passwordBytes -gt 72) {
    throw 'Password must be 12–72 UTF-8 bytes.'
  }

  $env:ADMIN_RESET_EMAIL = $email
  $env:ADMIN_RESET_PASSWORD = $password

  $resetScript = @'
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase } from './src/config/database.js';
import Admin from './src/models/Admin.js';

let stage = 'database connection';
try {
  const email = process.env.ADMIN_RESET_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_RESET_PASSWORD;
  if (!email || typeof password !== 'string' ||
      Buffer.byteLength(password, 'utf8') < 12 ||
      Buffer.byteLength(password, 'utf8') > 72) {
    throw new TypeError('invalid reset input');
  }

  const connection = await connectDatabase();
  const matchingAdmins = await Admin.countDocuments({ email });
  if (matchingAdmins !== 1) {
    stage = 'admin lookup';
    throw new Error('expected exactly one matching admin');
  }

  const admin = await Admin.findOne({ email }).select('+password');
  if (!admin) {
    stage = 'admin lookup';
    throw new Error('matching admin could not be loaded');
  }

  stage = 'password update';
  admin.password = password;
  admin.tokenVersion += 1;
  await admin.save();

  stage = 'bcrypt verification';
  const savedAdmin = await Admin.findById(admin._id).select('+password');
  if (!savedAdmin || !(await savedAdmin.verifyPassword(password))) {
    throw new Error('saved password did not verify');
  }

  console.log(`PASS | Existing admin password reset and bcrypt verification succeeded (database: ${connection.name}, collection: ${Admin.collection.collectionName}).`);
  console.log('PASS | Existing admin record preserved; previous sessions revoked.');
} catch (error) {
  console.error(`FAIL | Admin password reset failed during ${stage} (${error.name}).`);
  process.exitCode = 1;
} finally {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}
'@

  $output = & node --input-type=module -e $resetScript 2>&1
  $nodeExitCode = $LASTEXITCODE
  if ($output) {
    Write-Output ($output -join [Environment]::NewLine)
  }
  if ($nodeExitCode -ne 0) {
    throw "Admin password reset failed with Node.js exit code $nodeExitCode."
  }
} finally {
  $env:ADMIN_RESET_EMAIL = $null
  $env:ADMIN_RESET_PASSWORD = $null
  $email = $null
  $password = $null
  $passwordConfirmation = $null
  if ($secureEmail) { $secureEmail.Dispose() }
  if ($securePassword) { $securePassword.Dispose() }
  if ($securePasswordConfirmation) { $securePasswordConfirmation.Dispose() }
  if ($emailPointer) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($emailPointer) }
  if ($passwordPointer) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer) }
  if ($confirmationPointer) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($confirmationPointer) }
}
