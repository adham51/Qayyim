import json
import time
from langchain_openai import ChatOpenAI # 👈 THE STABLE CLIENT
from config import (
    OPENROUTER_API_KEY, 
    OPENROUTER_BASE_URL, 
    LLM_MODEL_NAME, 
    BATCH_ENRICHMENT_PROMPT, 
    SINGLE_ENRICHMENT_PROMPT, 
    BATCH_SIZE,
    TEST_CHUNK_START,
    TEST_CHUNK_COUNT
)

def call_llm(prompt):
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
        content = response.content
        
        # DeepSeek R1 sometimes puts <think> tags. We remove them just in case.
        if "<think>" in content:
            content = content.split("</think>")[-1].strip()
            
        return json.loads(content)
        
    except Exception as e:
        print(f"⚠️ LLM Error: {e}")
        return None

def run_stage_2(raw_chunks, subject, source_filename):
    # --- 🚧 DEV MODE SLICING ---
    if TEST_CHUNK_COUNT is not None:
        start = TEST_CHUNK_START
        end = start + TEST_CHUNK_COUNT
        if start >= len(raw_chunks):
            start = max(0, len(raw_chunks) - 5)
            end = len(raw_chunks)
        
        print(f"🚧 DEV MODE ACTIVE: Processing only chunks {start} to {end}...")
        
        sliced_chunks = []
        for i in range(start, min(end, len(raw_chunks))):
            sliced_chunks.append({
                "original_index": i, 
                "text": raw_chunks[i]
            })
    else:
        print(f"🧠 [Stage 2] Starting Enrichment for ALL {len(raw_chunks)} chunks...")
        sliced_chunks = [{"original_index": i, "text": txt} for i, txt in enumerate(raw_chunks)]

    enriched_data = []
    
    # Process in Batches
    for i in range(0, len(sliced_chunks), BATCH_SIZE):
        batch_inputs = sliced_chunks[i : i + BATCH_SIZE]
        
        batch_payload = []
        for item in batch_inputs:
            if len(item["text"]) > 50:
                batch_payload.append({
                    "id": item["original_index"], 
                    "text": item["text"]
                })
        
        if not batch_payload: continue

        # A. Try Batch
        time.sleep(1) 
        prompt = BATCH_ENRICHMENT_PROMPT.format(subject=subject, input_json=json.dumps(batch_payload))
        
        response = call_llm(prompt)
        
        batch_results = response.get("results", []) if response else []
        
        # B. Fallback Logic
        input_ids = {b['id'] for b in batch_payload}
        found_ids = {r.get('id') for r in batch_results}
        missing = input_ids - found_ids
        
        for item in batch_results:
            if item.get('id') in input_ids:
                item['source'] = source_filename
                enriched_data.append(item)
        
        if missing:
            print(f"   ⚠️ Retrying {len(missing)} chunks...")
            for m_id in missing:
                txt = next(b['text'] for b in batch_payload if b['id'] == m_id)
                time.sleep(1)
                s_prompt = SINGLE_ENRICHMENT_PROMPT.format(subject=subject, chunk_text=txt)
                res = call_llm(s_prompt)
                if res:
                    res['id'] = m_id
                    res['source'] = source_filename
                    enriched_data.append(res)

        print(f"   -> Batch processed ({len(batch_inputs)} chunks).")

    print(f"✅ [Stage 2] Finished. Enriched {len(enriched_data)} items.")
    return enriched_data