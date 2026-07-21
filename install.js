#!/usr/bin/env node
/**
 * Cross-platform Installer for Remotion MCP Server and Global Skill
 * Configures the MCP Server in Claude Desktop / Antigravity and copies the SKILL.md.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

const IS_WINDOWS = process.platform === 'win32';
const HOME_DIR = os.homedir();
const PROJECT_DIR = process.cwd();

console.log('==================================================');
console.log('REMOTION MCP SERVER & SKILL - AUTOINSTALLER');
console.log('==================================================');
console.log(`OS: ${process.platform} (${os.release()})`);
console.log(`Working Directory: ${PROJECT_DIR}\n`);

// Helper to check command availability
function commandExists(cmd) {
  try {
    const checkCmd = IS_WINDOWS ? `where ${cmd}` : `command -v ${cmd}`;
    execSync(checkCmd, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// 1. Verify Prerequisites
console.log('[1/4] Verifying Prerequisites...');
if (!commandExists('node')) {
  console.error('❌ Error: Node.js is not installed. Please install Node.js first.');
  process.exit(1);
}
console.log('✅ Node.js: OK');

if (!commandExists('npm')) {
  console.error('❌ Error: npm is not installed.');
  process.exit(1);
}
console.log('✅ npm: OK');

const hasPython = commandExists('python') || commandExists('python3');
if (!hasPython) {
  console.warn('⚠️ Warning: Python is not detected in your PATH. Audio beat analysis and TTS requires Python 3.');
} else {
  console.log('✅ Python: OK');
}

// 2. Build the MCP Server project
console.log('\n[2/4] Compiling MCP Server...');
try {
  console.log('Running npm install...');
  execSync('npm install', { stdio: 'inherit' });
  console.log('Building project with tsup...');
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ MCP Server compiled successfully.');
} catch (error) {
  console.error('❌ Error compiling MCP Server:', error.message);
  process.exit(1);
}

// 3. Install the Global Skill for Antigravity
console.log('\n[3/4] Installing Global Skill...');
const skillSourceDir = PROJECT_DIR;
const targetSkillDir = path.join(HOME_DIR, '.gemini', 'config', 'skills', 'remotion-video-production');

try {
  fs.mkdirSync(targetSkillDir, { recursive: true });
  
  // Copy SKILL.md
  fs.copyFileSync(
    path.join(skillSourceDir, 'SKILL.md'),
    path.join(targetSkillDir, 'SKILL.md')
  );
  
  // Copy scripts
  const scriptsSrc = path.join(skillSourceDir, 'scripts');
  const scriptsDest = path.join(targetSkillDir, 'scripts');
  if (fs.existsSync(scriptsSrc)) {
    fs.mkdirSync(scriptsDest, { recursive: true });
    fs.readdirSync(scriptsSrc).forEach(file => {
      fs.copyFileSync(path.join(scriptsSrc, file), path.join(scriptsDest, file));
    });
  }
  
  console.log(`✅ Skill successfully installed at: ${targetSkillDir}`);
} catch (error) {
  console.error('⚠️ Warning: Failed to install global SKILL to Antigravity directory:', error.message);
}

// 4. Configure MCP Clients
console.log('\n[4/4] Configuring MCP Clients...');

const mcpConfig = {
  command: 'node',
  args: [path.join(PROJECT_DIR, 'dist', 'index.js')],
  env: {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY_HERE'
  }
};

// Target Config Files
const pathsToUpdate = [];

// A. Claude Desktop Config
if (IS_WINDOWS) {
  if (process.env.APPDATA) {
    pathsToUpdate.push({
      name: 'Claude Desktop (Windows)',
      file: path.join(process.env.APPDATA, 'Claude', 'claude_desktop_config.json')
    });
  }
} else {
  pathsToUpdate.push({
    name: 'Claude Desktop (macOS)',
    file: path.join(HOME_DIR, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json')
  });
}

// B. Antigravity Global Customizations Config
pathsToUpdate.push({
  name: 'Antigravity (Global Config)',
  file: path.join(HOME_DIR, '.gemini', 'config', 'mcp_config.json')
});

let updatedCount = 0;

pathsToUpdate.forEach(({ name, file }) => {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    
    let currentConfig = { mcpServers: {} };
    if (fs.existsSync(file)) {
      try {
        const content = fs.readFileSync(file, 'utf8').trim();
        if (content) {
          currentConfig = JSON.parse(content);
        }
      } catch (parseError) {
        console.warn(`⚠️ Warning: Existing file ${file} is not valid JSON. Backing up and overwriting.`);
        fs.copyFileSync(file, `${file}.bak`);
      }
    }
    
    if (!currentConfig.mcpServers) {
      currentConfig.mcpServers = {};
    }
    
    // Inject or update
    currentConfig.mcpServers.remotion = mcpConfig;
    
    fs.writeFileSync(file, JSON.stringify(currentConfig, null, 2), 'utf8');
    console.log(`✅ Configured ${name} at: ${file}`);
    updatedCount++;
  } catch (error) {
    console.error(`❌ Failed to update config for ${name}:`, error.message);
  }
});

console.log('\n==================================================');
console.log('🎉 INSTALLATION COMPLETED');
console.log('==================================================');
console.log(`* Global Skill: Installed to ${targetSkillDir}`);
console.log(`* MCP Server Configurations: Updated ${updatedCount} config file(s)`);
console.log('\n👉 Next steps:');
console.log('1. If you use Claude Desktop, restart the app to load the new tools.');
console.log('2. Ensure Python packages are installed: pip install librosa numpy scipy google-genai');
console.log('3. Ensure Chromium is installed: npx remotion browser ensure');
console.log('==================================================');
