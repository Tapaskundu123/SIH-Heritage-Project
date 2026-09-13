"""
Test script for ai4bharat/indic-conformer-600m-multilingual via Hugging Face API
Usage:
    python test_indic_conformer_hf.py [optional_path_to_audio_file]
"""
import os
import sys
import math
import struct
import wave
import tempfile
from pathlib import Path
import requests

# Load settings & env from config
try:
    from config import settings
    HF_TOKEN = settings.HF_TOKEN
except Exception:
    HF_TOKEN = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_API_KEY") or ""

MODEL_NAME = "ai4bharat/indic-conformer-600m-multilingual"
ROUTER_URL = f"https://router.huggingface.co/hf-inference/models/{MODEL_NAME}"


def create_dummy_wav(filepath: str, duration_sec: float = 1.0, sample_rate: int = 16000):
    """Generate a clean 1-second 16kHz mono WAV file for API ping test"""
    with wave.open(filepath, "w") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(sample_rate)
        num_samples = int(sample_rate * duration_sec)
        for i in range(num_samples):
            # 440 Hz gentle sine wave
            val = int(16000.0 * math.sin(2 * math.pi * 440 * i / sample_rate))
            f.writeframes(struct.pack("<h", val))


def run_diagnostic():
    print("=" * 65)
    print("  AI4Bharat IndicConformer 600M Multilingual — Hugging Face Test")
    print("=" * 65)
    print(f"Model ID: {MODEL_NAME}")
    print(f"Endpoint: {ROUTER_URL}\n")

    token = HF_TOKEN or os.getenv("HF_TOKEN") or ""
    if not token:
        print("❌ HF_TOKEN is NOT set!")
        print("\nHow to set your API Key:")
        print("1. Get a token at: https://huggingface.co/settings/tokens")
        print("2. Accept model access at: https://huggingface.co/ai4bharat/indic-conformer-600m-multilingual")
        print("3. Put it in your AI/.env file:")
        print("   HF_TOKEN=hf_your_actual_token_here")
        print("\nOr run in terminal:")
        print("   $env:HF_TOKEN=\"hf_your_actual_token_here\" (PowerShell)")
        print("   python test_indic_conformer_hf.py\n")
        return False

    masked = token[:4] + "..." + token[-4:] if len(token) > 8 else "***"
    print(f"🔑 Detected HF_TOKEN: {masked}")

    # Step 1: Check Model Info & Permissions
    print("\n🔍 Step 1: Checking Hugging Face permissions for this model...")
    headers = {"Authorization": f"Bearer {token}"}
    info_url = f"https://huggingface.co/api/models/{MODEL_NAME}"

    try:
        r = requests.get(info_url, headers=headers, timeout=12)
        if r.status_code == 200:
            data = r.json()
            print(f"✅ Authentication SUCCESS! Model access granted.")
            print(f"   Pipeline: {data.get('pipeline_tag')}")
            print(f"   Gated: {data.get('gated')}")
        elif r.status_code == 401:
            print("❌ Invalid API Key (HTTP 401 Unauthorized).")
            print("   Please verify your token at https://huggingface.co/settings/tokens")
            return False
        elif r.status_code == 403:
            print("⚠️ Model Access Restricted (HTTP 403 Forbidden)!")
            print("   ai4bharat/indic-conformer-600m-multilingual is a gated model.")
            print("   👉 Go to: https://huggingface.co/ai4bharat/indic-conformer-600m-multilingual")
            print("   👉 Click 'Agree and access repository' or request access.")
            print("   Once approved by AI4Bharat, your token will have instant access.\n")
            return False
        else:
            print(f"⚠️ Unexpected response: {r.status_code} - {r.text[:150]}")
    except Exception as e:
        print(f"❌ Connection error: {e}")
        return False

    # Step 2: Audio Transcription Test
    print("\n🎤 Step 2: Testing Speech-to-Text inference...")
    temp_file = None
    if len(sys.argv) > 1 and os.path.exists(sys.argv[1]):
        audio_path = sys.argv[1]
        print(f"   Using provided audio: {audio_path}")
    else:
        temp_file = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        audio_path = temp_file.name
        temp_file.close()
        create_dummy_wav(audio_path)
        print("   Using generated 16kHz test sample audio...")

    try:
        ext = Path(audio_path).suffix.lower()
        content_type = "audio/wav" if ext == ".wav" else ("audio/webm" if ext == ".webm" else "audio/mpeg")

        with open(audio_path, "rb") as f:
            audio_bytes = f.read()

        req_headers = {
            "Authorization": f"Bearer {token}",
            "x-wait-for-model": "true",
            "Content-Type": content_type,
        }

        print(f"   Sending POST to {ROUTER_URL} ({len(audio_bytes)} bytes)...")
        resp = requests.post(ROUTER_URL, headers=req_headers, data=audio_bytes, timeout=45)

        if resp.status_code == 200:
            result = resp.json()
            print("\n🎉 SUCCESS! Response from AI4Bharat IndicConformer API:")
            print(result)
            return True
        elif resp.status_code == 503:
            print(f"\n⏳ Model is currently loading/warming up on Hugging Face (Status 503).")
            print(f"   Response: {resp.text}")
            print("   This is normal for cold models. Try again in 20-30 seconds.")
            return True
        else:
            print(f"\n⚠️ Inference returned status {resp.status_code}: {resp.text}")
            return False
    finally:
        if temp_file and os.path.exists(audio_path):
            try:
                os.unlink(audio_path)
            except Exception:
                pass


if __name__ == "__main__":
    run_diagnostic()
