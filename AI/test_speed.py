import time
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig

local_dir = "models/qwen2.5-3b-instruct"
tokenizer = AutoTokenizer.from_pretrained(local_dir)

print("Testing model load...")
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.float16,
)

model = AutoModelForCausalLM.from_pretrained(
    local_dir,
    quantization_config=bnb_config,
    device_map="cuda:0",
    attn_implementation="sdpa",
    torch_dtype=torch.float16,
)

prompt = "Write a 2-sentence description of an Indian brass lamp."
inputs = tokenizer(prompt, return_tensors="pt").to("cuda:0")

print("Warmup...")
t0 = time.time()
with torch.no_grad():
    out = model.generate(**inputs, max_new_tokens=40, use_cache=True)
t1 = time.time()
print(f"Warmup 40 tokens took: {t1 - t0:.2f}s (Speed: {40 / (t1 - t0):.2f} tokens/s)")

print("Testing 150 tokens...")
t0 = time.time()
with torch.no_grad():
    out = model.generate(**inputs, max_new_tokens=150, use_cache=True)
t1 = time.time()
print(f"150 tokens took: {t1 - t0:.2f}s (Speed: {150 / (t1 - t0):.2f} tokens/s)")
print("Sample output:", tokenizer.decode(out[0], skip_special_tokens=True))
