#!/usr/bin/env python3
"""
generate_gemini_tts.py — Google Gemini 3.1 Flash TTS & Kinetic Caption Timecode Generator
"""

import sys
import os
import re
import json
import wave
import math
import struct
import argparse
from typing import Dict, List, Any, Optional

def parse_args():
    parser = argparse.ArgumentParser(description="Generate AI Voiceover & Kinetic Caption Timecodes with Gemini TTS")
    parser.add_argument("--text", required=True, help="Text transcript to synthesize into voiceover")
    parser.add_argument("--output", "--output_path", "--output-path", dest="output_path", required=True, help="Output path for WAV file")
    parser.add_argument("--voice", default="Puck", help="Gemini prebuilt voice name (default: Puck)")
    parser.add_argument("--accent", default=None, help="Optional regional accent description")
    parser.add_argument("--fps", type=float, default=30.0, help="Target video frame rate (default: 30.0)")
    parser.add_argument("--api-key", "--api_key", dest="api_key", default=None, help="Gemini API key override")
    parser.add_argument("--mock", action="store_true", help="Force offline mock synthesis mode")
    return parser.parse_args()

def calculate_word_timecodes(text: str, duration_sec: float, fps: float) -> List[Dict[str, Any]]:
    """
    Calculate character-weighted word timecodes for kinetic captions.
    Returns array of items with: word, startSeconds, endSeconds, startFrame, endFrame, durationInFrames.
    """
    raw_words = text.strip().split()
    if not raw_words:
        return []

    word_info = []
    for w in raw_words:
        clean = re.sub(r'^[^\w]+|[^\w]+$', '', w)
        char_len = len(clean) if clean else 1
        weight = float(char_len)
        if w.endswith(('.', '!', '?')):
            weight += 3.0
        elif w.endswith((',', ';', ':')):
            weight += 1.5
        word_info.append({"word": w, "weight": weight})

    total_weight = sum(item["weight"] for item in word_info)
    if total_weight <= 0:
        total_weight = float(len(word_info))
        for item in word_info:
            item["weight"] = 1.0

    head_pad = 0.1 if duration_sec > 0.4 else 0.0
    tail_pad = 0.1 if duration_sec > 0.4 else 0.0
    speech_duration = max(0.1, duration_sec - (head_pad + tail_pad))

    timecodes = []
    current_time = head_pad
    total_frames = int(round(duration_sec * fps))
    current_frame = int(round(head_pad * fps))

    for idx, item in enumerate(word_info):
        frac = item["weight"] / total_weight
        dur = frac * speech_duration
        
        start_sec = current_time
        end_sec = current_time + dur if idx < len(word_info) - 1 else max(start_sec + 0.05, duration_sec - tail_pad)
        current_time = end_sec

        start_f = current_frame
        if idx == len(word_info) - 1:
            end_f = total_frames
        else:
            end_f = int(round(end_sec * fps))

        if end_f <= start_f:
            end_f = start_f + 1

        dur_f = max(1, end_f - start_f)
        current_frame = end_f

        timecodes.append({
            "word": item["word"],
            "startSeconds": round(start_sec, 3),
            "endSeconds": round(end_sec, 3),
            "startFrame": start_f,
            "endFrame": end_f,
            "durationInFrames": dur_f
        })

    return timecodes

def generate_mock_wav(output_path: str, duration_sec: float, sample_rate: int = 24000) -> None:
    """Generate a valid 16-bit 24kHz PCM WAV file using standard library modules (wave, struct, math)."""
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    num_samples = int(duration_sec * sample_rate)
    frequency = 440.0
    amplitude = 8000

    with wave.open(output_path, 'wb') as wav_file:
        wav_file.setnchannels(1)      # Mono
        wav_file.setsampwidth(2)      # 16-bit PCM
        wav_file.setframerate(sample_rate)
        
        frames = bytearray()
        for i in range(num_samples):
            t = float(i) / sample_rate
            envelope = math.sin(math.pi * t / duration_sec) ** 2
            value = int(amplitude * envelope * math.sin(2.0 * math.pi * frequency * t))
            frames.extend(struct.pack('<h', max(-32768, min(32767, value))))
            
        wav_file.writeframes(frames)

def generate_live_tts(text: str, output_path: str, voice: str, accent: Optional[str], api_key: str) -> float:
    """Invoke google-genai SDK for live synthesis using gemini-3.1-flash-tts-preview model."""
    try:
        from google import genai
        from google.genai import types
    except ImportError as e:
        raise RuntimeError(f"google-genai library not installed: {e}")

    client = genai.Client(api_key=api_key)
    prompt = f"Read the following text naturally with a {accent} regional accent: {text}" if accent else text

    response = client.models.generate_content(
        model="gemini-3.1-flash-tts-preview",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_modalities=["AUDIO"],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=voice)
                )
            )
        )
    )

    audio_bytes = None
    if hasattr(response, 'candidates') and response.candidates:
        part = response.candidates[0].content.parts[0]
        if hasattr(part, 'inline_data') and part.inline_data:
            audio_bytes = part.inline_data.data

    if not audio_bytes:
        raise ValueError("No audio content returned from Gemini TTS API response.")

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    with open(output_path, 'wb') as f:
        f.write(audio_bytes)

    with wave.open(output_path, 'rb') as w:
        frames = w.getnframes()
        rate = w.getframerate()
        return frames / float(rate)

def main():
    args = parse_args()
    api_key = args.api_key or os.environ.get("GEMINI_API_KEY")
    
    use_mock = args.mock or not api_key
    out_abs = os.path.abspath(args.output_path)
    
    raw_words = args.text.strip().split()
    if not raw_words:
        error_res = {"success": False, "error": "Input text contains no valid words"}
        print(json.dumps(error_res), file=sys.stderr)
        sys.exit(1)

    try:
        if use_mock:
            duration_sec = max(1.0, len(raw_words) * 0.35 + 0.4)
            generate_mock_wav(out_abs, duration_sec)
        else:
            try:
                duration_sec = generate_live_tts(args.text, out_abs, args.voice, args.accent, api_key)
            except Exception as live_err:
                duration_sec = max(1.0, len(raw_words) * 0.35 + 0.4)
                generate_mock_wav(out_abs, duration_sec)
                use_mock = True

        word_timecodes = calculate_word_timecodes(args.text, duration_sec, args.fps)
        total_frames = int(round(duration_sec * args.fps))

        result = {
            "success": True,
            "audioPath": out_abs,
            "durationSeconds": round(duration_sec, 3),
            "totalFrames": total_frames,
            "fps": args.fps,
            "voice": args.voice,
            "accent": args.accent,
            "isMock": use_mock,
            "wordTimecodes": word_timecodes
        }

        print(json.dumps(result))
        sys.exit(0)

    except Exception as e:
        error_res = {"success": False, "error": str(e)}
        print(json.dumps(error_res), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
