import os
import json
import re
from flask import Flask, request, jsonify
from flask_cors import CORS
from sentence_transformers import SentenceTransformer, util
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from huggingface_hub import InferenceClient
from dotenv import load_dotenv

# 1. Load Secrets
load_dotenv()
HF_TOKEN = os.getenv("HF_TOKEN") # We will set this next
MODEL_ID = "Qwen/Qwen2.5-7B-Instruct"

app = Flask(__name__)
CORS(app) # Allows Next.js to talk to this

# 2. Load "Memory" (ChromaDB) - Runs on CPU
print("Loading Database...")
embedding_function = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
db_path = "./chroma_db" # Make sure this folder exists!

if os.path.exists(db_path):
    vector_db = Chroma(persist_directory=db_path, embedding_function=embedding_function)
    print("✅ Database Loaded!")
else:
    print("❌ ERROR: 'chroma_db' folder not found. RAG will not work.")
    vector_db = None

# 3. Connect to "Brain" (Hugging Face Cloud)
client = InferenceClient(model=MODEL_ID, token=HF_TOKEN)

# --- Helper Functions ---
def get_rag_context(question):
    """Searches your local database for textbook answers"""
    if not vector_db: return ""
    # Get 3 best matches
    results = vector_db.similarity_search(question, k=3)
    return "\n".join([doc.page_content for doc in results])

def calculate_similarity(text1, text2):
    """Math check for exact matches (Runs on CPU)"""
    # We use a raw sentence transformer for this quick math
    model = SentenceTransformer('all-MiniLM-L6-v2')
    emb1 = model.encode(text1, convert_to_tensor=True)
    emb2 = model.encode(text2, convert_to_tensor=True)
    return util.cos_sim(emb1, emb2).item()

# --- The API Endpoint ---
@app.route("/grade", methods=["POST"])
def grade_answer():
    data = request.json
    question = data.get("question")
    student_ans = data.get("student_answer")
    model_ans = data.get("model_answer", "")

    print(f"Received Question: {question}")

    # PHASE 1: Fast Check (Local)
    # If the professor provided a model answer, check if student matches it exactly.
    if model_ans:
        sim_score = calculate_similarity(student_ans, model_ans)
        if sim_score > 0.85:
            return jsonify({
                "grade": 1.0,
                "feedback": "Perfect match with the model answer.",
                "method": "Local_Similarity_Check"
            })

    # PHASE 2: RAG Check (Cloud)
    # 1. Get context from local DB
    context = get_rag_context(question)
    
    # 2. Prepare Prompt
    prompt = f"""
    You are a strict grading assistant.
    
    ### DATA
    Question: {question}
    Student Answer: {student_ans}
    Reference Context: {context}
    
    ### INSTRUCTION
    Grade the student strictly based on the Reference Context.
    Output JSON ONLY: {{"grade": 0.0 to 1.0, "feedback": "2 sentences max"}}
    """

    # 3. Send to Cloud (Hugging Face)
    try:
        response = client.text_generation(
            prompt, 
            max_new_tokens=150, 
            temperature=0.1
        )
        
        # 4. Clean up the response
        match = re.search(r"\{.*\}", response, re.DOTALL)
        if match:
            result = json.loads(match.group(0))
            result["method"] = "Cloud_RAG"
            return jsonify(result)
        else:
            return jsonify({"grade": 0, "feedback": "Error parsing AI response"}), 500

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(port=5000, debug=True)