
"""
Responsibilities: Duplicate Check, Document Creation, Saving to ChromaDB

"""


from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.documents import Document
from config import DB_PATH, EMBEDDING_MODEL

embedding_model = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
vector_db = Chroma(persist_directory=str(DB_PATH), embedding_function=embedding_model)

def check_duplicate_file(filename, subject):
    res = vector_db.get(where={"$and": [{"source": filename}, {"subject": subject}]}, limit=1)
    return len(res['ids']) > 0

def run_stage_3(enriched_data, subject, filename):
    print(f"💾 [Stage 3] Saving to ChromaDB...")
    
    if check_duplicate_file(filename, subject):
        print("🛑 [Stage 3] File already exists in DB. Skipping save.")
        return False

    documents = []
    ids = []
    
    for item in enriched_data:
        if not item.get('keep'): continue
        
        # Create Unique ID
        uid = f"{subject}_{filename}_{item['id']}"
        
        # Create Content
        header = f"Subject: {subject} > {item.get('topic')} > {item.get('subtopic')}"
        body = f"{header}\n{item.get('clean_text')}"
        
        # Metadata
        meta = {
            "subject": subject,
            "source": filename,
            "original_id": item['id'],
            "topic": item.get('topic', 'General'),
            "subtopic": item.get('subtopic', '')
        }
        
        documents.append(Document(page_content=body, metadata=meta))
        ids.append(uid)
        
    if documents:
        vector_db.add_documents(documents=documents, ids=ids)
        print(f"✅ [Stage 3] Success! Added {len(documents)} vectors.")
        return True
    else:
        print("⚠️ [Stage 3] No valid documents to save.")
        return False