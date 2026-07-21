import path from 'node:path';
import { handlePreviewFrame } from './src/tools/remotion-core.ts'; // or dist/index.js if built

const testScaffoldDir = path.resolve('test_scaffold');
console.log('Testing invalid composition ID...');
