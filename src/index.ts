export * from './tools/remotion-core.js';
export * from './tools/templates.js';
export * from './templates/index.js';
export * from './tools/audio-beat.js';
export * from './tools/gemini-tts.js';
export * from './server.js';
export * from './utils/logger.js';
export * from './utils/exec.js';
export * from './utils/python.js';

import { startServer } from './server.js';
import { logger } from './utils/logger.js';
import { fileURLToPath } from 'node:url';

// Check if file is being executed directly
const isDirectExecution = () => {
  try {
    const currentFile = fileURLToPath(import.meta.url);
    const entryFile = process.argv[1];
    return entryFile && (entryFile === currentFile || entryFile.endsWith('dist/index.js') || entryFile.endsWith('dist\\index.js'));
  } catch {
    return false;
  }
};

if (isDirectExecution()) {
  startServer().catch((error) => {
    logger.error('Fatal error starting Remotion MCP Server:', error);
    process.exit(1);
  });
}
