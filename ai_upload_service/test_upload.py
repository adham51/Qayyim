import requests
import time
import os

# --- CONFIGURATION ---
# 1. Point to your local server
SERVER_URL = "http://127.0.0.1:5000/upload_reference"

# 2. EXACT PATH to your PDF (Update this if you moved the file!)
# Use 'r' before the string to handle backslashes in Windows paths safely
FILE_PATH = r"E:\\graduation_project\\data_raw\\Computer Systems A Programmers Perspective by Randal E. Bryant, David R. OHallaron (z-lib.org).pdf"

# 3. SUBJECT (Crucial for the LLM context)
SUBJECT = "Computer Systems"

def test_upload():
    print(f"\n🚀 STARTING UPLOAD TEST")
    print(f"========================================")
    print(f"📄 File:    {os.path.basename(FILE_PATH)}")
    print(f"📚 Subject: {SUBJECT}")
    print(f"📡 Server:  {SERVER_URL}")
    print(f"========================================\n")
    
    # Check if file exists before trying
    if not os.path.exists(FILE_PATH):
        print(f"❌ ERROR: File not found at path:")
        print(f"   {FILE_PATH}")
        return

    try:
        with open(FILE_PATH, 'rb') as f:
            files = {'file': f}
            data = {'subject': SUBJECT}
            
            print("⏳ Sending request to server... (This might take a second)")
            start_time = time.time()
            
            # This is the actual API call
            response = requests.post(SERVER_URL, files=files, data=data)
            
            duration = time.time() - start_time
            
            print("\n--- SERVER RESPONSE ---")
            print(f"Status Code: {response.status_code}")
            print(f"Response:    {response.json()}")
            print(f"⏱️ Time taken:  {duration:.2f}s")
            
            if response.status_code == 202:
                 print("\n✅ TEST PASSED!")
                 print("   The server accepted the file.")
                 print("   👉 NOW CHECK YOUR 'server.py' TERMINAL to see the background processing logs!")
            else:
                 print("\n❌ TEST FAILED.")
                 print("   Check the error message above.")

    except requests.exceptions.ConnectionError:
        print("\n❌ CONNECTION ERROR")
        print("   Could not connect to the server.")
        print("   Make sure you are running 'python server.py' in a separate terminal!")

if __name__ == "__main__":
    test_upload()