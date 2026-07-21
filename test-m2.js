import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { handleAnalyzeAudio } from './dist/index.js';

async function runTest() {
  console.log('=== Starting Milestone 2 Verification Test ===');

  const testWavPath = path.resolve('test_audio_m2.wav');
  const testSrtPath = path.resolve('test_subtitles_m2.srt');
  const testOutputPath = path.resolve('test_output_m2.json');

  try {
    // 1. Generate test WAV audio using Python
    console.log('Generating test WAV audio file (120 BPM beeps)...');
    const pyGenPath = path.resolve('gen_test_wav.py');
    const pyGenScript = `import wave, math, struct
sample_rate = 22050
num_samples = sample_rate * 4
with wave.open(r'${testWavPath.replace(/\\/g, '\\\\')}', 'w') as f:
    f.setnchannels(1)
    f.setsampwidth(2)
    f.setframerate(sample_rate)
    frames = []
    for i in range(num_samples):
        t = i / sample_rate
        is_beep = (t % 0.5) < 0.08
        sample = int(25000 * math.sin(2 * math.pi * 880 * t)) if is_beep else 0
        frames.append(struct.pack('<h', sample))
    f.writeframes(b''.join(frames))
`;
    fs.writeFileSync(pyGenPath, pyGenScript, 'utf-8');
    execSync(`python "${pyGenPath}"`);
    fs.unlinkSync(pyGenPath);

    if (!fs.existsSync(testWavPath)) {
      throw new Error(`Failed to generate test WAV at ${testWavPath}`);
    }
    console.log('Test WAV generated successfully.');

    // 2. Generate test SRT file
    console.log('Generating test SRT subtitle file...');
    const srtContent = `1
00:00:00,000 --> 00:00:01,500
Welcome to Remotion MCP Audio Intelligence

2
00:00:01,500 --> 00:00:03,500
Frame-accurate beat synchronization and scene cutting
`;
    fs.writeFileSync(testSrtPath, srtContent, 'utf-8');
    console.log('Test SRT generated successfully.');

    // 3. Call handleAnalyzeAudio
    console.log('Calling handleAnalyzeAudio...');
    const result = await handleAnalyzeAudio({
      audioPath: testWavPath,
      srtPath: testSrtPath,
      outputPath: testOutputPath,
      fps: 30,
      minSceneDuration: 1.5,
    });

    console.log('\n--- Analysis Output ---');
    console.log(JSON.stringify(result, null, 2));

    // 4. Assertions & Validation
    console.log('\n--- Running Assertions ---');

    if (!result.success) {
      throw new Error(`Analysis failed: ${result.error}`);
    }

    if (typeof result.bpm !== 'number' || result.bpm <= 0) {
      throw new Error(`Invalid BPM: ${result.bpm}`);
    }
    console.log(`✓ BPM extracted: ${result.bpm}`);

    if (!Array.isArray(result.beats) || result.beats.length === 0) {
      throw new Error('Beats array is missing or empty.');
    }
    console.log(`✓ Beat frames detected: ${result.beats.length} beats`);

    if (!Array.isArray(result.sceneCutFrames) || result.sceneCutFrames.length === 0) {
      throw new Error('Scene cut frames array is missing or empty.');
    }
    console.log(`✓ Scene cut frames calculated: [${result.sceneCutFrames.join(', ')}]`);

    if (!Array.isArray(result.srtAlignments) || result.srtAlignments.length !== 2) {
      throw new Error(`Expected 2 SRT alignments, got ${result.srtAlignments?.length}`);
    }
    console.log(`✓ SRT alignments parsed correctly (${result.srtAlignments.length} items)`);

    const sub1 = result.srtAlignments[0];
    if (sub1.fromFrame !== 0 || sub1.toFrame !== 45 || sub1.durationInFrames !== 45) {
      throw new Error(`SRT frame alignment mismatch for item 1: expected 0..45 (45f), got ${sub1.fromFrame}..${sub1.toFrame} (${sub1.durationInFrames}f)`);
    }
    console.log(`✓ Subtitle 1 frame alignment verified: frame ${sub1.fromFrame} to ${sub1.toFrame} (${sub1.durationInFrames} frames)`);

    const sub2 = result.srtAlignments[1];
    if (sub2.fromFrame !== 45 || sub2.toFrame !== 105 || sub2.durationInFrames !== 60) {
      throw new Error(`SRT frame alignment mismatch for item 2: expected 45..105 (60f), got ${sub2.fromFrame}..${sub2.toFrame} (${sub2.durationInFrames}f)`);
    }
    console.log(`✓ Subtitle 2 frame alignment verified: frame ${sub2.fromFrame} to ${sub2.toFrame} (${sub2.durationInFrames} frames)`);

    if (!fs.existsSync(testOutputPath)) {
      throw new Error(`Output JSON file was not created at ${testOutputPath}`);
    }
    console.log(`✓ Saved JSON output verified at ${testOutputPath}`);

    console.log('\n=== Milestone 2 Verification Test PASSED SUCCESSFULLY ===');
  } catch (err) {
    console.error('\n❌ Test failed with error:', err);
    process.exitCode = 1;
  } finally {
    // Cleanup temporary files
    [testWavPath, testSrtPath, testOutputPath].forEach((filePath) => {
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch {}
      }
    });
  }
}

runTest();
