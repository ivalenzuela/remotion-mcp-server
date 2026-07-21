import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { handleAnalyzeAudio } from './dist/index.js';

async function runEmpiricalChallengeM2() {
  console.log('====================================================');
  console.log('  MILESTONE 2 EMPIRICAL STRESS-TEST & CHALLENGE');
  console.log('====================================================\n');

  const testDir = path.resolve('test_m2_challenge_workspace');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const wav90Path = path.join(testDir, 'audio_90bpm.wav');
  const wav140Path = path.join(testDir, 'audio_140bpm.wav');
  const mp3140Path = path.join(testDir, 'audio_140bpm.mp3');
  const srtPath = path.join(testDir, 'subtitles_multiline.srt');
  const jsonOutput90_30 = path.join(testDir, 'output_90bpm_30fps.json');
  const jsonOutput140_24 = path.join(testDir, 'output_140bpm_24fps.json');
  const jsonOutput140_60 = path.join(testDir, 'output_140bpm_60fps.json');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  try {
    // Step 1: Generate Test Audio Files (WAV 90 BPM, MP3 140 BPM)
    console.log('--- Step 1: Generating Test Audio Files ---');

    const pyGenScriptPath = path.join(testDir, 'gen_challenge_audio.py');
    const pyGenCode = `
import wave, math, struct, subprocess, os

def create_beep_wav(filepath, bpm, duration_sec=10, sample_rate=22050):
    num_samples = sample_rate * duration_sec
    beat_interval = 60.0 / bpm
    frames = []
    for i in range(num_samples):
        t = i / sample_rate
        is_beat = (t % beat_interval) < 0.05
        # 880Hz beep for beat pulse, 220Hz low background tone
        sample = int(28000 * math.sin(2 * math.pi * 880 * t)) if is_beat else int(300 * math.sin(2 * math.pi * 220 * t))
        frames.append(struct.pack('<h', sample))
    
    with wave.open(filepath, 'w') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(sample_rate)
        f.writeframes(b''.join(frames))

create_beep_wav(r'${wav90Path.replace(/\\/g, '\\\\')}', 90, duration_sec=10)
create_beep_wav(r'${wav140Path.replace(/\\/g, '\\\\')}', 140, duration_sec=10)
`;
    fs.writeFileSync(pyGenScriptPath, pyGenCode, 'utf-8');
    execSync(`python "${pyGenScriptPath}"`);
    fs.unlinkSync(pyGenScriptPath);

    // Convert 140 BPM WAV to MP3 using ffmpeg
    execSync(`ffmpeg -i "${wav140Path}" -codec:a libmp3lame -qscale:a 2 "${mp3140Path}" -y`, { stdio: 'pipe' });

    assert(fs.existsSync(wav90Path), '90 BPM WAV audio file generated');
    assert(fs.existsSync(mp3140Path), '140 BPM MP3 audio file generated');

    // Step 2: Generate Multi-line SRT Subtitle File
    console.log('\n--- Step 2: Generating Multi-line SRT Subtitle File ---');
    const srtContent = `1
00:00:00,000 --> 00:00:02,500
Line 1: High-energy video intro
Line 2: Remotion audio beat alignment test

2
00:00:02,500 --> 00:00:05,000
Line A: Dynamic scene cutting active
Line B: Frame rate conversion check
Line C: Testing 24, 30, and 60 FPS output

3
00:00:05,000 --> 00:00:08,250
Line X: Final subtitle caption block
Line Y: Verifying multi-line string joining
`;
    fs.writeFileSync(srtPath, srtContent, 'utf-8');
    assert(fs.existsSync(srtPath), 'Multi-line SRT subtitle file created');

    // Step 3: Test 1 - 90 BPM WAV Analysis at 30 FPS
    console.log('\n--- Step 3: Test 1 - 90 BPM WAV Analysis at 30 FPS ---');
    const res90 = await handleAnalyzeAudio({
      audioPath: wav90Path,
      srtPath: srtPath,
      outputPath: jsonOutput90_30,
      fps: 30,
      minSceneDuration: 3.0,
    });

    assert(res90.success === true, '90 BPM WAV analysis succeeded');
    assert(typeof res90.bpm === 'number' && res90.bpm >= 85 && res90.bpm <= 95, `BPM extracted near 90 BPM (got: ${res90.bpm})`);
    assert(Array.isArray(res90.beats) && res90.beats.length > 5, `Beats array populated (${res90.beats.length} beats)`);
    assert(Array.isArray(res90.beatTimestamps) && res90.beatTimestamps.length === res90.beats.length, 'Beat timestamps count matches beats count');
    assert(Array.isArray(res90.sceneCutFrames) && res90.sceneCutFrames[0] === 0, `Scene cuts calculated starting at frame 0 (${JSON.stringify(res90.sceneCutFrames)})`);
    assert(Array.isArray(res90.energyProfile) && res90.energyProfile.length > 0, `Energy profile generated (${res90.energyProfile.length} samples)`);
    assert(Array.isArray(res90.srtAlignments) && res90.srtAlignments.length === 3, 'SRT alignments parsed 3 blocks');

    // Verify SRT frame alignment for 30 FPS
    // Block 1: 0.0s to 2.5s @ 30 FPS -> 0..75 frames
    const srt1_30 = res90.srtAlignments[0];
    assert(srt1_30.fromFrame === 0 && srt1_30.toFrame === 75 && srt1_30.durationInFrames === 75, `SRT 1 frame range 0..75 @ 30 FPS (got ${srt1_30.fromFrame}..${srt1_30.toFrame})`);
    assert(srt1_30.text === 'Line 1: High-energy video intro Line 2: Remotion audio beat alignment test', 'SRT 1 multi-line text joined cleanly');

    // Block 2: 2.5s to 5.0s @ 30 FPS -> 75..150 frames
    const srt2_30 = res90.srtAlignments[1];
    assert(srt2_30.fromFrame === 75 && srt2_30.toFrame === 150 && srt2_30.durationInFrames === 75, `SRT 2 frame range 75..150 @ 30 FPS (got ${srt2_30.fromFrame}..${srt2_30.toFrame})`);
    assert(srt2_30.text === 'Line A: Dynamic scene cutting active Line B: Frame rate conversion check Line C: Testing 24, 30, and 60 FPS output', 'SRT 2 3-line text joined cleanly');

    // Block 3: 5.0s to 8.25s @ 30 FPS -> 150..248 frames
    const srt3_30 = res90.srtAlignments[2];
    assert(srt3_30.fromFrame === 150 && srt3_30.toFrame === 248 && srt3_30.durationInFrames === 98, `SRT 3 frame range 150..248 @ 30 FPS (got ${srt3_30.fromFrame}..${srt3_30.toFrame})`);

    // Verify JSON file created and structured
    assert(fs.existsSync(jsonOutput90_30), 'JSON output file created on disk');
    const parsedJson90 = JSON.parse(fs.readFileSync(jsonOutput90_30, 'utf-8'));
    assert(parsedJson90.success === true && parsedJson90.bpm === res90.bpm && parsedJson90.srtAlignments.length === 3, 'JSON output structure matches return data');

    // Step 4: Test 2 - 140 BPM MP3 Analysis at 24 FPS
    console.log('\n--- Step 4: Test 2 - 140 BPM MP3 Analysis at 24 FPS ---');
    const res140_24 = await handleAnalyzeAudio({
      audioPath: mp3140Path,
      srtPath: srtPath,
      outputPath: jsonOutput140_24,
      fps: 24,
      minSceneDuration: 2.5,
    });

    assert(res140_24.success === true, '140 BPM MP3 analysis succeeded');
    assert(typeof res140_24.bpm === 'number' && res140_24.bpm >= 135 && res140_24.bpm <= 145, `BPM extracted near 140 BPM (got: ${res140_24.bpm})`);
    assert(res140_24.fps === 24, 'FPS set to 24');

    // SRT alignment for 24 FPS
    // Block 1: 0.0s..2.5s @ 24 FPS -> round(2.5 * 24) = 60
    const srt1_24 = res140_24.srtAlignments[0];
    assert(srt1_24.fromFrame === 0 && srt1_24.toFrame === 60 && srt1_24.durationInFrames === 60, `SRT 1 frame range 0..60 @ 24 FPS (got ${srt1_24.fromFrame}..${srt1_24.toFrame})`);

    // Block 2: 2.5s..5.0s @ 24 FPS -> 60..120
    const srt2_24 = res140_24.srtAlignments[1];
    assert(srt2_24.fromFrame === 60 && srt2_24.toFrame === 120 && srt2_24.durationInFrames === 60, `SRT 2 frame range 60..120 @ 24 FPS (got ${srt2_24.fromFrame}..${srt2_24.toFrame})`);

    // Block 3: 5.0s..8.25s @ 24 FPS -> 120..198
    const srt3_24 = res140_24.srtAlignments[2];
    assert(srt3_24.fromFrame === 120 && srt3_24.toFrame === 198 && srt3_24.durationInFrames === 78, `SRT 3 frame range 120..198 @ 24 FPS (got ${srt3_24.fromFrame}..${srt3_24.toFrame})`);

    assert(fs.existsSync(jsonOutput140_24), 'JSON output file created for 24 FPS test');

    // Step 5: Test 3 - 140 BPM MP3 Analysis at 60 FPS
    console.log('\n--- Step 5: Test 3 - 140 BPM MP3 Analysis at 60 FPS ---');
    const res140_60 = await handleAnalyzeAudio({
      audioPath: mp3140Path,
      srtPath: srtPath,
      outputPath: jsonOutput140_60,
      fps: 60,
      minSceneDuration: 3.5,
    });

    assert(res140_60.success === true, '140 BPM MP3 analysis at 60 FPS succeeded');
    assert(res140_60.fps === 60, 'FPS set to 60');

    // SRT alignment for 60 FPS
    // Block 1: 0.0s..2.5s @ 60 FPS -> 0..150
    const srt1_60 = res140_60.srtAlignments[0];
    assert(srt1_60.fromFrame === 0 && srt1_60.toFrame === 150 && srt1_60.durationInFrames === 150, `SRT 1 frame range 0..150 @ 60 FPS (got ${srt1_60.fromFrame}..${srt1_60.toFrame})`);

    // Block 2: 2.5s..5.0s @ 60 FPS -> 150..300
    const srt2_60 = res140_60.srtAlignments[1];
    assert(srt2_60.fromFrame === 150 && srt2_60.toFrame === 300 && srt2_60.durationInFrames === 150, `SRT 2 frame range 150..300 @ 60 FPS (got ${srt2_60.fromFrame}..${srt2_60.toFrame})`);

    // Block 3: 5.0s..8.25s @ 60 FPS -> 300..495
    const srt3_60 = res140_60.srtAlignments[2];
    assert(srt3_60.fromFrame === 300 && srt3_60.toFrame === 495 && srt3_60.durationInFrames === 195, `SRT 3 frame range 300..495 @ 60 FPS (got ${srt3_60.fromFrame}..${srt3_60.toFrame})`);

    assert(fs.existsSync(jsonOutput140_60), 'JSON output file created for 60 FPS test');

    // Step 6: Test Negative / Boundary Cases
    console.log('\n--- Step 6: Negative & Edge Case Tests ---');

    // Non-existent audio file
    const resBadAudio = await handleAnalyzeAudio({
      audioPath: path.join(testDir, 'non_existent_audio.wav'),
    });
    assert(resBadAudio.success === false && resBadAudio.code === 'ERR_FILE_NOT_FOUND', 'Handles non-existent audio file gracefully');

    // Non-existent SRT file
    const resBadSrt = await handleAnalyzeAudio({
      audioPath: wav90Path,
      srtPath: path.join(testDir, 'non_existent_sub.srt'),
    });
    assert(resBadSrt.success === false && resBadSrt.code === 'ERR_FILE_NOT_FOUND', 'Handles non-existent SRT file gracefully');

    // Invalid Zod schema input
    const resInvalidInput = await handleAnalyzeAudio({
      audioPath: '',
    });
    assert(resInvalidInput.success === false && resInvalidInput.code === 'ERR_INVALID_INPUT', 'Handles empty audioPath input validation');

    console.log('\n====================================================');
    console.log(`  ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
    console.log('====================================================\n');
  } catch (err) {
    console.error('\n❌ EMPIRICAL STRESS-TEST FAILED:', err);
    process.exitCode = 1;
  } finally {
    // Clean up temporary workspace files
    if (fs.existsSync(testDir)) {
      try {
        fs.rmSync(testDir, { recursive: true, force: true });
        console.log(`Cleaned up temporary workspace directory: ${testDir}`);
      } catch (e) {
        console.error('Failed to clean up test directory:', e);
      }
    }
  }
}

runEmpiricalChallengeM2();
