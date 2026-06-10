import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import requests
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

app = Flask(__name__)
CORS(app)

print("🚀 Starting AI Grader (Kaggle Mode)...")

# --- KAGGLE CLIENT ---
class KaggleClient:
    def __init__(self, base_url):
        self.base_url = base_url.rstrip('/')
    
    def chat_completion(self, model, messages, max_tokens, temperature):
        print(f"\n🌐 Sending request to Kaggle/Qwen...")
        print(f"   URL: {self.base_url}/v1/chat/completions")
        print(f"   Model: {model}")
        print(f"   Max Tokens: {max_tokens}")
        print(f"   Temperature: {temperature}")
        print(f"   Messages: {len(messages)} messages")
        
        # Show the actual prompt being sent
        for i, msg in enumerate(messages):
            print(f"   Message {i+1} ({msg['role']}): {msg['content'][:200]}...")
        
        headers = {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true"
        }

        try:
            response = requests.post(
                f"{self.base_url}/v1/chat/completions",
                headers=headers,
                json={
                    "model": model,
                    "messages": messages,
                    "max_tokens": max_tokens,
                    "temperature": temperature
                },
                timeout=60
            )

            print(f"   📡 Response Status: {response.status_code}")
            
            if response.status_code != 200:
                print(f"   ❌ API Error {response.status_code}: {response.text}")
                raise Exception(f"API Error {response.status_code}: {response.text}")

            data = response.json()
            response_text = data['choices'][0]['message']['content']
            
            print(f"   ✅ Qwen Response: {response_text[:200]}...")
            
            class Message:
                def __init__(self, content):
                    self.content = content
            
            class Choice:
                def __init__(self, message):
                    self.message = message
            
            class Response:
                def __init__(self, choices):
                    self.choices = choices
            
            return Response([Choice(Message(response_text))])
            
        except requests.exceptions.Timeout:
            print(f"   ⏱️ Request timed out after 60 seconds")
            raise Exception("Qwen API request timed out")
        except requests.exceptions.ConnectionError as e:
            print(f"   🔌 Connection error: {str(e)}")
            raise Exception(f"Could not connect to Qwen API: {str(e)}")
        except Exception as e:
            print(f"   ❌ Unexpected error: {str(e)}")
            raise

# Initialize Kaggle client with your ngrok URL
client = KaggleClient("https://unvacillating-gita-lowliest.ngrok-free.dev")
print("✅ Connected to Kaggle API")

# Load Vector DB
embedding_fn = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
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
    print(f"   🔍 Retrieving RAG context for: {question[:100]}...")
    if not vector_db:
        print(f"   ⚠️ No vector DB available")
        return "No textbook context available."
    
    docs = vector_db.max_marginal_relevance_search(
        question, 
        k=RAG_SEARCH_K,
        fetch_k=RAG_SEARCH_K * 2,
        lambda_mult=MMR_DIVERSITY_PARAMETER
    )
    context = "\n\n".join([doc.page_content for doc in docs])
    print(f"   ✅ Retrieved {len(docs)} documents, total context length: {len(context)} chars")
    return context

# Apply caching if enabled
if ENABLE_DOCUMENT_CACHE:
    get_rag_context_mmr = lru_cache(maxsize=DOCUMENT_CACHE_SIZE)(get_rag_context_mmr)
    print(f"✅ Document Cache Enabled (size: {DOCUMENT_CACHE_SIZE})")

def check_similarity(student_ans, model_ans):
    # Handle None or empty strings
    if not student_ans or not model_ans:
        print(f"   ⚠️ Cannot calculate similarity: student_ans={student_ans}, model_ans={model_ans}")
        return 0.0
    
    # Convert to string if needed
    student_ans = str(student_ans).strip()
    model_ans = str(model_ans).strip()
    
    if not student_ans or not model_ans:
        print(f"   ⚠️ Empty answer after stripping")
        return 0.0
    
    emb1 = similarity_model.encode(student_ans, convert_to_tensor=True)
    emb2 = similarity_model.encode(model_ans, convert_to_tensor=True)
    score = util.cos_sim(emb1, emb2).item()
    print(f"   📊 Similarity score: {score:.3f}")
    return score

def grade_mcq_or_tf(student_answer, model_answer):
    """Grade MCQ or True/False by comparing preprocessed answers"""
    
    # Handle None values
    if not student_answer:
        print(f"   ⚠️ No student answer provided")
        return 0.0, "No answer provided by student"
    
    if not model_answer:
        print(f"   ⚠️ No model answer available")
        return 0.0, "Model answer not available for comparison"
    
    student_clean = preprocess_answer(str(student_answer))
    model_clean = preprocess_answer(str(model_answer))
    
    print(f"   🔤 Comparing: '{student_clean}' vs '{model_clean}'")
    
    if student_clean == model_clean:
        return 1.0, "Correct answer."
    else:
        return 0.0, f"Incorrect. Expected: {model_answer}, but got: {student_answer}"

def grade_short_answer_tier1(student_answer, model_answer):
    """TIER 1: Fast similarity check between student and model answer"""
    print(f"   🎯 TIER 1: Fast similarity check")
    
    # Handle None or empty answers
    if not student_answer or not model_answer:
        print(f"   ⚠️ Missing answer - student: {bool(student_answer)}, model: {bool(model_answer)}")
        print(f"   ⏭️ TIER 1 SKIPPED, proceeding to TIER 2")
        return False, None, None
    
    sim_score = check_similarity(student_answer, model_answer)
    
    if sim_score >= SIMILARITY_THRESHOLD:
        print(f"   ✅ TIER 1 PASSED (similarity: {sim_score:.2f} >= {SIMILARITY_THRESHOLD})")
        return True, 1.0, f"Excellent! Answer matches reference closely (similarity: {sim_score:.2f})"
    
    print(f"   ⏭️ TIER 1 FAILED (similarity: {sim_score:.2f} < {SIMILARITY_THRESHOLD}), proceeding to TIER 2")
    return False, None, None

def grade_short_answer_tier2(question, student_answer, model_answer):
    """TIER 2: RAG + Hybrid similarity with MMR for diversity"""
    print(f"   🧠 TIER 2: RAG + LLM grading")
    
    # Handle None values
    if not student_answer:
        print(f"   ⚠️ No student answer provided")
        return 0.0, "No answer provided by student"
    
    if not model_answer:
        print(f"   ⚠️ No model answer available")
        model_answer = "No model answer available"
    
    # Convert to strings
    student_answer = str(student_answer).strip()
    model_answer = str(model_answer).strip()
    question = str(question).strip() if question else "No question text"
    
    context = get_rag_context_mmr(question)
    
    # Compare student answer with retrieved context
    student_emb = similarity_model.encode(student_answer, convert_to_tensor=True)
    context_emb = similarity_model.encode(context, convert_to_tensor=True)
    context_similarity = util.cos_sim(student_emb, context_emb).item()
    
    # Also compare with model answer for additional signal
    model_sim = check_similarity(student_answer, model_answer)
    
    # Hybrid score: weighted combination
    hybrid_score = (context_similarity + model_sim) / 2
    
    print(f"   📊 Context similarity: {context_similarity:.3f}")
    print(f"   📊 Model similarity: {model_sim:.3f}")
    print(f"   📊 Hybrid score: {hybrid_score:.3f}")
    
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
    
    print(f"   🤖 Calling Qwen for LLM grading...")
    response = client.chat_completion(
        model=MODEL_REPO,
        messages=messages, 
        max_tokens=LLM_MAX_TOKENS, 
        temperature=LLM_TEMPERATURE
    )
    
    ai_text = response.choices[0].message.content
    print(f"   📝 Raw LLM response: {ai_text[:300]}...")
    
    # Clean JSON markers
    ai_text = ai_text.replace("```json", "").replace("```", "").strip()
    
    try:
        result = json.loads(ai_text)
        grade = result.get("grade", 0.0)
        feedback = result.get("feedback", "No feedback provided")
        
        # Add hybrid similarity info to feedback
        feedback += f" (Hybrid similarity: {hybrid_score:.2f}, Context match: {context_similarity:.2f})"
        
        print(f"   ✅ TIER 2 COMPLETE: grade={grade}, feedback_length={len(feedback)}")
        return grade, feedback
        
    except json.JSONDecodeError as e:
        print(f"   ❌ JSON parsing error: {str(e)}")
        print(f"   📄 Problematic text: {ai_text}")
        # Return a default grade with the raw response as feedback
        return 0.5, f"Error parsing LLM response. Raw: {ai_text[:200]}"

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
        print("\n" + "="*60)
        print("📥 /GRADE REQUEST RECEIVED")
        print("="*60)
        
        data = request.json
        exam_id = data.get('examId')
        student_id = data.get('studentId')
        questions = data.get('questions', [])
        
        print(f"📋 Exam ID: {exam_id}")
        print(f"👤 Student ID: {student_id}")
        print(f"❓ Total Questions: {len(questions)}")
        print("-"*60)
        
        graded_questions = []
        
        for idx, q in enumerate(questions, 1):
            question_id = q.get('questionId')
            question_type = q.get('type')
            question_text = q.get('question')
            model_answer = q.get('modelAns')
            student_answer = q.get('studentAnswer')
            
            print(f"\n🔍 Question {idx}/{len(questions)} (ID: {question_id})")
            print(f"   Type: {question_type}")
            print(f"   Question: {question_text[:100] if question_text else 'None'}...")
            print(f"   Model Answer: {model_answer[:100] if model_answer else 'None'}...")
            print(f"   Student Answer: {student_answer[:100] if student_answer else 'None'}...")
            
            # Check for None values
            if not student_answer:
                print(f"   ⚠️ WARNING: Student answer is None/empty!")
            if not model_answer:
                print(f"   ⚠️ WARNING: Model answer is None/empty!")
            
            # Grade based on question type
            if question_type in MCQ_TF_TYPES:
                print(f"   ⚡ Using MCQ/TF grading")
                grade, feedback = grade_mcq_or_tf(student_answer, model_answer)
                print(f"   ✅ Grade: {grade}, Feedback: {feedback[:80] if feedback else 'None'}...")
            else:
                print(f"   🤖 Using LLM grading with RAG")
                grade, feedback = grade_short_answer(question_text, student_answer, model_answer)
                print(f"   ✅ Grade: {grade}, Feedback: {feedback[:80] if feedback else 'None'}...")
            
            graded_questions.append({
                "questionId": question_id,
                "question": question_text,
                "grade": grade,
                "feedback": feedback
            })
        
        print("\n" + "="*60)
        print("✅ ALL QUESTIONS GRADED SUCCESSFULLY")
        print(f"📊 Returning {len(graded_questions)} graded questions")
        print("="*60 + "\n")
        
        return jsonify({
            "examId": exam_id,
            "studentId": student_id,
            "questions": graded_questions
        })
    
    except Exception as e:
        import traceback
        print("\n\n" + "="*60)
        print("❌ CRITICAL ERROR IN /GRADE ENDPOINT ❌")
        print("="*60)
        traceback.print_exc()
        print(f"Error Message: {str(e)}")
        print("="*60 + "\n\n")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host=API_HOST, port=API_PORT)