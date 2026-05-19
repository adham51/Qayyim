"""
Configuration file for AI Grading Service
Contains all static settings and constants
"""

# --- MODEL CONFIGURATION ---
MODEL_REPO = "Qwen/Qwen2.5-7B-Instruct"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
SIMILARITY_THRESHOLD = 0.85

# --- DATABASE CONFIGURATION ---
DB_PATH = "./chroma_db"

# --- RAG CONFIGURATION ---
RAG_SEARCH_K = 3  # Number of documents to retrieve from vector DB
MMR_DIVERSITY_PARAMETER = 0.1  # Balance between relevance and diversity (0.0-1.0)

# --- CACHING CONFIGURATION ---
ENABLE_DOCUMENT_CACHE = True  # Cache retrieved documents for each question
DOCUMENT_CACHE_SIZE = 128  # LRU cache size (number of questions to cache)

# --- GRADING CONFIGURATION ---
GRADING_SCALE = {
    "1.0": "Complete understanding, accurate technical details, proper CS principles applied",
    "0.75": "Good understanding, mostly correct, minor technical details missing or slight inaccuracies",
    "0.5": "Partial understanding, some correct concepts but missing key aspects",
    "0.25": "Minimal understanding, only basic concepts mentioned, significant gaps in knowledge",
    "0.0": "Incorrect, no understanding demonstrated, or completely off-topic"
}

# --- SYSTEM PROMPT ---
GRADER_SYSTEM_PROMPT = """You are a strict computer science grading assistant covering all CS topics including algorithms, 
data structures, system design, networks, databases, software engineering, and more. You must output ONLY valid JSON."""

# --- GRADING PROMPT TEMPLATE ---
SHORT_ANSWER_PROMPT_TEMPLATE = """GRADE THIS STUDENT ANSWER ON COMPUTER SCIENCE TOPICS.

### QUESTION: {question}
### TEXTBOOK CONTEXT: {context}
### MODEL ANSWER: {model_answer}
### STUDENT ANSWER: {student_answer}

Grading Scale:
- 1.0: Complete understanding, accurate technical details, proper CS principles applied
- 0.75: Good understanding, mostly correct, minor technical details missing or slight inaccuracies
- 0.5: Partial understanding, some correct concepts but missing key aspects
- 0.25: Minimal understanding, only basic concepts mentioned, significant gaps in knowledge
- 0.0: Incorrect, no understanding demonstrated, or completely off-topic

OUTPUT FORMAT (JSON ONLY):
{{"grade": <float>, "feedback": "<string>"}}"""

# --- MCQ/TRUE-FALSE CONFIGURATION ---
MCQ_TF_TYPES = ['MCQ', 'TF']

# --- API CONFIGURATION ---
API_PORT = 5000
API_HOST = '0.0.0.0'

# --- LLM PARAMETERS ---
LLM_MAX_TOKENS = 250
LLM_TEMPERATURE = 0.1
