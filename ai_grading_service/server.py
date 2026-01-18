import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from huggingface_hub import InferenceClient
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from sentence_transformers import SentenceTransformer, util

# --- CONFIGURATION ---
load_dotenv()
HF_TOKEN = os.getenv("HF_TOKEN")
DB_PATH = "./chroma_db"
# We keep using Qwen because it is smart, but we will talk to it differently
MODEL_REPO = "Qwen/Qwen2.5-7B-Instruct" 

app = Flask(__name__)
CORS(app)

print("🚀 Starting AI Grader (Cloud Mode)...")

# --- LOAD RESOURCES ---
client = InferenceClient(api_key=HF_TOKEN) # Updated Client Init

# Load Vector DB
embedding_fn = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
# Basic check to prevent crash if folder missing
if os.path.exists(DB_PATH):
    vector_db = Chroma(persist_directory=DB_PATH, embedding_function=embedding_fn)
    print("✅ Vector Database Loaded.")
else:
    vector_db = None
    print("⚠️ WARNING: chroma_db folder not found. RAG will be skipped.")

# Load Similarity Checker
similarity_model = SentenceTransformer("all-MiniLM-L6-v2")
print("✅ Similarity Model Loaded.")

# --- HELPER FUNCTIONS ---
def get_rag_context(question):
    if not vector_db:
        return "No textbook context available."
    
    # We create the retriever
    retriever = vector_db.as_retriever(
        search_type="mmr", 
        search_kwargs={'k': 3, 'fetch_k': 10}
    )
    
    # Change .get_relevant_documents to .invoke
    docs = retriever.invoke(question)
    
    return "\n\n".join([doc.page_content for doc in docs])

def check_similarity(student_ans, model_ans):
    emb1 = similarity_model.encode(student_ans, convert_to_tensor=True)
    emb2 = similarity_model.encode(model_ans, convert_to_tensor=True)
    return util.cos_sim(emb1, emb2).item()

# --- API ENDPOINT ---
@app.route('/grade', methods=['POST'])
def grade():
    try:
        data = request.json
        question = data.get('question')
        student_ans = data.get('student_answer')
        model_ans = data.get('model_answer')

        # TIER 1: Fast Similarity Check
        if model_ans:
            sim_score = check_similarity(student_ans, model_ans)
            print(f"DEBUG: Similarity Score = {sim_score:.4f}")
            if sim_score > 0.85:
                return jsonify({
                    "grade": 1.0,
                    "feedback": "Excellent! Exact match with reference.",
                    "method": "Tier 1: Local Similarity"
                })

        # TIER 2: Cloud RAG Grading (Using Chat Completion)
        context = get_rag_context(question)
        
        # We construct a chat message list instead of a raw string
        messages = [
            { 
                "role": "system", 
                "content": "You are a strict academic grading assistant. You must output ONLY valid JSON." 
            },
            { 
                "role": "user", 
                "content": f"""
                GRADE THIS STUDENT ANSWER.
                
                ### QUESTION: {question}
                ### TEXTBOOK CONTEXT: {context}
                ### STUDENT ANSWER: {student_ans}
                
                Rubric:
                - 1.0: Correct concept, fully supported.
                - 0.5: Partially correct.
                - 0.0: Incorrect.

                OUTPUT FORMAT (JSON ONLY):
                {{"grade": <float>, "feedback": "<string>"}}
                """ 
            }
        ]
        
        # CALL THE CHAT API
        response = client.chat_completion(
            model=MODEL_REPO,
            messages=messages, 
            max_tokens=250, 
            temperature=0.1
        )
        
        # Extract the content from the chat response
        ai_text = response.choices[0].message.content
        
        # Clean up code blocks if the AI adds them (e.g. ```json ... ```)
        ai_text = ai_text.replace("```json", "").replace("```", "").strip()

        return jsonify({
            "response": json.loads(ai_text), # Try to parse JSON
            "method": "Tier 2: Cloud RAG (Qwen)"
        })

    except json.JSONDecodeError:
        # Fallback if AI didn't give perfect JSON
        return jsonify({
            "grade": 0.0, 
            "feedback": "Error parsing AI response", 
            "raw_output": ai_text
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Changing this to False stops the "Pipe" error on Windows
    app.run(host='0.0.0.0', port=5000, debug=False)