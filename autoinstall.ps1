# autoinstall.ps1 — One-line automated installer for Windows PowerShell with Auto-Dependency Installation
# Usage: iwr -useb https://raw.githubusercontent.com/ivalenzuela/remotion-mcp-server/main/autoinstall.ps1 | iex

$ErrorActionPreference = "Continue"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   REMOTION MCP SERVER & SKILL — AUTO INSTALLER   " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

function Refresh-Path {
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

function Install-WithWingetOrChoco($wingetId, $chocoName) {
    if (Get-Command "winget" -ErrorAction SilentlyContinue) {
        Write-Host "Installing $wingetId via Winget..." -ForegroundColor Yellow
        winget install --id $wingetId -e --source winget --accept-package-agreements --accept-source-agreements --silent
    } elseif (Get-Command "choco" -ErrorAction SilentlyContinue) {
        Write-Host "Installing $chocoName via Chocolatey..." -ForegroundColor Yellow
        choco install $chocoName -y
    } else {
        Write-Host "Winget/Choco not found. Auto-installing Chocolatey..." -ForegroundColor Yellow
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
        Refresh-Path
        choco install $chocoName -y
    }
    Refresh-Path
}

# 1. Check & Auto-Install Git
if (-not (Get-Command "git" -ErrorAction SilentlyContinue)) {
    Write-Host "📦 Git not detected. Auto-installing Git..." -ForegroundColor Yellow
    Install-WithWingetOrChoco "Git.Git" "git"
}
Write-Host "✅ Git: OK" -ForegroundColor Green

# 2. Check & Auto-Install Node.js & npm
if ((-not (Get-Command "node" -ErrorAction SilentlyContinue)) -or (-not (Get-Command "npm" -ErrorAction SilentlyContinue))) {
    Write-Host "📦 Node.js / npm not detected. Auto-installing Node.js..." -ForegroundColor Yellow
    Install-WithWingetOrChoco "OpenJS.NodeJS" "nodejs"
}
Write-Host "✅ Node.js & npm: OK" -ForegroundColor Green

# 3. Check & Auto-Install Python
if (-not (Get-Command "python" -ErrorAction SilentlyContinue)) {
    Write-Host "📦 Python not detected. Auto-installing Python 3..." -ForegroundColor Yellow
    Install-WithWingetOrChoco "Python.Python.3.12" "python3"
}
Write-Host "✅ Python: OK" -ForegroundColor Green

# Install Python audio & AI packages
Write-Host "`n[1/3] Installing Python audio & AI dependencies (librosa, numpy, scipy, google-genai)..." -ForegroundColor Yellow
python -m pip install --upgrade pip --quiet
python -m pip install librosa numpy scipy google-genai --quiet
Write-Host "✅ Python packages ready." -ForegroundColor Green

# 4. Determine target repository directory
$RepoUrl = "https://github.com/ivalenzuela/remotion-mcp-server.git"
$TargetDir = ""

if ((Test-Path "package.json") -and (Select-String -Path "package.json" -Pattern '"name": "remotion-mcp-server"' -Quiet)) {
    $TargetDir = (Get-Location).Path
    Write-Host "📂 Installing inside current repository directory: $TargetDir" -ForegroundColor Blue
} else {
    $TargetDir = Join-Path $HOME ".remotion-mcp-server"
    Write-Host "📂 Setting up permanent installation at: $TargetDir" -ForegroundColor Blue
    if (Test-Path (Join-Path $TargetDir ".git")) {
        Write-Host "Updating existing repository..."
        Set-Location $TargetDir
        git pull origin main
    } else {
        Write-Host "Cloning repository from $RepoUrl..."
        git clone $RepoUrl $TargetDir
        Set-Location $TargetDir
    }
}

# 5. Ensure Remotion Browser
Write-Host "`n[2/3] Verifying Remotion Browser Dependencies..." -ForegroundColor Yellow
try {
    npx remotion browser ensure
} catch {
    Write-Host "⚠️ Warning: Browser check skipped." -ForegroundColor Yellow
}

# 6. Run Node.js Installer Engine
Write-Host "`n[3/3] Running Skill & MCP Config Installer..." -ForegroundColor Yellow
node install.js

Write-Host "`n==================================================" -ForegroundColor Green
Write-Host " 🎉 ALL DONE! Antigravity & Remotion MCP ready!  " -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
