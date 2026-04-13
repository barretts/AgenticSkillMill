$ErrorActionPreference = 'Stop'

$PackageName = if ($env:SKILLMILL_PACKAGE_NAME) { $env:SKILLMILL_PACKAGE_NAME } else { 'agentic-skill-mill' }
$PackageVersion = if ($env:SKILLMILL_PACKAGE_VERSION) { $env:SKILLMILL_PACKAGE_VERSION } else { 'latest' }

if ($args.Count -gt 0 -and ($args[0] -eq '--help' -or $args[0] -eq '-h')) {
  Write-Host 'Usage: powershell -ExecutionPolicy Bypass -File .\install.ps1 [tool flags]'
  Write-Host ''
  Write-Host "This script installs ${PackageName}@${PackageVersion} globally and then"
  Write-Host 'runs install-local.ps1 --skills-only with the flags you provide.'
  Write-Host ''
  Write-Host 'Examples:'
  Write-Host '  powershell -ExecutionPolicy Bypass -File .\install.ps1 --all'
  Write-Host '  powershell -ExecutionPolicy Bypass -File .\install.ps1 --cursor'
  Write-Host ''
  Write-Host 'Environment overrides:'
  Write-Host '  SKILLMILL_PACKAGE_NAME    Package to install (default: agentic-skill-mill)'
  Write-Host '  SKILLMILL_PACKAGE_VERSION Version tag (default: latest)'
  exit 0
}

Write-Host "==> Installing utility library: ${PackageName}@${PackageVersion}"
& npm install -g "${PackageName}@${PackageVersion}"
if ($LASTEXITCODE -ne 0) {
  throw 'npm install -g failed.'
}

$globalNodeModules = (& npm root -g).Trim()
if ($LASTEXITCODE -ne 0 -or -not $globalNodeModules) {
  throw 'Failed to resolve npm global node_modules directory.'
}

$packageDir = Join-Path $globalNodeModules $PackageName
$localInstaller = Join-Path $packageDir 'install-local.ps1'

if (-not (Test-Path -LiteralPath $localInstaller -PathType Leaf)) {
  throw "ERROR: Could not find install-local.ps1 at: $localInstaller`nCheck the package 'files' list to ensure install-local.ps1 is published."
}

Write-Host '==> Installing skills via local installer (skills-only mode)'
& powershell -ExecutionPolicy Bypass -File $localInstaller --skills-only @args
if ($LASTEXITCODE -ne 0) {
  throw 'The local PowerShell installer failed.'
}

Write-Host ''
Write-Host '==> Done.'
Write-Host 'Utility and skills installed.'
