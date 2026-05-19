import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from huggingface_hub import InferenceClient
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from sentence_transformers import SentenceTransformer, util
from functools import lru_cache
from config import (
    MODEL_REPO, EMBEDDING_MODEL, SIMILARITY_THRESHOLD, DB_PATH,
    RAG_SEARCH_K, MMR_DIVERSITY_PARAMETER, GRADER_SYSTEM_PROMPT, SHORT_ANSWER_PROMPT_TEMPLATE,
    MCQ_TF_TYPES, API_PORT, API_HOST,
    LLM_MAX_TOKENS, LLM_TEMPERATURE, ENABLE_DOCUMENT_CACHE, DOCUMENT_CACHE_SIZE
)

# --- CONFIGURATION ---
load_dotenv()
HF_TOKEN = os.getenv("HF_TOKEN") 

app = Flask(__name__)
CORS(app)

print("🚀 Starting AI Grader (Cloud Mode)...")

# --- LOAD RESOURCES ---
client = InferenceClient(api_key=HF_TOKEN) # Updated Client Init

# Load Vector DB
embedding_fn = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
# Basic check to prevent crash if folder missing
if os.path.exists(DB_PATH):
    vector_db = Chroma(persist_directory=DB_PATH, embedding_function=embedding_fn)
    print("✅ Vector Database Loaded.")
else:
    vector_db = None
    print("⚠️ WARNING: chroma_db folder not found. RAG will be skipped.")

# Load Similarity Checker
similarity_model = SentenceTransformer(EMBEDDING_MODEL)
print("✅ Similarity Model Loaded.")

# --- HELPER FUNCTIONS ---
def preprocess_answer(text):
    """Normalize text for comparison: remove spaces, convert to lowercase"""
    return text.strip().lower().replace(" ", "")

def get_rag_context(question):
    if not vector_db:
        return "No textbook context available."
    docs = vector_db.similarity_search(question, k=RAG_SEARCH_K)
    return "\n\n".join([doc.page_content for doc in docs])

def get_rag_context_mmr(question):
    """Retrieve context using MMR (Maximal Marginal Relevance) for diversity"""
    if not vector_db:
        return "No textbook context available."
    docs = vector_db.max_marginal_relevance_search(
        question, 
        k=RAG_SEARCH_K,
        fetch_k=RAG_SEARCH_K * 2,
        lambda_mult=MMR_DIVERSITY_PARAMETER
    )
    return "\n\n".join([doc.page_content for doc in docs])

# Apply caching if enabled
if ENABLE_DOCUMENT_CACHE:
    get_rag_context_mmr = lru_cache(maxsize=DOCUMENT_CACHE_SIZE)(get_rag_context_mmr)
    print(f"✅ Document Cache Enabled (size: {DOCUMENT_CACHE_SIZE})")

def check_similarity(student_ans, model_ans):
    emb1 = similarity_model.encode(student_ans, convert_to_tensor=True)
    emb2 = similarity_model.encode(model_ans, convert_to_tensor=True)
    return util.cos_sim(emb1, emb2).item()

def grade_mcq_or_tf(student_answer, model_answer):
    """Grade MCQ or True/False by comparing preprocessed answers"""
    student_clean = preprocess_answer(student_answer)
    model_clean = preprocess_answer(model_answer)
    
    if student_clean == model_clean:
        return 1.0, "Correct answer."
    else:
        return 0.0, f"Incorrect. Expected: {model_answer}, but got: {student_answer}"

def grade_short_answer_tier1(student_answer, model_answer):
    """TIER 1: Fast similarity check between student and model answer"""
    sim_score = check_similarity(student_answer, model_answer)
    
    if sim_score >= SIMILARITY_THRESHOLD:
        return True, 1.0, f"Excellent! Answer matches reference closely (similarity: {sim_score:.2f})"
    return False, None, None

def grade_short_answer_tier2(question, student_answer, model_answer):
    """TIER 2: RAG + Hybrid similarity with MMR for diversity"""
    context = get_rag_context_mmr(question)
    
    # Compare student answer with retrieved context
    student_emb = similarity_model.encode(student_answer, convert_to_tensor=True)
    context_emb = similarity_model.encode(context, convert_to_tensor=True)
    context_similarity = util.cos_sim(student_emb, context_emb).item()
    
    # Also compare with model answer for additional signal
    model_sim = check_similarity(student_answer, model_answer)
    
    # Hybrid score: weighted combination
    hybrid_score = (context_similarity + model_sim) / 2
    
    # Use LLM for final grading with context
    messages = [
        { 
            "role": "system", 
            "content": GRADER_SYSTEM_PROMPT
        },
        { 
            "role": "user", 
            "content": SHORT_ANSWER_PROMPT_TEMPLATE.format(
                question=question,
                context=context,
                model_answer=model_answer,
                student_answer=student_answer
            )
        }
    ]
    
    response = client.chat_completion(
        model=MODEL_REPO,
        messages=messages, 
        max_tokens=LLM_MAX_TOKENS, 
        temperature=LLM_TEMPERATURE
    )
    
    ai_text = response.choices[0].message.content
    ai_text = ai_text.replace("```json", "").replace("```", "").strip()
    
    result = json.loads(ai_text)
    grade = result.get("grade", 0.0)
    feedback = result.get("feedback", "No feedback provided")
    
    # Add hybrid similarity info to feedback
    feedback += f" (Hybrid similarity: {hybrid_score:.2f}, Context match: {context_similarity:.2f})"
    
    return grade, feedback

def grade_short_answer(question, student_answer, model_answer):
    """Grade short answer with tiered approach"""
    # TIER 1: Fast similarity check
    tier1_passed, tier1_grade, tier1_feedback = grade_short_answer_tier1(student_answer, model_answer)
    
    if tier1_passed:
        return tier1_grade, tier1_feedback
    
    # TIER 2: RAG + Hybrid approach with MMR
    return grade_short_answer_tier2(question, student_answer, model_answer)

# --- API ENDPOINT ---
@app.route('/grade', methods=['POST'])
def grade():
    try:
        data = request.json
        exam_id = data.get('examId')
        student_id = data.get('studentId')
        questions = data.get('questions', [])
        
        graded_questions = []
        
        for q in questions:
            question_id = q.get('questionId')
            question_type = q.get('type')  # MCQ, TF, or short answer
            question_text = q.get('question')
            model_answer = q.get('modelAns')
            student_answer = q.get('studentAnswer')
            
            # Grade based on question type
            if question_type in MCQ_TF_TYPES:
                # Direct comparison with preprocessing
                grade, feedback = grade_mcq_or_tf(student_answer, model_answer)
            else:
                # short answer - use LLM with RAG
                grade, feedback = grade_short_answer(question_text, student_answer, model_answer)
            
            graded_questions.append({
                "questionId": question_id,
                "question": question_text,
                "grade": grade,
                "feedback": feedback
            })
        
        return jsonify({
            "examId": exam_id,
            "studentId": student_id,
            "questions": graded_questions
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host=API_HOST, port=API_PORT)