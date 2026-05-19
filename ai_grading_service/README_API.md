# AI Grading Microservice

This service provides an AI-powered grading API using a hybrid RAG (Retrieval-Augmented Generation) pipeline with tiered evaluation. It grades student answers in computer science topics using:
- **Tier 1**: Fast similarity matching for straightforward answers
- **Tier 2**: LLM-based grading with RAG context (MMR retrieval) for complex answers
- **MCQ/TF**: Direct preprocessing comparison (no RAG needed)

## 📂 Project Structure
* **`chroma_db/`**: Vector database containing textbook embeddings.
* **`server.py`**: Flask API handling grading logic.
* **`config.py`**: Centralized configuration for all settings.
* **`requirements.txt`**: Python dependencies.
* **`.env`**: Configuration file for API keys.

---

## ⚡ Setup & Installation

### 1. Environment Setup
Requires Python 3.10+.

```bash
# Create and activate environment
python -m venv venv
.\venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt
```

### 2. Configuration
Create a `.env` file in the root directory and add your Hugging Face token (must have **Inference Permissions**):

```ini
HF_TOKEN=hf_your_token_here
```

### 3. Running the Server
Start the API on port 5000 (configurable in `config.py`):

```bash
python server.py
```

## 🔌 API Usage

**Endpoint:** `POST /grade`

### Request Format
```json
{
  "examId": "exam123",
  "studentId": "student456",
  "questions": [
    {
      "questionId": "q1",
      "type": "MCQ",
      "question": "What is cache coherence?",
      "modelAns": "A protocol ensuring data consistency across multiple caches",
      "studentAnswer": "A protocol ensuring data consistency across caches"
    },
    {
      "questionId": "q2",
      "type": "TF",
      "question": "Virtual memory is faster than physical memory",
      "modelAns": "false",
      "studentAnswer": "False"
    },
    {
      "questionId": "q3",
      "type": "short answer",
      "question": "Explain the role of the MMU in memory management",
      "modelAns": "The MMU translates virtual addresses to physical addresses using page tables",
      "studentAnswer": "The Memory Management Unit converts virtual memory addresses to actual RAM addresses"
    }
  ]
}
```

### Response Format
```json
{
  "examId": "exam123",
  "studentId": "student456",
  "questions": [
    {
      "questionId": "q1",
      "question": "What is cache coherence?",
      "grade": 1.0,
      "feedback": "Excellent! Answer matches reference closely (similarity: 0.92)"
    },
    {
      "questionId": "q2",
      "question": "Virtual memory is faster than physical memory",
      "grade": 0.0,
      "feedback": "Incorrect. Expected: false, but got: False"
    },
    {
      "questionId": "q3",
      "question": "Explain the role of the MMU in memory management",
      "grade": 0.75,
      "feedback": "Good understanding, mostly correct. (Hybrid similarity: 0.88, Context match: 0.85)"
    }
  ]
}
```

---

## 📊 Grading System

### Question Types
| Type | Grading Method | Uses RAG | Uses LLM |
|------|---------------|---------|---------|
| **MCQ** | Preprocessed exact match | ❌ | ❌ |
| **TF** | Preprocessed exact match | ❌ | ❌ |
| **short answer** | Tiered hybrid similarity | ✅ | ✅ |

### Grading Scale
All answers are graded on a 5-point scale:

| Grade | Meaning |
|-------|---------|
| **1.0** | Complete understanding, accurate technical details, proper CS principles applied |
| **0.75** | Good understanding, mostly correct, minor technical details missing |
| **0.5** | Partial understanding, some correct concepts but missing key aspects |
| **0.25** | Minimal understanding, only basic concepts mentioned, significant gaps |
| **0.0** | Incorrect or no understanding demonstrated |

### Tiered Evaluation (Short Answers)

#### Tier 1: Fast Similarity Check
- Compares student answer with model answer using semantic similarity
- If similarity **≥ 0.75** (configurable `SIMILARITY_THRESHOLD`):
  - **Grade: 1.0** ✅
  - Skip Tier 2

#### Tier 2: RAG + Hybrid Similarity
- Retrieves diverse context using **MMR (Maximal Marginal Relevance)**
  - Fetches 6 candidates, selects 3 most relevant + diverse
  - **0.1 lambda** = 90% semantic, 10% syntax diversity
- Calculates **hybrid similarity**:
  - 50% context similarity + 50% model answer similarity
- Sends to LLM with context for nuanced grading
- Returns grade (0-1.0) with detailed feedback

### MCQ/TF Preprocessing
Answers are normalized before comparison:
- Whitespace removed
- Converted to lowercase
- Special characters handled

Example:
```
"  True  " → "true"
"YES" → "yes"
"No" → "no"
```

---

## ⚙️ Configuration

Edit `config.py` to customize behavior:

```python
# Model Settings
MODEL_REPO = "Qwen/Qwen2.5-7B-Instruct"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
SIMILARITY_THRESHOLD = 0.75  # Tier 1 cutoff

# RAG Settings
RAG_SEARCH_K = 3  # Documents to return
MMR_DIVERSITY_PARAMETER = 0.1  # Semantic vs syntax balance

# Caching Settings
ENABLE_DOCUMENT_CACHE = True  # Enable/disable document caching
DOCUMENT_CACHE_SIZE = 128  # Max questions to cache (LRU replacement)

# API Settings
API_PORT = 5000
API_HOST = '0.0.0.0'

# LLM Settings
LLM_MAX_TOKENS = 250
LLM_TEMPERATURE = 0.1  # Deterministic grading
```

---

## 💾 Document Caching

The service uses **LRU (Least Recently Used) caching** to store retrieved RAG documents for each question, dramatically improving performance during bulk grading.

### How It Works
- **First occurrence** of a question: Retrieves documents from vector DB via MMR (~500ms)
- **Subsequent occurrences**: Returns cached documents instantly (~5ms)
- **Cache key**: Exact question text (case-sensitive)
- **Replacement**: When cache reaches max size, least-used entries are removed

### Performance Impact

**Scenario:** 100 students taking same 10-question exam

| Without Cache | With Cache |
|---|---|
| 100 students × 10 questions × 500ms = **500 seconds** ⏱️ | Student 1: 5000ms + 99 × 50ms = **~10 seconds** ⚡ |
| **~8 minutes** | **50x faster!** |

### Configuration
```python
ENABLE_DOCUMENT_CACHE = True    # Turn caching on/off
DOCUMENT_CACHE_SIZE = 128       # Cache up to 128 unique questions
```

### Example: Bulk Grading
```
Request 1 (Student A, Q1: "Explain cache coherence")
  → Cache MISS → Retrieves docs from DB → Caches them → ~500ms

Request 2 (Student B, Q1: "Explain cache coherence")  
  → Cache HIT → Returns cached docs instantly → ~5ms

Request 3 (Student C, Q1: "Explain cache coherence")
  → Cache HIT → Returns cached docs instantly → ~5ms

... 97 more students ...
  → All cache HIT, all instant
```

---

## 📝 Examples

### Example 1: MCQ (Fast Path)
**Request:**
```json
{
  "examId": "midterm2025",
  "studentId": "s001",
  "questions": [
    {
      "questionId": "q1",
      "type": "MCQ",
      "question": "What is a cache hit?",
      "modelAns": "when the processor finds data in cache",
      "studentAnswer": "When the processor finds data in the cache"
    }
  ]
}
```

**Response:**
```json
{
  "examId": "midterm2025",
  "studentId": "s001",
  "questions": [
    {
      "questionId": "q1",
      "question": "What is a cache hit?",
      "grade": 1.0,
      "feedback": "Correct answer."
    }
  ]
}
```

### Example 2: Short Answer (Tier 2 - RAG)
**Request:**
```json
{
  "examId": "final2025",
  "studentId": "s042",
  "questions": [
    {
      "questionId": "q5",
      "type": "short answer",
      "question": "Describe the difference between spatial and temporal locality",
      "modelAns": "Spatial: accessing nearby memory addresses. Temporal: reusing recently accessed data.",
      "studentAnswer": "Spatial locality means accessing consecutive memory locations. Temporal means accessing the same data multiple times."
    }
  ]
}
```

**Response:**
```json
{
  "examId": "final2025",
  "studentId": "s042",
  "questions": [
    {
      "questionId": "q5",
      "question": "Describe the difference between spatial and temporal locality",
      "grade": 0.75,
      "feedback": "Good understanding, mostly correct. Covers both concepts clearly. (Hybrid similarity: 0.82, Context match: 0.79)"
    }
  ]
}
```

---

## 🛠️ Troubleshooting

| Issue | Solution |
|-------|----------|
| `chroma_db folder not found` | RAG is skipped; LLM grades without context. Populate with textbook embeddings. |
| `JSONDecodeError` | LLM response parsing failed. Check `LLM_TEMPERATURE` is low (<0.3) for deterministic output. |
| `HF_TOKEN error` | Verify `.env` file exists and token has Inference API permissions. |
| Grades always 1.0 | Check `SIMILARITY_THRESHOLD` isn't too low (default 0.75). |

---

## 📚 Reference Materials
- **Computer Systems**: A Programmer's Perspective (Bryant & O'Hallaron)
- Standard CS curriculum topics: algorithms, data structures, systems design, networks, databases

---

## 🔗 Technologies Used
- **LLM**: Qwen 2.5 (7B Instruct) via Hugging Face Inference API
- **Embeddings**: all-MiniLM-L6-v2 (HuggingFace)
- **Vector DB**: Chroma with LangChain
- **Framework**: Flask + Flask-CORS
- **Similarity**: SentenceTransformers + Cosine distance