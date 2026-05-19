from pathlib import Path
from stage_1_pdf import run_stage_1
from stage_2_llm import run_stage_2
from stage_3_storage import run_stage_3

def process_pipeline(file_path, subject):
    filename = Path(file_path).name
    print(f"\n🚀 STARTING PIPELINE: {filename} ({subject})")
    
    # --- STAGE 1: PDF ---
    raw_chunks = run_stage_1(file_path, subject)
    if not raw_chunks: return
    
    # --- STAGE 2: LLM ---
    enriched_data = run_stage_2(raw_chunks, subject, filename)
    if not enriched_data: return
    
    # --- STAGE 3: STORAGE ---
    run_stage_3(enriched_data, subject, filename)
    
    print("\n🎉 PIPELINE COMPLETE!")