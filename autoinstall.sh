#!/usr/bin/env bash
# autoinstall.sh — One-line automated installer for macOS & Linux with Auto-Dependency Installation
# Usage: curl -fsSL https://raw.githubusercontent.com/ivalenzuela/remotion-mcp-server/main/autoinstall.sh | bash

set -e

echo -e "\033[1;36m==================================================\033[0m"
echo -e "\033[1;36m   REMOTION MCP SERVER & SKILL — AUTO INSTALLER   \033[0m"
echo -e "\033[1;36m==================================================\033[0m"

# Ensure Homebrew environment paths if present on Apple Silicon or Intel
if [ -d "/opt/homebrew/bin" ]; then
    export PATH="/opt/homebrew/bin:$PATH"
fi
if [ -d "/usr/local/bin" ]; then
    export PATH="/usr/local/bin:$PATH"
fi

# Function to ensure Homebrew is available on macOS
ensure_homebrew() {
    if ! command -v brew &> /dev/null; then
        echo -e "\033[1;33m🍺 Homebrew not detected. Auto-installing Homebrew...\033[0m"
        NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" || true
        if [ -d "/opt/homebrew/bin" ]; then
            export PATH="/opt/homebrew/bin:$PATH"
        fi
        if [ -d "/usr/local/bin" ]; then
            export PATH="/usr/local/bin:$PATH"
        fi
    fi
}

# 1. Check & Auto-Install Git
if ! command -v git &> /dev/null; then
    echo -e "\033[1;33m📦 Git not detected. Auto-installing Git...\033[0m"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        ensure_homebrew
        brew install git
    elif command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y git
    elif command -v yum &> /dev/null; then
        sudo yum install -y git
    fi
fi
echo -e "\033[0;32m✅ Git: OK\033[0m"

# 2. Check & Auto-Install Node.js & npm
if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
    echo -e "\033[1;33m📦 Node.js / npm not detected. Auto-installing Node.js...\033[0m"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        ensure_homebrew
        brew install node
    elif command -v apt-get &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif command -v yum &> /dev/null; then
        curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
        sudo yum install -y nodejs
    fi
fi
echo -e "\033[0;32m✅ Node.js & npm: OK\033[0m"

# 3. Check & Auto-Install Python 3
if ! command -v python3 &> /dev/null; then
    echo -e "\033[1;33m📦 Python 3 not detected. Auto-installing Python 3...\033[0m"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        ensure_homebrew
        brew install python
    elif command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y python3 python3-pip
    elif command -v yum &> /dev/null; then
        sudo yum install -y python3 python3-pip
    fi
fi
echo -e "\033[0;32m✅ Python 3: OK\033[0m"

# Install Python audio & AI packages
echo -e "\n\033[1;33m[1/3] Installing Python audio & AI dependencies (librosa, numpy, scipy, google-genai)...\033[0m"
python3 -m pip install --upgrade pip --quiet || true
python3 -m pip install librosa numpy scipy google-genai --quiet || true
echo -e "\033[0;32m✅ Python packages ready.\033[0m"

# 4. Determine target repository directory
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

# 5. Ensure Remotion Chromium Browser
echo -e "\n\033[1;33m[2/3] Verifying Remotion Browser Dependencies...\033[0m"
npx remotion browser ensure || true

# 6. Run Node.js Installer Engine
echo -e "\n\033[1;33m[3/3] Running Skill & MCP Config Installer...\033[0m"
node install.js

echo -e "\n\033[1;32m==================================================\033[0m"
echo -e "\033[1;32m 🎉 ALL DONE! Antigravity & Remotion MCP ready!  \033[0m"
echo -e "\033[1;32m==================================================\033[0m"
