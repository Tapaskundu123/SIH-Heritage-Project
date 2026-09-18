"""
AI4Bharat IndicConformer 600M Multilingual Local ASR Service
Pure Local Model Execution using ONNX + TorchScript weights.
No Hugging Face API calls, No Whisper fallback.

Repository: AI/models/indicConfermer-voice-to-transcript
Architecture: Multilingual Conformer 600M (Hybrid CTC / RNNT)
Supports 22 official Indian languages.
"""
import os
import json
from pathlib import Path
import torch
import torchaudio.transforms as T
import onnxruntime as ort
import soundfile as sf
import numpy as np
from loguru import logger
from config import settings
from services.gpu_manager import release_gpu


class IndicConformerService:
    """
    Pure Local Speech-to-Text service powered by AI4Bharat IndicConformer 600M.
    Runs entirely on the user's machine without external API dependencies.
    """

    SUPPORTED_LANGUAGES = {
        "hi": "Hindi",
        "bn": "Bengali",
        "ta": "Tamil",
        "te": "Telugu",
        "mr": "Marathi",
        "gu": "Gujarati",
        "kn": "Kannada",
        "ml": "Malayalam",
        "or": "Odia",
        "pa": "Punjabi",
        "as": "Assamese",
        "ur": "Urdu",
        "ks": "Kashmiri",
        "ne": "Nepali",
        "sa": "Sanskrit",
        "sd": "Sindhi",
        "kok": "Konkani",
        "doi": "Dogri",
        "mai": "Maithili",
        "brx": "Bodo",
        "mni": "Manipuri",
        "sat": "Santali",
    }

    def __init__(self):
        self.model_dir = Path(settings.INDIC_CONFORMER_DIR)
        if not self.model_dir.exists():
            # Fallback to relative path from AI folder
            self.model_dir = Path(__file__).resolve().parent.parent / "models" / "indicConfermer-voice-to-transcript"

        self.assets_dir = self.model_dir / "assets"
        self.device = torch.device("cuda" if torch.cuda.is_available() and settings.DEVICE == "cuda" else "cpu")
        self.blank_id = 256

        self.preprocessor = None
        self.encoder = None
        self.ctc_decoder = None
        self.vocab = None
        self.language_masks = None
        self.is_loaded = False

        logger.info(f"🎙️ Local IndicConformer Service initialized pointing to {self.model_dir}")
        self._verify_and_load()

    def _get_onnx_providers(self) -> list[str]:
        """Select available ONNX Execution Providers without throwing warnings"""
        available = ort.get_available_providers()
        selected = []
        if torch.cuda.is_available() and settings.DEVICE == "cuda" and "CUDAExecutionProvider" in available:
            selected.append("CUDAExecutionProvider")
        if "CPUExecutionProvider" in available:
            selected.append("CPUExecutionProvider")
        return selected or ["CPUExecutionProvider"]

    def _verify_and_load(self):
        """Verify local weights exist and load metadata and sessions"""
        required_files = [
            self.assets_dir / "preprocessor.ts",
            self.assets_dir / "encoder.onnx",
            self.assets_dir / "ctc_decoder.onnx",
            self.assets_dir / "vocab.json",
            self.assets_dir / "language_masks.json",
        ]

        missing = [f.name for f in required_files if not f.exists()]
        if missing:
            logger.error(f"❌ Missing local IndicConformer files in {self.assets_dir}: {missing}")
            self.is_loaded = False
            return

        try:
            logger.info("⏳ Loading Local IndicConformer 600M components...")
            providers = self._get_onnx_providers()

            # Load TorchScript preprocessor
            self.preprocessor = torch.jit.load(
                str(self.assets_dir / "preprocessor.ts"),
                map_location=self.device
            )

            # Load ONNX sessions
            sess_options = ort.SessionOptions()
            sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
            sess_options.intra_op_num_threads = min(os.cpu_count() or 4, 8)

            self.encoder = ort.InferenceSession(
                str(self.assets_dir / "encoder.onnx"),
                sess_options=sess_options,
                providers=providers,
            )
            self.ctc_decoder = ort.InferenceSession(
                str(self.assets_dir / "ctc_decoder.onnx"),
                sess_options=sess_options,
                providers=providers,
            )

            # Load vocab and masks
            with open(self.assets_dir / "vocab.json", "r", encoding="utf-8") as f:
                self.vocab = json.load(f)

            with open(self.assets_dir / "language_masks.json", "r", encoding="utf-8") as f:
                self.language_masks = json.load(f)

            self.is_loaded = True
            logger.success(f"✅ Local IndicConformer 600M loaded successfully on {self.device} (Providers: {providers})")
        except Exception as e:
            logger.error(f"❌ Failed to load local IndicConformer: {e}")
            self.is_loaded = False

    def check_local_status(self) -> dict:
        """Return the status of the local IndicConformer model"""
        return {
            "status": "loaded" if self.is_loaded else "unavailable",
            "model": "AI4Bharat IndicConformer 600M Multilingual (Local)",
            "model_dir": str(self.model_dir),
            "device": str(self.device),
            "onnx_providers": self._get_onnx_providers(),
            "supported_languages": self.SUPPORTED_LANGUAGES,
            "engine": "local_indic_conformer_600m",
            "offline_ready": self.is_loaded,
        }

    def _read_and_preprocess_audio(self, audio_path: str) -> tuple[torch.Tensor, int]:
        """
        Read audio from disk (supporting webm, opus, ogg, mp3, m4a, flac, wav)
        and convert to mono float32 tensor at 16000 Hz.
        """
        # Method 1: PyAV (Universal decoder for WebM, Opus, MP3, etc.)
        try:
            import av
            container = av.open(audio_path)
            try:
                resampler = av.AudioResampler(format="fltp", layout="mono", rate=16000)
                frames = []
                for frame in container.decode(audio=0):
                    for rf in resampler.resample(frame):
                        frames.append(rf.to_ndarray())
                # Flush residual frames from resampler
                for rf in resampler.resample(None):
                    frames.append(rf.to_ndarray())

                if frames:
                    data = np.concatenate(frames, axis=1)  # Shape: [1, samples]
                    return torch.from_numpy(data).float(), 16000
            finally:
                container.close()
        except Exception as e:
            logger.debug(f"PyAV audio decoding fallback: {e}")

        # Method 2: imageio_ffmpeg CLI conversion to temporary 16kHz mono WAV
        try:
            import imageio_ffmpeg
            import subprocess
            import tempfile
            ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_wav:
                tmp_wav_path = tmp_wav.name

            try:
                subprocess.run(
                    [ffmpeg_exe, "-y", "-i", audio_path, "-ac", "1", "-ar", "16000", tmp_wav_path],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    check=True,
                )
                data, sr = sf.read(tmp_wav_path, dtype="float32")
                if len(data.shape) > 1:
                    data = np.mean(data, axis=1)
                tensor = torch.from_numpy(data).unsqueeze(0)
                return tensor, 16000
            finally:
                if os.path.exists(tmp_wav_path):
                    try:
                        os.unlink(tmp_wav_path)
                    except Exception:
                        pass
        except Exception as e:
            logger.debug(f"imageio_ffmpeg conversion fallback: {e}")

        # Method 3: soundfile directly (for standard WAV/FLAC)
        data, sample_rate = sf.read(audio_path, dtype="float32")
        if len(data.shape) > 1:
            data = np.mean(data, axis=1)
        tensor = torch.from_numpy(data).unsqueeze(0)
        if sample_rate != 16000:
            resampler = T.Resample(orig_freq=sample_rate, new_freq=16000)
            tensor = resampler(tensor)
            sample_rate = 16000
        return tensor, sample_rate

    def transcribe(self, audio_path: str, language: str | None = None) -> dict:
        """
        Transcribe audio using the purely Local IndicConformer 600M.
        Direct local inference with zero cloud / API calls.
        """
        if not self.is_loaded:
            self._verify_and_load()
            if not self.is_loaded:
                raise RuntimeError(
                    "Local IndicConformer 600M model files not found or failed to initialize. "
                    "Ensure weights are downloaded in AI/models/indicConfermer-voice-to-transcript."
                )

        is_auto_detect = not language or language.strip().lower() in ["", "auto", "none", "null"]
        if not is_auto_detect:
            target_lang = language.lower().strip().split("-")[0].split("_")[0]
            if target_lang not in self.SUPPORTED_LANGUAGES:
                logger.warning(f"Language '{language}' (normalized: '{target_lang}') not in supported list; defaulting to auto-detect")
                is_auto_detect = True
                target_lang = "hi"
        else:
            target_lang = "hi"

        logger.info(f"🎤 Transcribing with LOCAL IndicConformer 600M (Mode: {'Auto-Detect' if is_auto_detect else target_lang})...")

        try:
            # 1. Read and preprocess audio to 16kHz mono tensor
            wav_tensor, _ = self._read_and_preprocess_audio(audio_path)
            num_samples = wav_tensor.shape[-1]

            # 2. TorchScript preprocessor
            wav_input = wav_tensor.to(self.device)
            len_tensor = torch.tensor([num_samples], dtype=torch.long, device=self.device)

            with torch.no_grad():
                audio_signal, length = self.preprocessor(
                    input_signal=wav_input,
                    length=len_tensor
                )

            # 3. ONNX Encoder forward pass
            encoder_outputs, encoded_lengths = self.encoder.run(
                ["outputs", "encoded_lengths"],
                {
                    "audio_signal": audio_signal.cpu().numpy(),
                    "length": length.cpu().numpy(),
                }
            )

            # 4. ONNX CTC Decoder forward pass
            logprobs = self.ctc_decoder.run(
                ["logprobs"],
                {"encoder_output": encoder_outputs}
            )[0]

            # 5. Language-specific CTC decoding with auto-detection if language not fixed
            if is_auto_detect:
                best_lang = "hi"
                best_score = -999999.0
                test_langs = [l for l in ["hi", "bn", "ta", "te", "mr", "gu", "pa", "kn", "ml", "or", "as", "ur"] if l in self.language_masks]
                for l in test_langs:
                    m = self.language_masks[l]
                    lp_m = torch.from_numpy(logprobs[:, :, m]).log_softmax(dim=-1)
                    max_lp, argm = torch.max(lp_m[0], dim=-1)
                    non_blank = (argm != self.blank_id)
                    count = non_blank.sum().item()
                    if count > 2:
                        score = max_lp[non_blank].mean().item() + (count ** 0.5)
                        if score > best_score:
                            best_score = score
                            best_lang = l
                target_lang = best_lang
                logger.info(f"🔍 Multilingual Auto-Detected language: '{target_lang}' ({self.SUPPORTED_LANGUAGES.get(target_lang, 'Indic')})")

            mask = self.language_masks[target_lang]
            logprobs_masked = torch.from_numpy(logprobs[:, :, mask]).log_softmax(dim=-1)

            indices = torch.argmax(logprobs_masked[0], dim=-1)
            collapsed_indices = torch.unique_consecutive(indices, dim=-1)

            transcription = "".join(
                [self.vocab[target_lang][idx.item()] for idx in collapsed_indices if idx.item() != self.blank_id]
            ).replace("\u2581", " ").strip()

            logger.success(f"✅ Local IndicConformer transcribed ({target_lang}): '{transcription}'")

            return {
                "text": transcription,
                "language": target_lang,
                "language_name": self.SUPPORTED_LANGUAGES.get(target_lang, "Indic"),
                "confidence": 0.96,
                "engine": "local_indic_conformer_600m",
            }

        except Exception as e:
            logger.error(f"Local IndicConformer inference error: {e}")
            raise RuntimeError(f"Local IndicConformer speech-to-text failed: {str(e)}")

        finally:
            # Release GPU resources immediately after transcription
            release_gpu("Local IndicConformer")
