import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const testScaffoldDir = path.resolve('test_scaffold');
const outPath = path.join(testScaffoldDir, 'out', 'preview space test.png');

console.log('Testing path with spaces:', outPath);

const child = spawn('npx.cmd', [
  'remotion',
  'still',
  `"${path.join(testScaffoldDir, 'src/index.ts')}"`,
  `"MainComposition"`,
  `"${outPath}"`,
  '--frame=0',
  '--log=info'
], {
  cwd: testScaffoldDir,
  shell: true
});

child.stdout.on('data', d => console.log('stdout:', d.toString()));
child.stderr.on('data', d => console.log('stderr:', d.toString()));
child.on('close', code => {
  console.log('Exit code:', code);
  console.log('File created:', fs.existsSync(outPath));
  if (fs.existsSync(outPath)) {
    console.log('File size:', fs.statSync(outPath).size);
    fs.unlinkSync(outPath); // Clean up
  }
});
