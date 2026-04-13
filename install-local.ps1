$ErrorActionPreference = 'Stop'

$ProjectName = 'agentic-skill-mill'
$CliBinName = 'skillmill'
$ManagedMarker = 'managed_by: agentic-skill-mill'
$Skills = @('agentic-skill-mill')
$SkillDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$UserHome = [Environment]::GetFolderPath('UserProfile')
$AppData = [Environment]::GetFolderPath('ApplicationData')
$CodeXHomeDir = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $UserHome '.codex' }

$ClaudeSkillsDir = Join-Path $UserHome '.claude\skills'
$CursorRulesDir = Join-Path $UserHome '.cursor\rules'
$CursorSkillsDir = Join-Path $UserHome '.cursor\skills'
$WindsurfRulesDir = Join-Path $UserHome '.windsurf\rules'
$WindsurfSkillsDir = Join-Path $UserHome '.codeium\windsurf\skills'
$OpenCodeAgentsDirs = @(
  Join-Path $AppData 'opencode\agents',
  Join-Path $UserHome '.opencode\agents'
)
$CodeXSkillsDir = Join-Path $CodeXHomeDir 'skills'
$CompiledDir = Join-Path $SkillDir 'compiled'

function Show-Help {
  Write-Host 'Usage: powershell -ExecutionPolicy Bypass -File .\install-local.ps1 [options]'
  Write-Host ''
  Write-Host 'Options:'
  Write-Host '  --claude        Install skills for Claude Code'
  Write-Host '  --cursor        Install skills for Cursor'
  Write-Host '  --windsurf      Install skills for Windsurf'
  Write-Host '  --opencode      Install skills for OpenCode'
  Write-Host '  --codex         Install skills for Codex'
  Write-Host '  --all           Install for all five tools'
  Write-Host '  --skills-only   Skip npm install/build/link (just copy skills)'
  Write-Host '  --uninstall     Remove installed skills from target tools'
  Write-Host '  --compile-only  Generate compiled/ output directory (no install)'
  Write-Host '  -h, --help      Show this help'
  Write-Host ''
  Write-Host 'No flags = auto-detect installed tools.'
}

function Invoke-Step {
  param(
    [Parameter(Mandatory = $true)][string]$FilePath,
    [string[]]$Arguments = @(),
    [string]$WorkingDirectory = $SkillDir,
    [switch]$AllowFailure
  )

  $argText = if ($Arguments.Count -gt 0) { ' ' + ($Arguments -join ' ') } else { '' }
  Write-Host ("> {0}{1}" -f $FilePath, $argText)
  Push-Location $WorkingDirectory
  try {
    & $FilePath @Arguments
    if (-not $AllowFailure -and $LASTEXITCODE -ne 0) {
      throw "Command failed with exit code $LASTEXITCODE: $FilePath$argText"
    }
  }
  finally {
    Pop-Location
  }
}

function Ensure-Directory {
  param([Parameter(Mandatory = $true)][string]$Path)
  New-Item -ItemType Directory -Force -Path $Path | Out-Null
}

function Remove-ManagedFiles {
  param([Parameter(Mandatory = $true)][string]$Path)

  if (-not (Test-Path -LiteralPath $Path -PathType Container)) {
    return
  }

  Get-ChildItem -LiteralPath $Path -Recurse -File | ForEach-Object {
    $file = $_
    $matches = Select-String -Path $file.FullName -SimpleMatch -Pattern $ManagedMarker -Quiet -ErrorAction SilentlyContinue
    if ($matches) {
      Remove-Item -LiteralPath $file.FullName -Force
      Write-Host "    Removed: $($file.FullName)"
      $parent = Split-Path -Parent $file.FullName
      if ($parent -and ([IO.Path]::GetFullPath($parent) -ne [IO.Path]::GetFullPath($Path))) {
        try {
          Remove-Item -LiteralPath $parent -Force -ErrorAction Stop
        }
        catch {
        }
      }
    }
  }
}

function Install-Claude {
  param([Parameter(Mandatory = $true)][string]$SkillName)
  $src = Join-Path $CompiledDir "claude\$SkillName\SKILL.md"
  $destDir = Join-Path $ClaudeSkillsDir $SkillName
  Ensure-Directory -Path $destDir
  Copy-Item -LiteralPath $src -Destination (Join-Path $destDir 'SKILL.md') -Force
  Write-Host "    Claude:   $(Join-Path $destDir 'SKILL.md')"
}

function Install-Cursor {
  param([Parameter(Mandatory = $true)][string]$SkillName)
  $srcRule = Join-Path $CompiledDir "cursor\rules\$SkillName.mdc"
  Ensure-Directory -Path $CursorRulesDir
  Copy-Item -LiteralPath $srcRule -Destination (Join-Path $CursorRulesDir "$SkillName.mdc") -Force
  Write-Host "    Cursor (rule):  $(Join-Path $CursorRulesDir "$SkillName.mdc")"
  $srcSkill = Join-Path $CompiledDir "cursor\skills\$SkillName\SKILL.md"
  $destDir = Join-Path $CursorSkillsDir $SkillName
  Ensure-Directory -Path $destDir
  Copy-Item -LiteralPath $srcSkill -Destination (Join-Path $destDir 'SKILL.md') -Force
  Write-Host "    Cursor (skill): $(Join-Path $destDir 'SKILL.md')"
}

function Install-Windsurf {
  param([Parameter(Mandatory = $true)][string]$SkillName)
  $srcRule = Join-Path $CompiledDir "windsurf\rules\$SkillName.md"
  Ensure-Directory -Path $WindsurfRulesDir
  Copy-Item -LiteralPath $srcRule -Destination (Join-Path $WindsurfRulesDir "$SkillName.md") -Force
  Write-Host "    Windsurf (rule):  $(Join-Path $WindsurfRulesDir "$SkillName.md")"
  $srcSkill = Join-Path $CompiledDir "windsurf\skills\$SkillName\SKILL.md"
  $destDir = Join-Path $WindsurfSkillsDir $SkillName
  Ensure-Directory -Path $destDir
  Copy-Item -LiteralPath $srcSkill -Destination (Join-Path $destDir 'SKILL.md') -Force
  Write-Host "    Windsurf (skill): $(Join-Path $destDir 'SKILL.md')"
}

function Install-OpenCode {
  param([Parameter(Mandatory = $true)][string]$SkillName)
  $src = Join-Path $CompiledDir "opencode\$SkillName.md"
  $destRoot = $OpenCodeAgentsDirs[0]
  Ensure-Directory -Path $destRoot
  Copy-Item -LiteralPath $src -Destination (Join-Path $destRoot "$SkillName.md") -Force
  Write-Host "    OpenCode: $(Join-Path $destRoot "$SkillName.md")"
}

function Install-Codex {
  param([Parameter(Mandatory = $true)][string]$SkillName)
  $src = Join-Path $CompiledDir "codex\$SkillName\SKILL.md"
  $destDir = Join-Path $CodeXSkillsDir $SkillName
  Ensure-Directory -Path $destDir
  Copy-Item -LiteralPath $src -Destination (Join-Path $destDir 'SKILL.md') -Force
  Write-Host "    Codex:    $(Join-Path $destDir 'SKILL.md')"
}

function Uninstall-Claude {
  foreach ($skill in $Skills) {
    $path = Join-Path $ClaudeSkillsDir $skill
    if (Test-Path -LiteralPath $path) {
      Remove-Item -LiteralPath $path -Recurse -Force
    }
  }
  Write-Host '    Claude:   removed'
}

function Uninstall-Cursor {
  foreach ($skill in $Skills) {
    $rulePath = Join-Path $CursorRulesDir "$skill.mdc"
    $skillPath = Join-Path $CursorSkillsDir $skill
    if (Test-Path -LiteralPath $rulePath) {
      Remove-Item -LiteralPath $rulePath -Force
    }
    if (Test-Path -LiteralPath $skillPath) {
      Remove-Item -LiteralPath $skillPath -Recurse -Force
    }
  }
  Write-Host '    Cursor:   removed'
}

function Uninstall-Windsurf {
  foreach ($skill in $Skills) {
    $rulePath = Join-Path $WindsurfRulesDir "$skill.md"
    $skillPath = Join-Path $WindsurfSkillsDir $skill
    if (Test-Path -LiteralPath $rulePath) {
      Remove-Item -LiteralPath $rulePath -Force
    }
    if (Test-Path -LiteralPath $skillPath) {
      Remove-Item -LiteralPath $skillPath -Recurse -Force
    }
  }
  Write-Host '    Windsurf: removed'
}

function Uninstall-OpenCode {
  foreach ($root in $OpenCodeAgentsDirs) {
    foreach ($skill in $Skills) {
      $path = Join-Path $root "$skill.md"
      if (Test-Path -LiteralPath $path) {
        Remove-Item -LiteralPath $path -Force
      }
    }
  }
  Write-Host '    OpenCode: removed'
}

function Uninstall-Codex {
  foreach ($skill in $Skills) {
    $path = Join-Path $CodeXSkillsDir $skill
    if (Test-Path -LiteralPath $path) {
      Remove-Item -LiteralPath $path -Recurse -Force
    }
  }
  Write-Host '    Codex:    removed'
}

function Get-DetectedEditors {
  $detected = New-Object System.Collections.Generic.List[string]
  if (Test-Path -LiteralPath (Join-Path $UserHome '.claude')) { $detected.Add('claude') }
  if (Test-Path -LiteralPath (Join-Path $UserHome '.cursor')) { $detected.Add('cursor') }
  if ((Test-Path -LiteralPath (Join-Path $UserHome '.windsurf')) -or (Test-Path -LiteralPath (Join-Path $UserHome '.codeium\windsurf'))) { $detected.Add('windsurf') }
  foreach ($root in $OpenCodeAgentsDirs) {
    $parent = Split-Path -Parent $root
    if (Test-Path -LiteralPath $parent) {
      $detected.Add('opencode')
      break
    }
  }
  if ($env:CODEX_HOME -or (Test-Path -LiteralPath $CodeXHomeDir)) { $detected.Add('codex') }
  return $detected.ToArray()
}

$targets = New-Object System.Collections.Generic.List[string]
$doBuild = $true
$doUninstall = $false
$doCompileOnly = $false

for ($i = 0; $i -lt $args.Count; $i++) {
  switch ($args[$i]) {
    '--claude' { $targets.Add('claude'); continue }
    '--cursor' { $targets.Add('cursor'); continue }
    '--windsurf' { $targets.Add('windsurf'); continue }
    '--opencode' { $targets.Add('opencode'); continue }
    '--codex' { $targets.Add('codex'); continue }
    '--all' {
      $targets.Clear()
      @('claude', 'cursor', 'windsurf', 'opencode', 'codex') | ForEach-Object { $targets.Add($_) }
      continue
    }
    '--skills-only' { $doBuild = $false; continue }
    '--uninstall' { $doUninstall = $true; continue }
    '--compile-only' { $doCompileOnly = $true; continue }
    '--help' { Show-Help; exit 0 }
    '-h' { Show-Help; exit 0 }
    default {
      Write-Error "Unknown option: $($args[$i])`nRun: powershell -ExecutionPolicy Bypass -File .\install-local.ps1 --help"
    }
  }
}

if ($doCompileOnly) {
  Write-Host '==> Delegating to compile.mjs...'
  Invoke-Step -FilePath 'node' -Arguments @((Join-Path $SkillDir 'skill\build\compile.mjs'))
  exit 0
}

if ($targets.Count -eq 0) {
  (Get-DetectedEditors) | ForEach-Object { $targets.Add($_) }
}

if ($targets.Count -eq 0) {
  throw 'ERROR: No supported tools detected. Use --claude, --cursor, --windsurf, --opencode, or --codex.'
}

Write-Host "==> $ProjectName setup"
Write-Host "    Project: $SkillDir"
Write-Host "    Targets: $($targets -join ' ')"
Write-Host ''

if ($doUninstall) {
  Write-Host "==> Uninstalling $ProjectName"
  Write-Host "    Targets: $($targets -join ' ')"
  Write-Host ''

  foreach ($target in $targets) {
    switch ($target) {
      'claude' { Uninstall-Claude }
      'cursor' { Uninstall-Cursor }
      'windsurf' { Uninstall-Windsurf }
      'opencode' { Uninstall-OpenCode }
      'codex' { Uninstall-Codex }
    }
  }

  Write-Host "--> Removing $CliBinName CLI..."
  Invoke-Step -FilePath 'npm' -Arguments @('unlink', $ProjectName) -AllowFailure
  $skillmillCmd = Get-Command $CliBinName -ErrorAction SilentlyContinue
  if ($skillmillCmd) {
    Write-Host "    WARNING: $CliBinName still in PATH at $($skillmillCmd.Source)"
  }
  else {
    Write-Host "    $CliBinName removed"
  }

  Write-Host ''
  Write-Host '==> Done. Skills and CLI removed.'
  exit 0
}

if ($doBuild) {
  Write-Host '--> Installing dependencies...'
  Invoke-Step -FilePath 'npm' -Arguments @('install')

  Write-Host '--> Cleaning previous build...'
  $distDir = Join-Path $SkillDir 'dist'
  if (Test-Path -LiteralPath $distDir) {
    Remove-Item -LiteralPath $distDir -Recurse -Force
  }

  Write-Host '--> Building TypeScript...'
  Invoke-Step -FilePath 'npm' -Arguments @('run', 'build')

  Write-Host '--> Compiling skills...'
  Invoke-Step -FilePath 'npm' -Arguments @('run', 'compile')

  Write-Host "--> Installing $CliBinName CLI globally..."
  Invoke-Step -FilePath 'npm' -Arguments @('link')

  $npmPrefix = (& npm prefix -g).Trim()
  if ($LASTEXITCODE -ne 0) {
    throw 'Failed to determine npm global prefix.'
  }
  $candidateBins = @(
    Join-Path $npmPrefix "$CliBinName.cmd",
    Join-Path $npmPrefix $CliBinName,
    Join-Path (Join-Path $npmPrefix 'bin') "$CliBinName.cmd",
    Join-Path (Join-Path $npmPrefix 'bin') $CliBinName
  )
  $cliPath = $candidateBins | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
  if ($cliPath) {
    Write-Host "    $CliBinName: $cliPath"
    $cliVersion = (& $cliPath --version 2>$null)
    if ($LASTEXITCODE -eq 0 -and $cliVersion) {
      Write-Host "    version:  $cliVersion"
    }
    else {
      Write-Host '    version:  unknown'
    }
  }
  else {
    Write-Host "    WARNING: $CliBinName not found under npm global prefix after npm link."
    Write-Host '    Try running: npm link'
  }
}

Write-Host "--> Cleaning stale $ProjectName files..."
foreach ($target in $targets) {
  switch ($target) {
    'claude' { Remove-ManagedFiles -Path $ClaudeSkillsDir }
    'cursor' {
      Remove-ManagedFiles -Path $CursorRulesDir
      Remove-ManagedFiles -Path $CursorSkillsDir
    }
    'windsurf' {
      Remove-ManagedFiles -Path $WindsurfRulesDir
      Remove-ManagedFiles -Path $WindsurfSkillsDir
    }
    'opencode' {
      foreach ($root in $OpenCodeAgentsDirs) {
        Remove-ManagedFiles -Path $root
      }
    }
    'codex' { Remove-ManagedFiles -Path $CodeXSkillsDir }
  }
}

Write-Host '--> Installing skills...'
foreach ($skill in $Skills) {
  Write-Host "  ${skill}:"
  foreach ($target in $targets) {
    switch ($target) {
      'claude' { Install-Claude -SkillName $skill }
      'cursor' { Install-Cursor -SkillName $skill }
      'windsurf' { Install-Windsurf -SkillName $skill }
      'opencode' { Install-OpenCode -SkillName $skill }
      'codex' { Install-Codex -SkillName $skill }
    }
  }
}

Write-Host ''
Write-Host '==> Done.'
Write-Host ''
Write-Host "Skills installed for: $($targets -join ' ')"
Write-Host "CLI available as: $CliBinName"
