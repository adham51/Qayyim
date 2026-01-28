import os
from collections import defaultdict
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from config import DB_PATH, EMBEDDING_MODEL

def inspect_database():
    print(f"📂 connecting to DB at: {DB_PATH}...")
    
    if not os.path.exists(DB_PATH):
        print("❌ Database folder not found!")
        return

    # 1. Initialize DB Connection
    embedding_model = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
    vector_db = Chroma(
        persist_directory=str(DB_PATH), 
        embedding_function=embedding_model
    )

    # 2. Fetch all metadata (lightweight, doesn't load vectors)
    print("⏳ Fetching metadata...")
    data = vector_db.get() # Get all IDs and Metadata
    metadatas = data['metadatas']
    
    if not metadatas:
        print("⚠️ Database is empty.")
        return

    # 3. Aggregate Data
    # Structure: report[subject][filename] = chunk_count
    report = defaultdict(lambda: defaultdict(int))
    total_chunks = 0

    for meta in metadatas:
        if meta: # sometimes metadata can be None if ingestion failed partly
            subj = meta.get('subject', 'Unknown Subject')
            src = meta.get('source', 'Unknown File')
            report[subj][src] += 1
            total_chunks += 1

    # 4. Print Report
    print(f"\n📊 DATABASE REPORT (Total Chunks: {total_chunks})")
    print("="*60)
    
    for subject, files in report.items():
        print(f"\n📚 SUBJECT: {subject}")
        print("-" * 30)
        for filename, count in files.items():
            print(f"   📄 {filename:<50} | {count} chunks")

if __name__ == "__main__":
    inspect_database()