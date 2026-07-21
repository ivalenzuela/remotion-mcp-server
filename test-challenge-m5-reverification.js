import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  handleScaffoldProject,
  handleGenerateTts,
  handleAnalyzeAudio,
  handlePreviewFrame,
  handleRenderVideo,
  createRemotionMcpServer,
} from './dist/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runChallengeSuite() {
  console.log('================================================================');
  console.log('  EMPIRICAL CHALLENGER 2: M5 RE-VERIFICATION SUITE             ');
  console.log('================================================================\n');

  const testWorkspace = path.join(__dirname, `test_challenge_workspace_${Date.now()}`);
  fs.mkdirSync(testWorkspace, { recursive: true });

  let totalAssertions = 0;
  let passedAssertions = 0;

  function assert(condition, message) {
    totalAssertions++;
    if (condition) {
      console.log(`  ✓ [PASS] ${message}`);
      passedAssertions++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  try {
    // -------------------------------------------------------------------------
    // PART 1: ERROR CONTRACT & ERROR CODE / CODE DUAL FIELD VERIFICATION
    // -------------------------------------------------------------------------
    console.log('--- PART 1: Error Contracts & Dual Code/ErrorCode Verification ---');

    // Test 1.1: Invalid input schema for remotion_scaffold_project
    const errScaffold = await handleScaffoldProject({ invalid: 123 });
    assert(errScaffold.success === false, 'scaffold handles invalid input');
    assert(typeof errScaffold.code === 'string' && errScaffold.code === 'ERR_INVALID_INPUT', 'scaffold code is ERR_INVALID_INPUT');
    assert(typeof errScaffold.errorCode === 'string' && errScaffold.errorCode === 'ERR_INVALID_INPUT', 'scaffold errorCode is ERR_INVALID_INPUT');
    assert(errScaffold.code === errScaffold.errorCode, 'scaffold code === errorCode');

    // Test 1.2: Invalid input schema for remotion_preview_frame
    const errPreviewInput = await handlePreviewFrame({ invalid: true });
    assert(errPreviewInput.success === false, 'preview handles invalid input');
    assert(errPreviewInput.code === 'ERR_INVALID_INPUT' && errPreviewInput.errorCode === 'ERR_INVALID_INPUT', 'preview code/errorCode === ERR_INVALID_INPUT');

    // Test 1.3: Non-existent project for remotion_preview_frame
    const errPreviewProj = await handlePreviewFrame({
      projectDir: path.join(testWorkspace, 'non_existent_folder_xyz'),
      compositionId: 'MainComposition',
    });
    assert(errPreviewProj.success === false, 'preview handles missing project dir');
    assert(errPreviewProj.code === 'ERR_PROJECT_NOT_FOUND' && errPreviewProj.errorCode === 'ERR_PROJECT_NOT_FOUND', 'preview missing project code/errorCode === ERR_PROJECT_NOT_FOUND');

    // Test 1.4: Invalid input schema for remotion_render_video
    const errRenderInput = await handleRenderVideo({ invalid: true });
    assert(errRenderInput.success === false, 'render video handles invalid input');
    assert(errRenderInput.code === 'ERR_INVALID_INPUT' && errRenderInput.errorCode === 'ERR_INVALID_INPUT', 'render video code/errorCode === ERR_INVALID_INPUT');

    // Test 1.5: Non-existent project for remotion_render_video
    const errRenderProj = await handleRenderVideo({
      projectDir: path.join(testWorkspace, 'non_existent_folder_xyz'),
      compositionId: 'MainComposition',
    });
    assert(errRenderProj.success === false, 'render video handles missing project dir');
    assert(errRenderProj.code === 'ERR_PROJECT_NOT_FOUND' && errRenderProj.errorCode === 'ERR_PROJECT_NOT_FOUND', 'render video missing project code/errorCode === ERR_PROJECT_NOT_FOUND');

    // Test 1.6: Invalid input schema for remotion_analyze_audio
    const errAnalyzeInput = await handleAnalyzeAudio({ invalid: true });
    assert(errAnalyzeInput.success === false, 'analyze audio handles invalid input');
    assert(errAnalyzeInput.code === 'ERR_INVALID_INPUT' && errAnalyzeInput.errorCode === 'ERR_INVALID_INPUT', 'analyze audio code/errorCode === ERR_INVALID_INPUT');

    // Test 1.7: Non-existent audio file for remotion_analyze_audio
    const errAnalyzeFile = await handleAnalyzeAudio({
      audioPath: path.join(testWorkspace, 'non_existent_audio.mp3'),
    });
    assert(errAnalyzeFile.success === false, 'analyze audio handles missing audio file');
    assert(errAnalyzeFile.code === 'ERR_FILE_NOT_FOUND' && errAnalyzeFile.errorCode === 'ERR_FILE_NOT_FOUND', 'analyze audio missing file code/errorCode === ERR_FILE_NOT_FOUND');

    // Test 1.8: Non-existent SRT file for remotion_analyze_audio
    const dummyWav = path.join(testWorkspace, 'dummy.wav');
    fs.writeFileSync(dummyWav, Buffer.alloc(1000));
    const errAnalyzeSrt = await handleAnalyzeAudio({
      audioPath: dummyWav,
      srtPath: path.join(testWorkspace, 'missing.srt'),
    });
    assert(errAnalyzeSrt.success === false, 'analyze audio handles missing SRT file');
    assert(errAnalyzeSrt.code === 'ERR_FILE_NOT_FOUND' && errAnalyzeSrt.errorCode === 'ERR_FILE_NOT_FOUND', 'analyze audio missing srt code/errorCode === ERR_FILE_NOT_FOUND');

    // Test 1.9: Invalid input schema for remotion_generate_tts
    const errTtsInput = await handleGenerateTts({ invalid: true });
    assert(errTtsInput.success === false, 'generate tts handles invalid input');
    assert(errTtsInput.code === 'ERR_INVALID_INPUT' && errTtsInput.errorCode === 'ERR_INVALID_INPUT', 'generate tts code/errorCode === ERR_INVALID_INPUT');

    // -------------------------------------------------------------------------
    // PART 2: SCAFFOLD, RENDER & BINARY FORMAT VALIDATION
    // -------------------------------------------------------------------------
    console.log('\n--- PART 2: Scaffold, Frame & Video Generation Empirical Check ---');

    const scaffoldRes = await handleScaffoldProject({
      projectName: 'scaffold_emp_test',
      template: 'tiktok-916',
      targetDir: testWorkspace,
    });
    assert(scaffoldRes.success === true, 'Scaffold project succeeded');
    const projPath = path.join(testWorkspace, 'scaffold_emp_test');

    // Frame preview generation check
    const framePath = path.join(testWorkspace, 'frame_0.png');
    const previewRes = await handlePreviewFrame({
      projectDir: projPath,
      compositionId: 'MainComposition',
      frame: 0,
      outputPath: framePath,
      imageFormat: 'png',
    });
    assert(previewRes.success === true, 'Preview frame succeeded');
    assert(fs.existsSync(framePath), 'Frame PNG file created');
    const frameBuf = fs.readFileSync(framePath);
    assert(frameBuf.length > 0, 'Frame PNG is non-empty');
    // PNG Magic Bytes: 0x89 0x50 0x4E 0x47 (\x89PNG)
    assert(
      frameBuf[0] === 0x89 && frameBuf[1] === 0x50 && frameBuf[2] === 0x4e && frameBuf[3] === 0x47,
      'Frame PNG header matches PNG magic bytes 89 50 4E 47'
    );

    // Video render check
    const videoPath = path.join(testWorkspace, 'output.mp4');
    const renderRes = await handleRenderVideo({
      projectDir: projPath,
      compositionId: 'MainComposition',
      outputPath: videoPath,
    });
    assert(renderRes.success === true, 'Render video succeeded');
    assert(fs.existsSync(videoPath), 'MP4 video file created');
    const videoBuf = fs.readFileSync(videoPath);
    assert(videoBuf.length > 0, 'MP4 video file is non-empty');
    // MP4 header check: 'ftyp' appears within first 16 bytes
    const headerString = videoBuf.subarray(0, 32).toString('latin1');
    assert(headerString.includes('ftyp'), 'MP4 video file header contains ftyp magic atom');

    console.log('\n================================================================');
    console.log(`  EMPIRICAL CHALLENGER SUITE PASSED ALL ${passedAssertions}/${totalAssertions} ASSERTIONS!`);
    console.log('================================================================\n');

  } catch (err) {
    console.error('\n❌ CHALLENGE SUITE FAILED:', err);
    process.exitCode = 1;
  } finally {
    if (fs.existsSync(testWorkspace)) {
      try {
        fs.rmSync(testWorkspace, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
      } catch (e) {
        console.warn('Could not cleanup challenge workspace:', e.message);
      }
    }
  }
}

runChallengeSuite();
