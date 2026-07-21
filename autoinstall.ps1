# autoinstall.ps1 — PowerShell Installer script for Windows
# Installs the Remotion MCP Server and the global Video Production Skill.

$ErrorActionPreference = "Stop"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "      REMOTION MCP SERVER INSTALLER (Windows)     " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Verify Node.js is present
if (-not (Get-Command "node" -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: Node.js is not found. Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    Exit 1
}

# 2. Check Python and install pip dependencies
Write-Host "`n[1/3] Checking Python Dependencies..." -ForegroundColor Yellow
if (Get-Command "python" -ErrorAction SilentlyContinue) {
    Write-Host "Found Python. Installing/updating required python libraries..."
    python -m pip install --upgrade pip
    python -m pip install librosa numpy scipy google-genai
    Write-Host "✅ Python dependencies installed." -ForegroundColor Green
} else {
    Write-Host "⚠️ Warning: python is not found. Audio beat analysis and Gemini TTS will fallback or fail until Python 3 is installed." -ForegroundColor Yellow
}

# 3. Ensure Remotion Browser is installed
Write-Host "`n[2/3] Installing browser dependencies for Remotion..." -ForegroundColor Yellow
try {
    npx remotion browser ensure
} catch {
    Write-Host "⚠️ Warning: Browser installation failed. Run 'npx remotion browser ensure' manually later." -ForegroundColor Yellow
}

# 4. Trigger the Cross-Platform Node Installer
Write-Host "`n[3/3] Running configuration installer..." -ForegroundColor Yellow
node install.js

Write-Host "`n==================================================" -ForegroundColor Green
Write-Host "  🎉 Windows Autoinstall Completed successfully!  " -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
