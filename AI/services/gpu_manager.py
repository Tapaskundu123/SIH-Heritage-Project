"""
GPU Lifecycle Manager for KarigarSetu AI Service
Ensures sequential model execution and releases VRAM immediately after inference.
"""
import gc
import torch
from contextlib import contextmanager
from loguru import logger


def release_gpu(context: str = ""):
    """Purges PyTorch CUDA memory cache and triggers garbage collection"""
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.ipc_collect()
        free, total = torch.cuda.mem_get_info()
        ctx_str = f" after [{context}]" if context else ""
        logger.info(
            f"🧹 GPU VRAM Released{ctx_str} | Free: {free / 1024**3:.2f} GB / {total / 1024**3:.2f} GB"
        )


@contextmanager
def gpu_inference_scope(model_name: str = "Model"):
    """
    Context manager to run a model on GPU and guarantee release of VRAM when done.
    Usage:
        with gpu_inference_scope("BiRefNet"):
            output = model(image)
    """
    logger.info(f"⚡ Entering GPU scope for {model_name}...")
    try:
        yield
    finally:
        release_gpu(context=model_name)
