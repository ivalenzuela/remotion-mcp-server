import path from 'node:path';
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { handleScaffoldProject, handlePreviewFrame, handleRenderVideo } from './dist/index.js';

function getMediaDimensions(filePath) {
  try {
    const cmd = `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0:s=x "${filePath}"`;
    const output = execSync(cmd, { encoding: 'utf-8' }).trim();
    const [widthStr, heightStr] = output.split('x');
    return {
      width: parseInt(widthStr, 10),
      height: parseInt(heightStr, 10),
      raw: output
    };
  } catch (err) {
    return { error: err.message };
  }
}

async function runChallengeTests() {
  const rootDir = process.cwd();
  const testBaseDir = path.join(rootDir, 'test_challenge_out');

  if (fs.existsSync(testBaseDir)) {
    fs.rmSync(testBaseDir, { recursive: true, force: true });
  }
  fs.mkdirSync(testBaseDir, { recursive: true });

  const testResults = {
    scaffold: [],
    previewFrame: [],
    renderVideo: [],
    edgeCases: []
  };

  console.log('====================================================');
  console.log('   STARTING MILESTONE 1 EMPIRICAL CHALLENGE TESTS   ');
  console.log('====================================================\n');

  // --- 1. SCAFFOLDING TESTS ---
  const templatesToTest = [
    { template: 'tiktok-916', projectName: 'proj_tiktok_916', expectedWidth: 1080, expectedHeight: 1920 },
    { template: 'youtube-169', projectName: 'proj_youtube_169', expectedWidth: 1920, expectedHeight: 1080 },
    { template: 'social-11', projectName: 'proj_social_11', expectedWidth: 1080, expectedHeight: 1080 }
  ];

  for (const t of templatesToTest) {
    console.log(`[TEST SCAFFOLD] Scaffolding ${t.template}...`);
    const startTime = Date.now();
    const scaffoldRes = await handleScaffoldProject({
      projectName: t.projectName,
      template: t.template,
      targetDir: testBaseDir,
    });
    const durationMs = Date.now() - startTime;

    const projPath = path.join(testBaseDir, t.projectName);
    const hasPkgJson = fs.existsSync(path.join(projPath, 'package.json'));
    const hasRoot = fs.existsSync(path.join(projPath, 'src', 'Root.tsx'));
    const hasComp = fs.existsSync(path.join(projPath, 'src', 'Composition.tsx'));

    const pass = scaffoldRes.success && hasPkgJson && hasRoot && hasComp;

    const item = {
      template: t.template,
      projectName: t.projectName,
      success: scaffoldRes.success,
      durationMs,
      hasPkgJson,
      hasRoot,
      hasComp,
      projectPath: projPath,
      pass,
      expectedWidth: t.expectedWidth,
      expectedHeight: t.expectedHeight
    };
    testResults.scaffold.push(item);
    console.log(`  -> Result: ${pass ? 'PASS' : 'FAIL'} (${durationMs}ms)\n`);
    if (!pass) {
      throw new Error(`Scaffold failed for ${t.template}: ${scaffoldRes.error}`);
    }
  }

  // --- 2. PREVIEW FRAME TESTS ---
  const previewFramesToTest = [
    {
      proj: testResults.scaffold[0], // tiktok-916 (1080x1920)
      frame: 15,
      outName: 'frame_tiktok_f15.png',
      props: { title: 'TikTok Frame 15', subtitle: 'Empirical Challenge' }
    },
    {
      proj: testResults.scaffold[1], // youtube-169 (1920x1080)
      frame: 45,
      outName: 'frame_youtube_f45.png',
      props: { title: 'YouTube Frame 45', subtitle: 'Dynamic Props Preview', accentColor: '#ff0000' }
    },
    {
      proj: testResults.scaffold[2], // social-11 (1080x1080)
      frame: 30,
      outName: 'frame_social_f30.png',
      props: { title: 'Social 1:1 Frame 30', subtitle: 'Square Aspect Ratio' }
    }
  ];

  for (const item of previewFramesToTest) {
    const outPath = path.join(testBaseDir, item.outName);
    console.log(`[TEST PREVIEW FRAME] Rendering ${item.proj.template} frame ${item.frame} to ${item.outName}...`);
    
    const prevRes = await handlePreviewFrame({
      projectDir: item.proj.projectPath,
      compositionId: 'MainComposition',
      frame: item.frame,
      outputPath: outPath,
      imageFormat: 'png',
      props: item.props
    });

    const fileExists = fs.existsSync(outPath);
    const fileSize = fileExists ? fs.statSync(outPath).size : 0;
    const dims = fileExists ? getMediaDimensions(outPath) : {};

    const pass = prevRes.success &&
      fileExists &&
      fileSize > 0 &&
      dims.width === item.proj.expectedWidth &&
      dims.height === item.proj.expectedHeight;

    const record = {
      template: item.proj.template,
      frame: item.frame,
      outPath,
      success: prevRes.success,
      renderTimeMs: prevRes.renderTimeMs,
      fileExists,
      fileSize,
      actualWidth: dims.width,
      actualHeight: dims.height,
      expectedWidth: item.proj.expectedWidth,
      expectedHeight: item.proj.expectedHeight,
      pass
    };
    testResults.previewFrame.push(record);

    console.log(`  -> Result: ${pass ? 'PASS' : 'FAIL'} | Size: ${fileSize} B | Dims: ${dims.width}x${dims.height} (Expected: ${item.proj.expectedWidth}x${item.proj.expectedHeight})`);
    console.log(`  -> Render time: ${prevRes.renderTimeMs}ms\n`);

    if (!pass) {
      throw new Error(`Preview frame failed for ${item.proj.template} frame ${item.frame}`);
    }
  }

  // --- 3. RENDER VIDEO TESTS WITH DYNAMIC PROPS ---
  const videoRendersToTest = [
    {
      proj: testResults.scaffold[0], // tiktok-916 (1080x1920)
      outName: 'video_tiktok.mp4',
      props: {
        title: 'TikTok Dynamic Video',
        subtitle: 'Tested with Custom Props',
        accentColor: '#00ffcc',
        backgroundColor: '#110022'
      }
    },
    {
      proj: testResults.scaffold[1], // youtube-169 (1920x1080)
      outName: 'video_youtube.mp4',
      props: {
        title: 'YouTube 16:9 Video',
        subtitle: 'Custom Render Props Test',
        accentColor: '#ff9900',
        backgroundColor: '#000000'
      }
    },
    {
      proj: testResults.scaffold[2], // social-11 (1080x1080)
      outName: 'video_social.mp4',
      props: {
        title: 'Social 1:1 Video',
        subtitle: 'Square Format Render',
        accentColor: '#ff0077',
        backgroundColor: '#1a1a1a'
      }
    }
  ];

  for (const item of videoRendersToTest) {
    const outPath = path.join(testBaseDir, item.outName);
    console.log(`[TEST RENDER VIDEO] Rendering ${item.proj.template} video to ${item.outName} with custom props...`);

    const videoRes = await handleRenderVideo({
      projectDir: item.proj.projectPath,
      compositionId: 'MainComposition',
      outputPath: outPath,
      props: item.props
    });

    const fileExists = fs.existsSync(outPath);
    const fileSize = fileExists ? fs.statSync(outPath).size : 0;
    const dims = fileExists ? getMediaDimensions(outPath) : {};

    const pass = videoRes.success &&
      fileExists &&
      fileSize > 0 &&
      dims.width === item.proj.expectedWidth &&
      dims.height === item.proj.expectedHeight;

    const record = {
      template: item.proj.template,
      outPath,
      success: videoRes.success,
      renderTimeMs: videoRes.renderTimeMs,
      fileExists,
      fileSize,
      actualWidth: dims.width,
      actualHeight: dims.height,
      expectedWidth: item.proj.expectedWidth,
      expectedHeight: item.proj.expectedHeight,
      pass
    };
    testResults.renderVideo.push(record);

    console.log(`  -> Result: ${pass ? 'PASS' : 'FAIL'} | Size: ${fileSize} B | Dims: ${dims.width}x${dims.height} (Expected: ${item.proj.expectedWidth}x${item.proj.expectedHeight})`);
    console.log(`  -> Render time: ${videoRes.renderTimeMs}ms\n`);

    if (!pass) {
      throw new Error(`Render video failed for ${item.proj.template}`);
    }
  }

  // --- 4. STRESS & EDGE CASE TESTS ---
  console.log('[TEST EDGE CASE] Non-existent project directory...');
  const edge1 = await handlePreviewFrame({
    projectDir: path.join(testBaseDir, 'non_existent_folder'),
    compositionId: 'MainComposition'
  });
  const edge1Pass = !edge1.success && edge1.code === 'ERR_PROJECT_NOT_FOUND';
  console.log(`  -> Result: ${edge1Pass ? 'PASS' : 'FAIL'} (code: ${edge1.code})\n`);
  testResults.edgeCases.push({ case: 'Non-existent project dir', pass: edge1Pass, result: edge1 });

  console.log('[TEST EDGE CASE] Invalid composition ID...');
  const edge2 = await handlePreviewFrame({
    projectDir: testResults.scaffold[0].projectPath,
    compositionId: 'NonExistentComposition'
  });
  const edge2Pass = !edge2.success && edge2.code === 'ERR_COMPOSITION_NOT_FOUND';
  console.log(`  -> Result: ${edge2Pass ? 'PASS' : 'FAIL'} (code: ${edge2.code})\n`);
  testResults.edgeCases.push({ case: 'Invalid composition ID', pass: edge2Pass, result: edge2 });

  console.log('====================================================');
  console.log('   ALL MILESTONE 1 CHALLENGE TESTS COMPLETED!      ');
  console.log('====================================================\n');

  // Output full summary JSON to stdout for recording
  console.log('JSON_SUMMARY_START');
  console.log(JSON.stringify(testResults, null, 2));
  console.log('JSON_SUMMARY_END');
}

runChallengeTests().catch((err) => {
  console.error('Challenge Test Failed:', err);
  process.exit(1);
});
