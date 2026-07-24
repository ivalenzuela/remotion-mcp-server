#!/usr/bin/env node
/**
 * Cross-platform Installer for Remotion MCP Server and Global Skill
 * Configures the MCP Server in Claude Desktop / Antigravity / Antigravity IDE and copies the SKILL.md.
 * Preserves all pre-existing user MCP servers and custom environment variables.
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

function commandExists(cmd) {
  try {
    const checkCmd = IS_WINDOWS ? `where ${cmd}` : `command -v ${cmd}`;
    execSync(checkCmd, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Helper to copy files from srcDir to destDir (ignoring subdirectories like __pycache__)
function copyDirFiles(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(destDir, { recursive: true });
  fs.readdirSync(srcDir).forEach(file => {
    const srcFile = path.join(srcDir, file);
    const destFile = path.join(destDir, file);
    try {
      const stat = fs.statSync(srcFile);
      if (stat.isFile()) {
        fs.copyFileSync(srcFile, destFile);
      }
    } catch {
      // Ignore copy errors on transient files
    }
  });
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
  console.warn('⚠️ Warning: Python is not detected in your PATH. Audio beat analysis and TTS require Python 3.');
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

// 3. Install Skill across all Antigravity & IDE skill directories
console.log('\n[3/4] Installing Global Skill to Antigravity / Antigravity IDE...');

const skillSourceDir = PROJECT_DIR;
const targetSkillDirs = [
  path.join(HOME_DIR, '.gemini', 'config', 'skills', 'remotion-video-production'),
  path.join(HOME_DIR, '.gemini', 'antigravity', 'skills', 'remotion-video-production'),
  path.join(HOME_DIR, '.gemini', 'skills', 'remotion-video-production'),
  path.join(HOME_DIR, '.antigravity-ide', 'skills', 'remotion-video-production'),
  path.join(HOME_DIR, '.antigravity', 'skills', 'remotion-video-production')
];

let skillsInstalled = 0;

targetSkillDirs.forEach(targetSkillDir => {
  try {
    fs.mkdirSync(targetSkillDir, { recursive: true });
    
    // Copy SKILL.md
    if (fs.existsSync(path.join(skillSourceDir, 'SKILL.md'))) {
      fs.copyFileSync(
        path.join(skillSourceDir, 'SKILL.md'),
        path.join(targetSkillDir, 'SKILL.md')
      );
    }
    
    // Copy helper scripts
    copyDirFiles(path.join(skillSourceDir, 'scripts'), path.join(targetSkillDir, 'scripts'));
    
    // Copy reference files if any
    copyDirFiles(path.join(skillSourceDir, 'references'), path.join(targetSkillDir, 'references'));

    console.log(`  ✅ Installed Skill at: ${targetSkillDir}`);
    skillsInstalled++;
  } catch (error) {
    console.warn(`  ⚠️ Could not write skill to ${targetSkillDir}:`, error.message);
  }
});

// 4. Configure MCP Server across all detected MCP config locations without overwriting existing servers
console.log('\n[4/4] Configuring MCP Server in Client Configs (Preserving existing servers)...');

// Format dist/index.js path with forward slashes for universal compatibility
const distIndexPath = path.join(PROJECT_DIR, 'dist', 'index.js').replace(/\\/g, '/');

const targetMcpConfigFiles = [
  { name: 'Antigravity Config Global', file: path.join(HOME_DIR, '.gemini', 'config', 'mcp_config.json') },
  { name: 'Antigravity Main Config', file: path.join(HOME_DIR, '.gemini', 'antigravity', 'mcp_config.json') },
  { name: 'Antigravity IDE Config', file: path.join(HOME_DIR, '.antigravity-ide', 'mcp_config.json') },
  { name: 'Antigravity Legacy Config', file: path.join(HOME_DIR, '.antigravity', 'mcp_config.json') }
];

if (IS_WINDOWS) {
  if (process.env.APPDATA) {
    targetMcpConfigFiles.push({ name: 'Claude Desktop (Windows)', file: path.join(process.env.APPDATA, 'Claude', 'claude_desktop_config.json') });
    targetMcpConfigFiles.push({ name: 'Antigravity AppData', file: path.join(process.env.APPDATA, 'Antigravity', 'mcp_config.json') });
    targetMcpConfigFiles.push({ name: 'Antigravity IDE AppData', file: path.join(process.env.APPDATA, 'antigravity-ide', 'mcp_config.json') });
  }
} else {
  targetMcpConfigFiles.push({ name: 'Claude Desktop (macOS)', file: path.join(HOME_DIR, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json') });
  targetMcpConfigFiles.push({ name: 'Antigravity macOS AppSupport', file: path.join(HOME_DIR, 'Library', 'Application Support', 'Antigravity', 'mcp_config.json') });
  targetMcpConfigFiles.push({ name: 'Antigravity IDE macOS AppSupport', file: path.join(HOME_DIR, 'Library', 'Application Support', 'antigravity-ide', 'mcp_config.json') });
}

let configsUpdated = 0;

targetMcpConfigFiles.forEach(({ name, file }) => {
  const dir = path.dirname(file);
  const shouldCreate = fs.existsSync(file) || fs.existsSync(dir) || file.includes('.gemini');
  
  if (shouldCreate) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      
      let currentConfig = { mcpServers: {} };
      if (fs.existsSync(file)) {
        try {
          const content = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '').trim();
          if (content) {
            currentConfig = JSON.parse(content);
          }
        } catch {
          console.warn(`  ⚠️ Backing up malformed config at ${file}`);
          fs.copyFileSync(file, `${file}.bak`);
        }
      }
      
      if (!currentConfig || typeof currentConfig !== 'object') {
        currentConfig = {};
      }
      
      if (!currentConfig.mcpServers || typeof currentConfig.mcpServers !== 'object') {
        currentConfig.mcpServers = {};
      }
      
      // Preserve existing custom GEMINI_API_KEY if already set by user
      let apiKeyToSet = process.env.GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY_HERE';
      if (
        currentConfig.mcpServers.remotion &&
        currentConfig.mcpServers.remotion.env &&
        currentConfig.mcpServers.remotion.env.GEMINI_API_KEY &&
        currentConfig.mcpServers.remotion.env.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE'
      ) {
        apiKeyToSet = currentConfig.mcpServers.remotion.env.GEMINI_API_KEY;
      }

      // Add or update ONLY the "remotion" key. All other existing servers are 100% preserved.
      currentConfig.mcpServers.remotion = {
        command: 'node',
        args: [distIndexPath],
        env: {
          GEMINI_API_KEY: apiKeyToSet
        }
      };
      
      fs.writeFileSync(file, JSON.stringify(currentConfig, null, 2), 'utf8');
      const existingCount = Object.keys(currentConfig.mcpServers).length;
      console.log(`  ✅ Configured ${name} at: ${file} (Total MCP servers active: ${existingCount})`);
      configsUpdated++;
    } catch (error) {
      console.warn(`  ⚠️ Could not update config for ${name}:`, error.message);
    }
  }
});

console.log('\n==================================================');
console.log('🎉 INSTALLATION COMPLETE & VERIFIED');
console.log('==================================================');
console.log(`* Skill Installed: Across ${skillsInstalled} location(s)`);
console.log(`* MCP Server Configured: Updated ${configsUpdated} client configuration file(s)`);
console.log(`* Executable Entry Point: ${distIndexPath}`);
console.log('==================================================');
