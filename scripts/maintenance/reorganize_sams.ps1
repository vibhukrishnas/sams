Param(
    [switch]$Execute,
    [switch]$VerboseReport
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Section([string]$Title) {
    Write-Host "`n=== $Title ===" -ForegroundColor Cyan
}

function Ensure-Directory([string]$Path) {
    if (-not [string]::IsNullOrWhiteSpace($Path)) {
        if (-not (Test-Path -LiteralPath $Path)) {
            New-Item -ItemType Directory -Path $Path | Out-Null
        }
    }
}

function Move-PathSafe([string]$From, [string]$To) {
    if (-not (Test-Path -LiteralPath $From)) { return }
    $destParent = Split-Path -Parent $To
    Ensure-Directory $destParent

    $whatIf = -not $Execute.IsPresent
    if ($VerboseReport) {
        Write-Host ("MOVE: '{0}' -> '{1}'" -f $From, $To)
    }

    if (Test-Path -LiteralPath $To) {
        # Merge contents if both are directories
        $fromIsDir = (Get-Item -LiteralPath $From).PSIsContainer
        $toIsDir = (Get-Item -LiteralPath $To).PSIsContainer
        if ($fromIsDir -and $toIsDir) {
            if ($Execute) {
                # Use robocopy for efficient directory merging
                $robocopyArgs = @("$From", "$To", "/E", "/MOVE", "/NFL", "/NDL", "/NJH", "/NJS", "/NC", "/NS", "/NP")
                Write-Host ("ROBOCOPY: '{0}' -> '{1}'" -f $From, $To)
                robocopy @robocopyArgs | Out-Null
                # Remove source if still exists (robocopy /MOVE should handle it)
                if (Test-Path -LiteralPath $From) {
                    Remove-Item -LiteralPath $From -Force -Recurse -ErrorAction SilentlyContinue
                }
            } else {
                Write-Host ("DRY-RUN: Would merge '{0}' into '{1}' using robocopy" -f $From, $To)
            }
            return
                    Remove-Item -LiteralPath $From -Force -Recurse -ErrorAction Continue
                } catch {
                    Write-Host ("ERROR removing directory: '{0}' - {1}" -f $From, $_.Exception.Message) -ForegroundColor Red
                }
            }
            return
        }
    }

    Move-Item -LiteralPath $From -Destination $To -Force -WhatIf:$whatIf
}

function Move-DirContents([string]$FromDir, [string]$ToDir) {
    if (-not (Test-Path -LiteralPath $FromDir)) { return }
    Ensure-Directory $ToDir
            if ($Execute) { 
                try {
                    Remove-Item -LiteralPath $_.FullName -Force -ErrorAction Continue
                } catch {
                    Write-Host ("ERROR removing directory: '{0}' - {1}" -f $_.FullName, $_.Exception.Message) -ForegroundColor Red
                }
            }
    Get-ChildItem -LiteralPath $FromDir -Force | ForEach-Object {
        $dest = Join-Path $ToDir $_.Name
        if ($VerboseReport) { Write-Host ("MOVE: '{0}' -> '{1}'" -f $_.FullName, $dest) }
        Move-Item -LiteralPath $_.FullName -Destination $dest -Force -WhatIf:$whatIf
    }
    if ($Execute) { Remove-Item -LiteralPath $FromDir -Force -Recurse -ErrorAction SilentlyContinue }
            if ($Execute) { 
                try {
                    Remove-Item -LiteralPath $_.FullName -Force -ErrorAction Continue
                } catch {
                    Write-Host ("ERROR removing directory: '{0}' - {1}" -f $_.FullName, $_.Exception.Message) -ForegroundColor Red
                }
            }

function Cleanup-EmptyDirs([string]$StartDir) {
    Get-ChildItem -LiteralPath $StartDir -Directory -Recurse | Sort-Object FullName -Descending | ForEach-Object {
        if (-not (Get-ChildItem -LiteralPath $_.FullName -Force -Recurse -ErrorAction SilentlyContinue)) {
            if ($VerboseReport) { Write-Host ("REMOVE EMPTY DIR: '{0}'" -f $_.FullName) }
            if ($Execute) { Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue }
        }
    }
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $repoRoot

Write-Section "SAMS Project Reorganization" 
Write-Host ("Repository Root: {0}" -f $repoRoot) -ForegroundColor DarkGray
Write-Host ("Mode: {0}" -f ($(if ($Execute) { 'EXECUTE (moving files)' } else { 'DRY-RUN (no changes, using -WhatIf)' }))) -ForegroundColor Yellow

# Record pre-reorg tree
$manifestDir = Join-Path $repoRoot "backups\archive\manifests"
Ensure-Directory $manifestDir
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$treeFile = Join-Path $manifestDir "pre_reorg_tree_$timestamp.txt"
Get-ChildItem -Recurse -Force | Select-Object FullName, Length, Mode | Format-Table -AutoSize | Out-String | Set-Content -Path $treeFile
Write-Host ("Saved tree manifest: {0}" -f $treeFile) -ForegroundColor DarkGray

# Target top-level directories
Ensure-Directory (Join-Path $repoRoot "apps")
Ensure-Directory (Join-Path $repoRoot "infra")
Ensure-Directory (Join-Path $repoRoot "docs")
Ensure-Directory (Join-Path $repoRoot "servers")
Ensure-Directory (Join-Path $repoRoot "database")
Ensure-Directory (Join-Path $repoRoot "scripts")

# 1) Applications -> apps/...
Write-Section "Move Applications"
Move-PathSafe (Join-Path $repoRoot "sams-backend") (Join-Path $repoRoot "apps\sams-backend")
Move-PathSafe (Join-Path $repoRoot "sams-java-backend") (Join-Path $repoRoot "apps\sams-java-backend")
Move-PathSafe (Join-Path $repoRoot "web") (Join-Path $repoRoot "apps\web")
Move-PathSafe (Join-Path $repoRoot "sams-mobile") (Join-Path $repoRoot "apps\sams-mobile")
Move-PathSafe (Join-Path $repoRoot "mobile-app") (Join-Path $repoRoot "apps\mobile-app")

# 2) Infrastructure -> infra/...
Write-Section "Unify Infrastructure"
Ensure-Directory (Join-Path $repoRoot "infra\docker")
Ensure-Directory (Join-Path $repoRoot "infra\kubernetes")
Ensure-Directory (Join-Path $repoRoot "infra\ansible")
Ensure-Directory (Join-Path $repoRoot "infra\monitoring")
Ensure-Directory (Join-Path $repoRoot "infra\terraform")

# Move root docker-compose.yml into infra/docker (rename if conflict)
if (Test-Path -LiteralPath (Join-Path $repoRoot "docker-compose.yml")) {
Move-PathSafe (Join-Path $repoRoot "windows_sams_server.py") (Join-Path $repoRoot "servers\windows_sams_server.py")
Move-PathSafe (Join-Path $repoRoot "windows_vm_sams_server.py") (Join-Path $repoRoot "servers\windows_vm_sams_server.py")

# Move legacy infrastructure tree pieces
Move-PathSafe (Join-Path $repoRoot "infrastructure\docker") (Join-Path $repoRoot "infra\docker")
Move-PathSafe (Join-Path $repoRoot "infrastructure\ansible") (Join-Path $repoRoot "infra\ansible")
Move-PathSafe (Join-Path $repoRoot "infrastructure\monitoring") (Join-Path $repoRoot "infra\monitoring")

# Merge kubernetes from both locations into infra/kubernetes
Move-DirContents (Join-Path $repoRoot "k8s") (Join-Path $repoRoot "infra\kubernetes")
Move-PathSafe (Join-Path $repoRoot "infrastructure\kubernetes") (Join-Path $repoRoot "infra\kubernetes")

# Terraform
Move-PathSafe (Join-Path $repoRoot "terraform") (Join-Path $repoRoot "infra\terraform")

# 3) Database related
Write-Section "Database"
Move-PathSafe (Join-Path $repoRoot "alembic.ini") (Join-Path $repoRoot "database\alembic.ini")
if (Test-Path -LiteralPath (Join-Path $repoRoot "migrations")) {
    Move-PathSafe (Join-Path $repoRoot "migrations") (Join-Path $repoRoot "database\alembic_migrations")
}

# 4) Servers / agents
Write-Section "Servers and Agents"
Move-PathSafe (Join-Path $repoRoot "servers") (Join-Path $repoRoot "servers")
Move-PathSafe (Join-Path $repoRoot "windows_sams_server.py") (Join-Path $repoRoot "servers\windows_sams_server.py")
Move-PathSafe (Join-Path $repoRoot "windows_vm_sams_server.py") (Join-Path $repoRoot "servers\windows_vm_sams_server.py")
Move-PathSafe (Join-Path $repoRoot "linux_sams_server.py") (Join-Path $repoRoot "servers\linux_sams_server.py")
Move-PathSafe (Join-Path $repoRoot "demo_server.py") (Join-Path $repoRoot "servers\demo_server.py")
Move-PathSafe (Join-Path $repoRoot "python_backend_server.py") (Join-Path $repoRoot "servers\python_backend_server.py")
Move-PathSafe (Join-Path $repoRoot "verify_sams_installation.py") (Join-Path $repoRoot "servers\verify_sams_installation.py")
Move-PathSafe (Join-Path $repoRoot "start_windows_monitor.bat") (Join-Path $repoRoot "servers\start_windows_monitor.bat")
Move-PathSafe (Join-Path $repoRoot "start_windows_monitor_192.168.1.10.bat") (Join-Path $repoRoot "servers\start_windows_monitor_192.168.1.10.bat")

# 5) Scripts - consolidate common launchers in scripts/launch
Write-Section "Scripts"
Ensure-Directory (Join-Path $repoRoot "scripts\launch")
Get-ChildItem -LiteralPath $repoRoot -File -Filter "*.bat" | Where-Object { $_.Name -match '^(launch|quick-start).*' } | ForEach-Object {
    Move-PathSafe $_.FullName (Join-Path $repoRoot "scripts\launch\$($_.Name)")
}

# 6) Documentation - merge 'documentation' into 'docs', move stray markdown and demo HTMLs
Write-Section "Documentation"
if (Test-Path -LiteralPath (Join-Path $repoRoot "documentation")) {
    Move-DirContents (Join-Path $repoRoot "documentation") (Join-Path $repoRoot "docs")
}
Ensure-Directory (Join-Path $repoRoot "docs\reports\misc")
Ensure-Directory (Join-Path $repoRoot "docs\demos")

# Move root markdown files except primary ones
Get-ChildItem -LiteralPath $repoRoot -File -Filter "*.md" | Where-Object { $_.Name -notin @('README.md','DIRECTORY_STRUCTURE.md') } | ForEach-Object {
    Move-PathSafe $_.FullName (Join-Path $repoRoot "docs\reports\misc\$($_.Name)")
}

# Move root HTML demos
Get-ChildItem -LiteralPath $repoRoot -File -Filter "*.html" | ForEach-Object {
    Move-PathSafe $_.FullName (Join-Path $repoRoot "docs\demos\$($_.Name)")
}

# 7) Backups stay as-is
Write-Section "Cleanup Empty Directories"
Cleanup-EmptyDirs $repoRoot

Write-Section "Done"
if (-not $Execute) {
    Write-Host "DRY-RUN completed. No files were moved. Re-run with -Execute to apply changes." -ForegroundColor Yellow
}


