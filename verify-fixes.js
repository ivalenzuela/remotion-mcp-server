import path from 'node:path';
import fs from 'node:fs';
import { handlePreviewFrame } from './dist/index.js';

async function runVerification() {
  const rootDir = process.cwd();
  const testScaffoldDir = path.join(rootDir, 'test_scaffold');

  console.log('===================================================');
  console.log('   STARTING MILESTONE 1 TARGETED FIX VERIFICATION  ');
  console.log('===================================================\n');

  // Verification A: Invalid Composition ID
  console.log('[TEST A] Testing invalid composition ID handling...');
  const invalidCompRes = await handlePreviewFrame({
    projectDir: testScaffoldDir,
    compositionId: 'NonExistentComp',
  });
  console.log('  -> Result:', JSON.stringify(invalidCompRes, null, 2));

  if (invalidCompRes.success) {
    throw new Error('Test A Failed: Expected failure for invalid composition ID');
  }
  if (invalidCompRes.code !== 'ERR_COMPOSITION_NOT_FOUND') {
    throw new Error(`Test A Failed: Expected code ERR_COMPOSITION_NOT_FOUND, got '${invalidCompRes.code}'`);
  }
  console.log('  -> TEST A PASSED: Returned ERR_COMPOSITION_NOT_FOUND as expected.\n');

  // Verification B: Output Path with Spaces
  console.log('[TEST B] Testing output path with spaces...');
  const spaceOutPath = path.join(testScaffoldDir, 'out', 'preview space test.png');
  if (fs.existsSync(spaceOutPath)) {
    fs.unlinkSync(spaceOutPath);
  }

  const spaceRes = await handlePreviewFrame({
    projectDir: testScaffoldDir,
    compositionId: 'MainComposition',
    frame: 0,
    outputPath: spaceOutPath,
  });
  console.log('  -> Result:', JSON.stringify(spaceRes, null, 2));

  if (!spaceRes.success) {
    throw new Error(`Test B Failed: Preview frame with spaces in path failed: ${spaceRes.error}`);
  }
  if (!fs.existsSync(spaceOutPath)) {
    throw new Error(`Test B Failed: Output file with spaces was not created at ${spaceOutPath}`);
  }
  const fileSize = fs.statSync(spaceOutPath).size;
  if (fileSize === 0) {
    throw new Error(`Test B Failed: Output file with spaces is empty (0 bytes)`);
  }
  console.log(`  -> TEST B PASSED: File created successfully at ${spaceOutPath} (${fileSize} bytes).\n`);

  // Verification C: Negative Frame Validation (Zod minimum(0))
  console.log('[TEST C] Testing Zod frame minimum(0) validation with negative frame...');
  const negFrameRes = await handlePreviewFrame({
    projectDir: testScaffoldDir,
    compositionId: 'MainComposition',
    frame: -5,
  });
  console.log('  -> Result:', JSON.stringify(negFrameRes, null, 2));

  if (negFrameRes.success) {
    throw new Error('Test C Failed: Expected failure for negative frame');
  }
  if (negFrameRes.code !== 'ERR_INVALID_INPUT') {
    throw new Error(`Test C Failed: Expected code ERR_INVALID_INPUT, got '${negFrameRes.code}'`);
  }
  console.log('  -> TEST C PASSED: Returned ERR_INVALID_INPUT as expected.\n');

  console.log('===================================================');
  console.log('   ALL TARGETED FIX VERIFICATIONS PASSED 100%!     ');
  console.log('===================================================\n');
}

runVerification().catch((err) => {
  console.error('Verification Failed:', err);
  process.exit(1);
});
