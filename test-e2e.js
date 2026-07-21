import path from 'node:path';
import fs from 'node:fs';
import { handleScaffoldProject, handlePreviewFrame, handleRenderVideo } from './dist/index.js';

async function runE2eTest() {
  const rootDir = process.cwd();
  const testScaffoldDir = path.join(rootDir, 'test_scaffold');

  console.log('=== Step 1: Testing remotion_scaffold_project ===');
  const scaffoldResult = await handleScaffoldProject({
    projectName: 'test_scaffold',
    template: 'tiktok-916',
    targetDir: rootDir,
  });
  console.log('Scaffold result:', JSON.stringify(scaffoldResult, null, 2));

  if (!scaffoldResult.success) {
    throw new Error(`Scaffold failed: ${scaffoldResult.error}`);
  }

  console.log('\n=== Step 2: Testing remotion_preview_frame ===');
  const frameResult = await handlePreviewFrame({
    projectDir: testScaffoldDir,
    compositionId: 'MainComposition',
    frame: 0,
  });
  console.log('Preview frame result:', JSON.stringify(frameResult, null, 2));

  if (!frameResult.success) {
    throw new Error(`Preview frame failed: ${frameResult.error}`);
  }

  if (!fs.existsSync(frameResult.frameImagePath)) {
    throw new Error(`Frame image file does not exist at ${frameResult.frameImagePath}`);
  }
  const frameSize = fs.statSync(frameResult.frameImagePath).size;
  console.log(`Frame image verified: ${frameResult.frameImagePath} (${frameSize} bytes)`);

  console.log('\n=== Step 3: Testing remotion_render_video ===');
  const videoResult = await handleRenderVideo({
    projectDir: testScaffoldDir,
    compositionId: 'MainComposition',
    outputPath: path.join(testScaffoldDir, 'out', 'test_video.mp4'),
  });
  console.log('Render video result:', JSON.stringify(videoResult, null, 2));

  if (!videoResult.success) {
    throw new Error(`Render video failed: ${videoResult.error}`);
  }

  if (!fs.existsSync(videoResult.videoPath)) {
    throw new Error(`Video file does not exist at ${videoResult.videoPath}`);
  }
  const videoSize = fs.statSync(videoResult.videoPath).size;
  console.log(`Video file verified: ${videoResult.videoPath} (${videoSize} bytes)`);

  console.log('\n=== ALL E2E TESTS PASSED SUCCESSFULLY! ===');
}

runE2eTest().catch((err) => {
  console.error('E2E Test Failed:', err);
  process.exit(1);
});
