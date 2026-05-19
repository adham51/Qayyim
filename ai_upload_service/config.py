import os
from dotenv import load_dotenv

load_dotenv()

# --- SERVER ---
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", 5003))

# --- PATHS ---
UPLOAD_FOLDER = './uploads'
ALLOWED_EXTENSIONS = {'pdf'}
DB_PATH = "./vector_store/chroma_db"  # ✅ FIXED - Docker-compatible path

# --- OPENROUTER / DEEPSEEK SETTINGS ---
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

# The Model: DeepSeek R1 Distill (Free & Smart)
LLM_MODEL_NAME = "tngtech/deepseek-r1t2-chimera:free" 
EMBEDDING_MODEL = "all-MiniLM-L6-v2"

# --- TUNING ---
BATCH_SIZE = 5          
TEST_CHUNK_START = 100 
TEST_CHUNK_COUNT = 10   

# --- PROMPTS ---
RELEVANCE_PROMPT = """
Target Subject: "{subject}"
Text Sample: "{text_sample}"
Does this text belong to the Target Subject?
Reply ONLY JSON: {{"is_relevant": true/false, "reason": "..."}}
"""

BATCH_ENRICHMENT_PROMPT = """
Role: Technical Editor for {subject}.
Task: Process these snippets.
Return JSON: {{ "results": [ {{ "id": ..., "keep": bool, "clean_text": "...", "topic": "...", "subtopic": "..." }} ] }}
Input: {input_json}
"""

SINGLE_ENRICHMENT_PROMPT = """
Role: Technical Editor for {subject}.
Snippet: "{chunk_text}"
Return JSON: {{ "keep": bool, "clean_text": "...", "topic": "...", "subtopic": "..." }}
"""