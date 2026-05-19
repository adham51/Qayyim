import os
import threading
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename

# Import Settings
from config import API_HOST, API_PORT, UPLOAD_FOLDER, ALLOWED_EXTENSIONS

# Import the new Manager
from ingestion_manager import process_pipeline

app = Flask(__name__)
CORS(app)

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# --- HELPERS ---
def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def run_background_job(filepath, subject):
    """
    Runs the full 3-stage pipeline in a background thread.
    This prevents the UI from freezing while processing the book.
    """
    try:
        process_pipeline(filepath, subject)
    except Exception as e:
        print(f"🔥 Background Job Failed: {e}")

# ==========================================
# 🚀 UPLOAD ENDPOINT
# ==========================================
@app.route('/upload_reference', methods=['POST'])
def upload_reference():
    # 1. Validation: Check if file exists
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    
    # 2. Validation: Check subject
    subject = request.form.get('subject') # e.g., 'OS', 'Security'
    
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    if not subject:
        return jsonify({"error": "Subject is required"}), 400

    # 3. Save & Process
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        save_path = os.path.join(UPLOAD_FOLDER, filename)
        file.save(save_path)
        
        # 4. Start Background Thread
        # We pass the file path and subject to the Manager
        thread = threading.Thread(target=run_background_job, args=(save_path, subject))
        thread.start()
        
        # 5. Return Success Immediately
        return jsonify({
            "message": "File received. Processing started in background.",
            "filename": filename,
            "subject": subject,
            "status": "processing_started"
        }), 202
    
    return jsonify({"error": "Invalid file type. Only PDF allowed."}), 400


if __name__ == '__main__':
    print(f"🚀 API Server running at http://{API_HOST}:{API_PORT}")
    # 👇 CHANGE THIS LINE (Add use_reloader=False)
    app.run(host=API_HOST, port=API_PORT, debug=True, use_reloader=False)