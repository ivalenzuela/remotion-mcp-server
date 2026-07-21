#!/usr/bin/env python3
"""
audio_beat_analyzer.py — Librosa Audio Beat & Energy Analyzer for Remotion MCP Server
"""

import sys
import os
import json
import re
import argparse
from typing import Dict, List, Any, Optional
import numpy as np
import librosa

class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (np.integer, np.int64, np.int32)):
            return int(obj)
        elif isinstance(obj, (np.floating, np.float64, np.float32)):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        return super().default(obj)

def parse_srt_timestamp(ts_str: str) -> float:
    """Convert SRT timestamp (HH:MM:SS,mmm or HH:MM:SS.mmm) to total seconds."""
    ts_str = ts_str.strip().replace('.', ',')
    match = re.match(r'(\d+):(\d+):(\d+),(\d+)', ts_str)
    if not match:
        return 0.0
    hours, minutes, seconds, millis = map(int, match.groups())
    # Pad millis if needed (e.g. 5 -> 500, 50 -> 500 if length < 3)
    # But usually match.groups() gets raw digits, let's treat millis based on length or standard parse
    millis_str = match.group(4).ljust(3, '0')[:3]
    millis = int(millis_str)
    return hours * 3600.0 + minutes * 60.0 + seconds + millis / 1000.0

def parse_srt_file(srt_path: str, fps: float) -> List[Dict[str, Any]]:
    """Parse SRT subtitle file and align with video frames."""
    if not os.path.exists(srt_path):
        return []

    with open(srt_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    blocks = re.split(r'\n\s*\n', content.strip())
    alignments = []

    for block in blocks:
        lines = [line.strip() for line in block.splitlines() if line.strip()]
        if len(lines) < 2:
            continue

        time_line_idx = 0
        if lines[0].isdigit():
            if len(lines) < 2:
                continue
            sub_id = int(lines[0])
            time_line_idx = 1
        else:
            sub_id = len(alignments) + 1

        if time_line_idx >= len(lines):
            continue

        time_match = re.match(r'(.+?)\s*-->\s*(.+)', lines[time_line_idx])
        if not time_match:
            continue

        start_raw, end_raw = time_match.group(1), time_match.group(2)
        start_sec = parse_srt_timestamp(start_raw)
        end_sec = parse_srt_timestamp(end_raw)
        text = " ".join(lines[time_line_idx + 1:])

        from_frame = int(round(start_sec * fps))
        to_frame = int(round(end_sec * fps))
        duration_frames = max(1, to_frame - from_frame)

        alignments.append({
            "id": sub_id,
            "startTime": start_raw,
            "endTime": end_raw,
            "startSeconds": round(start_sec, 3),
            "endSeconds": round(end_sec, 3),
            "fromFrame": from_frame,
            "toFrame": to_frame,
            "durationInFrames": duration_frames,
            "text": text
        })

    return alignments

def analyze_audio(
    audio_path: str,
    srt_path: Optional[str] = None,
    fps: float = 30.0,
    min_scene_duration: float = 3.5
) -> Dict[str, Any]:
    """Perform audio beat analysis and scene cut extraction."""
    if not os.path.exists(audio_path):
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    # Load audio
    y, sr = librosa.load(audio_path, sr=None)
    duration_sec = float(librosa.get_duration(y=y, sr=sr))
    total_frames = int(round(duration_sec * fps))

    # Beat tracking
    tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
    if isinstance(tempo, (np.ndarray, list)):
        tempo_val = float(tempo[0]) if len(tempo) > 0 else 120.0
    else:
        tempo_val = float(tempo)

    beat_times = librosa.frames_to_time(beat_frames, sr=sr)
    beat_video_frames = [int(round(t * fps)) for t in beat_times]

    # Energy profile (RMS)
    rms_raw = librosa.feature.rms(y=y)[0]
    rms_times = librosa.frames_to_time(np.arange(len(rms_raw)), sr=sr)
    
    step = max(1, len(rms_raw) // 100)
    energy_profile = []
    for i in range(0, len(rms_raw), step):
        t = float(rms_times[i])
        val = float(rms_raw[i])
        energy_profile.append({
            "frame": int(round(t * fps)),
            "timestamp": round(t, 3),
            "rms": round(val, 4)
        })

    # Onset envelope for drop/rise detection
    onset_env = librosa.onset.onset_detect(y=y, sr=sr, units='time')

    # Detect scene cut frames respecting min_scene_duration
    scene_cut_frames = [0]
    last_cut_sec = 0.0

    candidate_times = sorted(list(set([float(t) for t in beat_times] + [float(t) for t in onset_env])))

    for t in candidate_times:
        if t - last_cut_sec >= min_scene_duration and t <= duration_sec - 0.5:
            frame_idx = int(round(t * fps))
            scene_cut_frames.append(frame_idx)
            last_cut_sec = t

    srt_alignments = []
    if srt_path:
        srt_alignments = parse_srt_file(srt_path, fps)

    return {
        "success": True,
        "audioPath": os.path.abspath(audio_path),
        "durationSeconds": round(duration_sec, 3),
        "totalFrames": total_frames,
        "fps": fps,
        "bpm": round(tempo_val, 2),
        "beats": beat_video_frames,
        "beatTimestamps": [round(float(t), 3) for t in beat_times],
        "sceneCutFrames": scene_cut_frames,
        "energyProfile": energy_profile,
        "srtAlignments": srt_alignments
    }

def main():
    parser = argparse.ArgumentParser(description="Librosa Audio Beat & Energy Analyzer")
    parser.add_argument("--audio", required=True, help="Path to audio file (MP3/WAV)")
    parser.add_argument("--srt", required=False, help="Path to optional SRT subtitle file")
    parser.add_argument("--output", required=False, help="Optional output JSON file path")
    parser.add_argument("--fps", type=float, default=30.0, help="Target video FPS (default: 30.0)")
    parser.add_argument("--min-scene-duration", type=float, default=3.5, help="Minimum scene duration in seconds (default: 3.5)")

    args = parser.parse_args()

    try:
        result = analyze_audio(
            audio_path=args.audio,
            srt_path=args.srt,
            fps=args.fps,
            min_scene_duration=args.min_scene_duration
        )

        if args.output:
            out_abs = os.path.abspath(args.output)
            os.makedirs(os.path.dirname(out_abs), exist_ok=True)
            with open(out_abs, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2, cls=NumpyEncoder)
            result["outputPath"] = out_abs

        print(json.dumps(result, cls=NumpyEncoder))
        sys.exit(0)

    except Exception as e:
        error_res = {
            "success": False,
            "error": str(e)
        }
        print(json.dumps(error_res), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
