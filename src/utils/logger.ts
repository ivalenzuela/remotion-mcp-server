/**
 * Stdio-safe Logger for Remotion MCP Server.
 * All output MUST be written exclusively to process.stderr to preserve process.stdout
 * for JSON-RPC MCP transport protocol messages.
 */

export const logger = {
  info: (...args: unknown[]) => {
    const timestamp = new Date().toISOString();
    process.stderr.write(`[INFO] [${timestamp}] ${args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')}\n`);
  },
  warn: (...args: unknown[]) => {
    const timestamp = new Date().toISOString();
    process.stderr.write(`[WARN] [${timestamp}] ${args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')}\n`);
  },
  error: (...args: unknown[]) => {
    const timestamp = new Date().toISOString();
    process.stderr.write(`[ERROR] [${timestamp}] ${args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')}\n`);
  },
  debug: (...args: unknown[]) => {
    const timestamp = new Date().toISOString();
    process.stderr.write(`[DEBUG] [${timestamp}] ${args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')}\n`);
  },
};
