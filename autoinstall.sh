#!/bin/bash
# autoinstall.sh — Installer script for macOS (and Linux)
# Installs the Remotion MCP Server and the global Video Production Skill.

set -e

# Make sure output is in bold/color for readability
echo -e "\033[1;36m==================================================\033[0m"
echo -e "\033[1;36m       REMOTION MCP SERVER INSTALLER (macOS)      \033[0m"
echo -e "\033[1;36m==================================================\033[0m"

# 1. Verify Node.js is present
if ! command -v node &> /dev/null; then
    echo -e "\033[0;31m❌ Error: Node.js is not found. Please install Node.js via Homebrew or nodejs.org.\033[0m"
    echo "Brew command: brew install node"
    exit 1
fi

# 2. Check Python 3 and install pip dependencies
echo -e "\n\033[1;33m[1/3] Checking Python Dependencies...\033[0m"
if command -v python3 &> /dev/null; then
    echo "Found Python 3. Installing/updating required python libraries..."
    python3 -m pip install --upgrade pip
    python3 -m pip install librosa numpy scipy google-genai
    echo -e "\033[0;32m✅ Python dependencies installed.\033[0m"
else
    echo -e "\033[0;33m⚠️ Warning: python3 is not found. Audio beat analysis and Gemini TTS will fallback or fail until Python 3 is installed.\033[0m"
fi

# 3. Ensure Remotion Browser is installed
echo -e "\n\033[1;33m[2/3] Installing browser dependencies for Remotion...\033[0m"
npx remotion browser ensure || echo -e "\033[0;33m⚠️ Warning: Browser installation failed. Run 'npx remotion browser ensure' manually later.\033[0m"

# 4. Trigger the Cross-Platform Node Installer
echo -e "\n\033[1;33m[3/3] Running configuration installer...\033[0m"
node install.js

echo -e "\n\033[1;32m==================================================\033[0m"
echo -e "\033[1;32m  🎉 macOS Autoinstall Completed successfully!  \033[0m"
echo -e "\033[1;32m==================================================\033[0m"
