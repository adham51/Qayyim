# AI Grading Microservice

This service provides an AI-powered grading API using a hybrid RAG (Retrieval-Augmented Generation) pipeline. It grades student answers against a textbook vector database using a two-tier system: fast local matching and deep cloud-based LLM evaluation.

## 📂 Project Structure
* **`chroma_db/`**: Vector database containing textbook embeddings.
* **`server.py`**: Flask API handling grading logic.
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
Start the API on port 5000:

```bash
python server.py
```

## 🔌 API Usage

**Endpoint:** `POST /grade`

### Request Format
```json
{
  "question": "What is Amdahl's Law?",
  "student_answer": "It calculates the theoretical speedup of a task.",
  "model_answer": "Amdahl's Law gives the theoretical speedup in latency..."
}
```
### Response Format
```JSON

{
  "grade": 0.75,
  "feedback": "Correct concept but lacks specific details on latency.",
  "method": "Tier 2: Cloud RAG (Qwen)"
}
```