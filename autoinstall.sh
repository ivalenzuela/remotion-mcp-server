#!/usr/bin/env bash
# autoinstall.sh — One-line automated installer for macOS & Linux
# Usage: curl -fsSL https://raw.githubusercontent.com/ivalenzuela/remotion-mcp-server/main/autoinstall.sh | bash

set -e

echo -e "\033[1;36m==================================================\033[0m"
echo -e "\033[1;36m   REMOTION MCP SERVER & SKILL — AUTO INSTALLER   \033[0m"
echo -e "\033[1;36m==================================================\033[0m"

# 1. Check Git, Node, and npm
if ! command -v git &> /dev/null; then
    echo -e "\033[0;31m❌ Error: git is required but not installed.\033[0m"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo -e "\033[0;31m❌ Error: Node.js is required but not installed.\033[0m"
    echo "Install Node.js via Homebrew: brew install node"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "\033[0;31m❌ Error: npm is required but not installed.\033[0m"
    exit 1
fi

# 2. Determine target repository directory
REPO_URL="https://github.com/ivalenzuela/remotion-mcp-server.git"
TARGET_DIR=""

if [ -f "package.json" ] && grep -q '"name": "remotion-mcp-server"' package.json; then
    TARGET_DIR="$PWD"
    echo -e "📂 Installing inside current repository directory: \033[1;34m$TARGET_DIR\033[0m"
else
    TARGET_DIR="$HOME/.remotion-mcp-server"
    echo -e "📂 Setting up permanent installation at: \033[1;34m$TARGET_DIR\033[0m"
    if [ -d "$TARGET_DIR/.git" ]; then
        echo "Updating existing repository..."
        cd "$TARGET_DIR"
        git pull origin main || true
    else
        echo "Cloning repository from $REPO_URL..."
        git clone "$REPO_URL" "$TARGET_DIR"
        cd "$TARGET_DIR"
    fi
fi

# 3. Check Python 3 and install required libraries
echo -e "\n\033[1;33m[1/3] Checking Python Dependencies...\033[0m"
if command -v python3 &> /dev/null; then
    echo "Installing Python audio & AI packages (librosa, numpy, scipy, google-genai)..."
    python3 -m pip install --upgrade pip --quiet || true
    python3 -m pip install librosa numpy scipy google-genai --quiet || true
    echo -e "\033[0;32m✅ Python dependencies ready.\033[0m"
else
    echo -e "\033[0;33m⚠️ Warning: python3 is not found. Audio beat sync and Gemini TTS will require Python 3.\033[0m"
fi

# 4. Ensure Remotion Chromium Browser
echo -e "\n\033[1;33m[2/3] Verifying Remotion Browser Dependencies...\033[0m"
npx remotion browser ensure || true

# 5. Run Node.js Installer Engine
echo -e "\n\033[1;33m[3/3] Running Skill & MCP Config Installer...\033[0m"
node install.js

echo -e "\n\033[1;32m==================================================\033[0m"
echo -e "\033[1;32m 🎉 ALL DONE! Antigravity & Remotion MCP ready!  \033[0m"
echo -e "\033[1;32m==================================================\033[0m"
