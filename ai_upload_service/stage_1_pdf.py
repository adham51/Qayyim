import re
import json
import time
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import ChatOpenAI # 👈 THE STABLE CLIENT
from config import (
    OPENROUTER_API_KEY, 
    OPENROUTER_BASE_URL, 
    LLM_MODEL_NAME, 
    RELEVANCE_PROMPT
)

def clean_page_content(text):
    text = re.sub(r'^(Figure|Table|Fig)\.?\s+\d+.*$', '', text, flags=re.MULTILINE | re.IGNORECASE)
    lines = [line for line in text.split('\n') if not re.search(r'[{};]|^\\s*(class|def|void|int|#include)\\b', line)]
    return "\n".join(lines)

def check_relevance(text_sample, subject):
    prompt = RELEVANCE_PROMPT.format(subject=subject, text_sample=text_sample[:1500])
    try:
        # 👇 YOUR WORKING SNIPPET
        llm = ChatOpenAI(
            model=LLM_MODEL_NAME,
            openai_api_key=OPENROUTER_API_KEY,
            openai_api_base=OPENROUTER_BASE_URL,
            temperature=0,
            default_headers={
                "HTTP-Referer": "http://localhost:5000",
                "X-Title": "GradProject"
            },
            model_kwargs={"response_format": {"type": "json_object"}} # Forces JSON
        )
        
        response = llm.invoke(prompt)
        return json.loads(response.content).get("is_relevant", True)
    except Exception as e:
        print(f"⚠️ Relevance Check Warning: {e}")
        return True 

def run_stage_1(pdf_path, subject):
    print(f"📄 [Stage 1] Processing PDF: {pdf_path}...")
    start_time = time.time()
    
    try:
        loader = PyPDFLoader(str(pdf_path))
        docs = loader.load()
    except Exception as e:
        print(f"❌ PDF Load Failed: {e}")
        return None
        
    if not docs: return None
    print(f"   -> PDF Loaded in {time.time() - start_time:.2f}s ({len(docs)} pages)")
    
    # Check relevance on first 3 pages
    first_pages_text = "\n".join([d.page_content for d in docs[:3]])
    if not check_relevance(first_pages_text, subject):
        print(f"🛑 [Stage 1] Irrelevant content for subject: {subject}")
        return None

    print("   -> Cleaning text...")
    cleaned_pages = []
    for d in docs:
        cleaned_text = clean_page_content(d.page_content)
        if cleaned_text.strip():
            cleaned_pages.append(cleaned_text)
            
    full_clean_text = "\n\n".join(cleaned_pages)

    print("   -> Splitting text...")
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000, chunk_overlap=150, separators=["\n\n", "\n", ". ", " "]
    )
    chunks = splitter.split_text(full_clean_text)
    
    print(f"✅ [Stage 1] Extracted {len(chunks)} valid chunks.")
    return chunks