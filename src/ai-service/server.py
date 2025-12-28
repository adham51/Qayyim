# Install: pip install flask flask-cors chromadb sentence-transformers huggingface_hub python-dotenv
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from sentence_transformers import SentenceTransformer, util
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from huggingface_hub import InferenceClient
from dotenv import load_dotenv

load_dotenv() # Load HF_TOKEN from .env

app = Flask(__name__)
CORS(app) # Allow Next.js to talk to this

# --- LOAD MODELS (Runs once) ---
print("Loading AI Service...")
hf_token = os.getenv("HF_TOKEN")
model_id = "Qwen/Qwen2.5-7B-Instruct"

# 1. The "Brain" (Cloud)
client = InferenceClient(model=model_id, token=hf_token)

# 2. The "Memory" (Local CPU)
embedder = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
vector_db = Chroma(persist_directory="./chroma_db", embedding_function=embedder)

# 3. The "Math" (Local CPU)
raw_embedder = SentenceTransformer('all-MiniLM-L6-v2')

# --- GRADING LOGIC ---
@app.route("/grade", methods=["POST"])
def grade_endpoint():
    data = request.json
    q = data.get("question")
    s_ans = data.get("student_answer")
    m_ans = data.get("model_answer")

    # PHASE 1: Fast Math Check (Local)
    if m_ans:
        emb1 = raw_embedder.encode(s_ans, convert_to_tensor=True)
        emb2 = raw_embedder.encode(m_ans, convert_to_tensor=True)
        sim = util.cos_sim(emb1, emb2).item()
        
        if sim > 0.85:
            return jsonify({"grade": 1.0, "feedback": "Perfect match.", "method": "Fast_Local"})

    # PHASE 2: RAG Check (Cloud)
    # Search local DB
    docs = vector_db.similarity_search(q, k=3)
    context = "\n".join([d.page_content for d in docs])

    # Ask Qwen (Cloud)
    prompt = f"Question: {q}\nStudent: {s_ans}\nContext: {context}\nGrade (0-1) and Feedback (2 sentences) as JSON."
    
    response = client.text_generation(prompt, max_new_tokens=200, temperature=0.1)
    
    return jsonify({"raw_ai": response, "method": "Cloud_RAG"})

if __name__ == "__main__":
    app.run(port=5000)