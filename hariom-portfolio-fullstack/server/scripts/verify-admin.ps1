$ErrorActionPreference = 'Stop'
$serverDirectory = Split-Path -Parent $PSScriptRoot
$verificationScript = Join-Path $PSScriptRoot 'verify-admin.js'
if (-not (Test-Path -LiteralPath $verificationScript -PathType Leaf)) {
  throw "Admin verification script not found: $verificationScript"
}
Set-Location $serverDirectory

$secureEmail = Read-Host 'Admin email (input is hidden)' -AsSecureString
$emailPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureEmail)
$securePassword = Read-Host 'Admin password (input is hidden)' -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)

try {
  $env:VERIFY_ADMIN_EMAIL = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($emailPointer)
  $env:VERIFY_ADMIN_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)

  $nodeCommand = Get-Command node -ErrorAction Stop
  $processInfo = New-Object System.Diagnostics.ProcessStartInfo
  $processInfo.FileName = $nodeCommand.Source
  $processInfo.Arguments = '"' + $verificationScript.Replace('"', '\"') + '"'
  $processInfo.WorkingDirectory = $serverDirectory
  $processInfo.UseShellExecute = $false
  $processInfo.CreateNoWindow = $true
  $processInfo.RedirectStandardOutput = $true
  $processInfo.RedirectStandardError = $true

  $process = New-Object System.Diagnostics.Process
  $process.StartInfo = $processInfo
  if (-not $process.Start()) {
    throw 'Could not start the Node.js verifier.'
  }
  $stdoutTask = $process.StandardOutput.ReadToEndAsync()
  $stderrTask = $process.StandardError.ReadToEndAsync()
  $process.WaitForExit()
  $stdout = $stdoutTask.GetAwaiter().GetResult()
  $stderr = $stderrTask.GetAwaiter().GetResult()
  $nodeExitCode = $process.ExitCode
  $process.Dispose()

  if ($stdout) {
    Write-Output $stdout.TrimEnd()
  }
  if ($stderr) {
    Write-Output $stderr.TrimEnd()
  }
  Write-Output "Node.js verifier exit code: $nodeExitCode"
  if ($nodeExitCode -ne 0) {
    throw "Admin verification failed with Node.js exit code $nodeExitCode."
  }
} finally {
  $env:VERIFY_ADMIN_EMAIL = $null
  $env:VERIFY_ADMIN_PASSWORD = $null
  $secureEmail.Dispose()
  $securePassword.Dispose()
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($emailPointer)
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
}
