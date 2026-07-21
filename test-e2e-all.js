import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  handleScaffoldProject,
  handleGenerateTts,
  handleAnalyzeAudio,
  handlePreviewFrame,
  handleRenderVideo,
} from './dist/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runE2eTestSuite() {
  console.log('================================================================');
  console.log('  REMOTION MCP SERVER - FULL END-TO-END INTEGRATION TEST SUITE  ');
  console.log('================================================================\n');

  const testWorkspace = path.join(os.tmpdir(), `remotion_mcp_e2e_${Date.now()}`);
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
    // TOOL 1: remotion_scaffold_project
    // -------------------------------------------------------------------------
    console.log('--- Tool 1/5: remotion_scaffold_project ---');
    const templates = [
      { name: 'tiktok-916', dirName: 'scaffold_tiktok_916' },
      { name: 'youtube-169', dirName: 'scaffold_youtube_169' },
      { name: 'social-11', dirName: 'scaffold_social_11' },
    ];

    const scaffoldedProjects = {};

    for (const t of templates) {
      console.log(`Scaffolding template "${t.name}" into "${t.dirName}"...`);
      const scaffoldRes = await handleScaffoldProject({
        projectName: t.dirName,
        template: t.name,
        targetDir: testWorkspace,
      });

      assert(scaffoldRes.success === true, `remotion_scaffold_project succeeded for ${t.name}`);
      const projPath = path.join(testWorkspace, t.dirName);
      scaffoldedProjects[t.name] = projPath;

      assert(fs.existsSync(projPath), `Project folder created at ${projPath}`);
      assert(fs.existsSync(path.join(projPath, 'package.json')), `package.json exists in ${t.dirName}`);
      assert(fs.existsSync(path.join(projPath, 'src', 'Root.tsx')), `src/Root.tsx exists in ${t.dirName}`);
      assert(fs.existsSync(path.join(projPath, 'src', 'Composition.tsx')), `src/Composition.tsx exists in ${t.dirName}`);
      assert(fs.existsSync(path.join(projPath, 'src', 'index.ts')), `src/index.ts exists in ${t.dirName}`);
      assert(fs.existsSync(path.join(projPath, 'remotion.config.ts')), `remotion.config.ts exists in ${t.dirName}`);
    }

    // -------------------------------------------------------------------------
    // TOOL 2: remotion_generate_tts
    // -------------------------------------------------------------------------
    console.log('\n--- Tool 2/5: remotion_generate_tts ---');
    const ttsAudioPath = path.join(testWorkspace, 'output_tts.wav');
    const ttsText = 'Remotion MCP Server enables programmatic AI video rendering with frame-accurate audio alignment.';
    
    console.log('Generating voiceover TTS audio...');
    const ttsRes = await handleGenerateTts({
      text: ttsText,
      outputPath: ttsAudioPath,
      voice: 'Puck',
      fps: 30,
    });

    assert(ttsRes.success === true, 'remotion_generate_tts succeeded');
    assert(fs.existsSync(ttsAudioPath), `TTS audio file created at ${ttsAudioPath}`);
    const ttsSize = fs.statSync(ttsAudioPath).size;
    assert(ttsSize > 0, `TTS audio file is non-empty (${ttsSize} bytes)`);
    assert(typeof ttsRes.durationSeconds === 'number' && ttsRes.durationSeconds > 0, `Duration is positive (${ttsRes.durationSeconds}s)`);
    assert(typeof ttsRes.totalFrames === 'number' && ttsRes.totalFrames > 0, `Total frames calculated (${ttsRes.totalFrames} frames)`);
    assert(ttsRes.fps === 30, 'FPS returned correctly as 30');
    assert(Array.isArray(ttsRes.wordTimecodes) && ttsRes.wordTimecodes.length > 0, `Word-level timecodes array generated (${ttsRes.wordTimecodes?.length} words)`);

    const firstWord = ttsRes.wordTimecodes[0];
    assert(typeof firstWord.word === 'string', 'Word timecode contains string "word"');
    assert(typeof firstWord.startSeconds === 'number', 'Word timecode contains "startSeconds"');
    assert(typeof firstWord.endSeconds === 'number', 'Word timecode contains "endSeconds"');
    assert(typeof firstWord.startFrame === 'number', 'Word timecode contains "startFrame"');
    assert(typeof firstWord.endFrame === 'number', 'Word timecode contains "endFrame"');
    assert(typeof firstWord.durationInFrames === 'number', 'Word timecode contains "durationInFrames"');

    // -------------------------------------------------------------------------
    // TOOL 3: remotion_analyze_audio
    // -------------------------------------------------------------------------
    console.log('\n--- Tool 3/5: remotion_analyze_audio ---');
    // Generate a 120 BPM rhythmic WAV file for Librosa beat analysis
    const rhythmicWavPath = path.join(testWorkspace, 'audio_120bpm.wav');
    console.log('Generating 120 BPM rhythmic audio file for beat analysis...');
    const pyGenScriptPath = path.join(testWorkspace, 'gen_rhythmic_audio.py');
    const pyGenCode = `import wave, math, struct
sample_rate = 22050
duration_sec = 6
num_samples = sample_rate * duration_sec
beat_interval = 0.5 # 120 BPM -> 0.5s per beat
frames = []
for i in range(num_samples):
    t = i / sample_rate
    is_beat = (t % beat_interval) < 0.08
    sample = int(28000 * math.sin(2 * math.pi * 880 * t)) if is_beat else int(300 * math.sin(2 * math.pi * 220 * t))
    frames.append(struct.pack('<h', sample))
with wave.open(r'${rhythmicWavPath.replace(/\\/g, '\\\\')}', 'w') as f:
    f.setnchannels(1)
    f.setsampwidth(2)
    f.setframerate(sample_rate)
    f.writeframes(b''.join(frames))
`;
    fs.writeFileSync(pyGenScriptPath, pyGenCode, 'utf-8');
    execSync(`python "${pyGenScriptPath}"`);
    fs.unlinkSync(pyGenScriptPath);

    assert(fs.existsSync(rhythmicWavPath), '120 BPM rhythmic audio WAV file generated');

    const srtPath = path.join(testWorkspace, 'subtitles.srt');
    const srtContent = `1
00:00:00,000 --> 00:00:02,000
Welcome to Remotion MCP Server

2
00:00:02,000 --> 00:00:04,500
Automated Video Production Pipeline
`;
    fs.writeFileSync(srtPath, srtContent, 'utf-8');

    const audioAnalysisJsonPath = path.join(testWorkspace, 'audio_analysis.json');
    console.log('Analyzing audio beat detection and SRT alignments...');
    const audioRes = await handleAnalyzeAudio({
      audioPath: rhythmicWavPath,
      srtPath: srtPath,
      outputPath: audioAnalysisJsonPath,
      fps: 30,
      minSceneDuration: 1.5,
    });

    assert(audioRes.success === true, 'remotion_analyze_audio succeeded');
    assert(typeof audioRes.bpm === 'number' && audioRes.bpm > 0, `BPM detected (${audioRes.bpm})`);
    assert(Array.isArray(audioRes.beats) && audioRes.beats.length > 0, `Beat frame indices array populated (${audioRes.beats.length} beats)`);
    assert(Array.isArray(audioRes.beatTimestamps) && audioRes.beatTimestamps.length === audioRes.beats.length, 'Beat timestamps count matches beat frames count');
    assert(Array.isArray(audioRes.sceneCutFrames) && audioRes.sceneCutFrames.length > 0, 'Scene cut frames array calculated');
    assert(audioRes.sceneCutFrames[0] === 0, 'First scene cut frame is frame 0');
    assert(Array.isArray(audioRes.energyProfile) && audioRes.energyProfile.length > 0, `Energy profile samples generated (${audioRes.energyProfile.length} samples)`);
    assert(Array.isArray(audioRes.srtAlignments) && audioRes.srtAlignments.length === 2, 'SRT alignments parsed 2 subtitle blocks');

    // Verify SRT frame alignment calculation:
    // Block 1: 0.0s to 2.0s @ 30 FPS -> 0..60 frames (60 duration)
    const srt1 = audioRes.srtAlignments[0];
    assert(srt1.fromFrame === 0 && srt1.toFrame === 60 && srt1.durationInFrames === 60, `SRT 1 frame range 0..60 (got ${srt1.fromFrame}..${srt1.toFrame})`);
    assert(srt1.text === 'Welcome to Remotion MCP Server', 'SRT 1 text content parsed');

    // Block 2: 2.0s to 4.5s @ 30 FPS -> 60..135 frames (75 duration)
    const srt2 = audioRes.srtAlignments[1];
    assert(srt2.fromFrame === 60 && srt2.toFrame === 135 && srt2.durationInFrames === 75, `SRT 2 frame range 60..135 (got ${srt2.fromFrame}..${srt2.toFrame})`);
    assert(srt2.text === 'Automated Video Production Pipeline', 'SRT 2 text content parsed');

    assert(fs.existsSync(audioAnalysisJsonPath), `Audio analysis JSON exported to ${audioAnalysisJsonPath}`);
    const exportedJson = JSON.parse(fs.readFileSync(audioAnalysisJsonPath, 'utf-8'));
    assert(exportedJson.success === true && exportedJson.bpm === audioRes.bpm, 'Exported JSON structure matches return object');

    // -------------------------------------------------------------------------
    // TOOL 4: remotion_preview_frame
    // -------------------------------------------------------------------------
    console.log('\n--- Tool 4/5: remotion_preview_frame ---');
    const pngPreviewPath = path.join(testWorkspace, 'preview_tiktok_f0.png');
    console.log('Rendering PNG preview frame from TikTok 9:16 project...');
    const previewPngRes = await handlePreviewFrame({
      projectDir: scaffoldedProjects['tiktok-916'],
      compositionId: 'MainComposition',
      frame: 0,
      outputPath: pngPreviewPath,
      imageFormat: 'png',
      props: { title: 'E2E PNG Preview', subtitle: 'TikTok 9:16 Template' },
      timeoutMs: 180000,
    });

    assert(previewPngRes.success === true, 'remotion_preview_frame (PNG) succeeded');
    assert(fs.existsSync(pngPreviewPath), `PNG frame image file exists at ${pngPreviewPath}`);
    const pngSize = fs.statSync(pngPreviewPath).size;
    assert(pngSize > 0, `PNG frame image is non-empty (${pngSize} bytes)`);
    assert(typeof previewPngRes.renderTimeMs === 'number' && previewPngRes.renderTimeMs > 0, `Render time recorded (${previewPngRes.renderTimeMs}ms)`);

    const jpegPreviewPath = path.join(testWorkspace, 'preview_youtube_f10.jpeg');
    console.log('Rendering JPEG preview frame from YouTube 16:9 project...');
    const previewJpegRes = await handlePreviewFrame({
      projectDir: scaffoldedProjects['youtube-169'],
      compositionId: 'MainComposition',
      frame: 10,
      outputPath: jpegPreviewPath,
      imageFormat: 'jpeg',
      props: { title: 'E2E JPEG Preview', subtitle: 'YouTube 16:9 Template' },
      timeoutMs: 180000,
    });

    assert(previewJpegRes.success === true, 'remotion_preview_frame (JPEG) succeeded');
    assert(fs.existsSync(jpegPreviewPath), `JPEG frame image file exists at ${jpegPreviewPath}`);
    assert(fs.statSync(jpegPreviewPath).size > 0, 'JPEG frame image is non-empty');

    // -------------------------------------------------------------------------
    // TOOL 5: remotion_render_video
    // -------------------------------------------------------------------------
    console.log('\n--- Tool 5/5: remotion_render_video ---');
    const mp4OutputPath = path.join(testWorkspace, 'rendered_video.mp4');
    console.log('Rendering MP4 video from scaffolded TikTok 9:16 project...');
    const renderVideoRes = await handleRenderVideo({
      projectDir: scaffoldedProjects['tiktok-916'],
      compositionId: 'MainComposition',
      outputPath: mp4OutputPath,
      props: {
        title: 'E2E Final Video Render',
        subtitle: 'Full End-to-End Pipeline Pass',
        accentColor: '#00e5ff',
      },
    });

    assert(renderVideoRes.success === true, 'remotion_render_video succeeded');
    assert(fs.existsSync(mp4OutputPath), `Rendered MP4 video file exists at ${mp4OutputPath}`);
    const videoSize = fs.statSync(mp4OutputPath).size;
    assert(videoSize > 0, `Rendered MP4 video file is non-empty (${videoSize} bytes)`);
    assert(renderVideoRes.fileSizeBytes === videoSize, `fileSizeBytes matches filesystem byte size (${videoSize} B)`);
    assert(typeof renderVideoRes.renderTimeMs === 'number' && renderVideoRes.renderTimeMs > 0, `Video render duration recorded (${renderVideoRes.renderTimeMs}ms)`);

    // -------------------------------------------------------------------------
    // EDGE CASES & ERROR HANDLING
    // -------------------------------------------------------------------------
    console.log('\n--- Edge Cases & Error Code Verification ---');
    const nonExistentPreview = await handlePreviewFrame({
      projectDir: path.join(testWorkspace, 'non_existent_folder'),
      compositionId: 'MainComposition',
    });
    assert(nonExistentPreview.success === false && nonExistentPreview.code === 'ERR_PROJECT_NOT_FOUND' && nonExistentPreview.errorCode === 'ERR_PROJECT_NOT_FOUND', 'Handles non-existent project directory with ERR_PROJECT_NOT_FOUND (code & errorCode)');

    const invalidCompPreview = await handlePreviewFrame({
      projectDir: scaffoldedProjects['tiktok-916'],
      compositionId: 'NonExistentCompID',
    });
    assert(invalidCompPreview.success === false && invalidCompPreview.code === 'ERR_COMPOSITION_NOT_FOUND' && invalidCompPreview.errorCode === 'ERR_COMPOSITION_NOT_FOUND', 'Handles invalid composition ID with ERR_COMPOSITION_NOT_FOUND (code & errorCode)');

    const invalidAudioAnalyze = await handleAnalyzeAudio({
      audioPath: path.join(testWorkspace, 'missing_audio.wav'),
    });
    assert(invalidAudioAnalyze.success === false && invalidAudioAnalyze.code === 'ERR_FILE_NOT_FOUND' && invalidAudioAnalyze.errorCode === 'ERR_FILE_NOT_FOUND', 'Handles non-existent audio file with ERR_FILE_NOT_FOUND (code & errorCode)');

    console.log('\n================================================================');
    console.log(`  ALL 5 MCP TOOLS VERIFIED! PASSED ${passedAssertions}/${totalAssertions} ASSERTIONS!`);
    console.log('================================================================\n');

  } catch (err) {
    console.error('\n❌ E2E TEST SUITE FAILED:', err);
    process.exitCode = 1;
  } finally {
    // Cleanup temporary workspace
    try {
      if (fs.existsSync(testWorkspace)) {
        fs.rmSync(testWorkspace, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
        console.log(`Cleaned up temporary workspace directory: ${testWorkspace}`);
      }
    } catch (e) {
      console.warn(`Warning: Could not cleanup workspace directory ${testWorkspace}:`, e.message);
    }
  }
}

runE2eTestSuite();
