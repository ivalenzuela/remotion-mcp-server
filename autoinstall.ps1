# autoinstall.ps1 — One-line automated installer for Windows PowerShell
# Usage: iwr -useb https://raw.githubusercontent.com/ivalenzuela/remotion-mcp-server/main/autoinstall.ps1 | iex

$ErrorActionPreference = "Continue"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   REMOTION MCP SERVER & SKILL — AUTO INSTALLER   " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Verify Git, Node, and npm
if (-not (Get-Command "git" -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: git is required but not installed. Please install Git for Windows." -ForegroundColor Red
    Exit 1
}

if (-not (Get-Command "node" -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: Node.js is required but not installed. Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    Exit 1
}

if (-not (Get-Command "npm" -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: npm is required but not installed." -ForegroundColor Red
    Exit 1
}

# 2. Determine target repository directory
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

# 3. Check Python and install required libraries
Write-Host "`n[1/3] Checking Python Dependencies..." -ForegroundColor Yellow
if (Get-Command "python" -ErrorAction SilentlyContinue) {
    Write-Host "Installing Python audio & AI packages (librosa, numpy, scipy, google-genai)..."
    python -m pip install --upgrade pip --quiet
    python -m pip install librosa numpy scipy google-genai --quiet
    Write-Host "✅ Python dependencies ready." -ForegroundColor Green
} else {
    Write-Host "⚠️ Warning: python is not found. Audio beat sync and Gemini TTS will require Python 3." -ForegroundColor Yellow
}

# 4. Ensure Remotion Browser
Write-Host "`n[2/3] Verifying Remotion Browser Dependencies..." -ForegroundColor Yellow
try {
    npx remotion browser ensure
} catch {
    Write-Host "⚠️ Warning: Browser check skipped." -ForegroundColor Yellow
}

# 5. Run Node.js Installer Engine
Write-Host "`n[3/3] Running Skill & MCP Config Installer..." -ForegroundColor Yellow
node install.js

Write-Host "`n==================================================" -ForegroundColor Green
Write-Host " 🎉 ALL DONE! Antigravity & Remotion MCP ready!  " -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
