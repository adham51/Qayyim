import requests
import json

# Server endpoint
BASE_URL = "http://127.0.0.1:5000"

# Test payload with multiple question types
test_payload = {
    "examId": "EXAM-CS101-2026",
    "studentId": "STUDENT-12345",
    "questions": [
        # Test 1: MCQ - Correct Answer
        {
            "questionId": "q1",
            "type": "MCQ",
            "question": "What is the purpose of the virtual memory system?",
            "modelAns": "A       ",
            "studentAnswer": "A                          "
        },
        # Test 2: MCQ - Wrong Answer
        {
            "questionId": "q2",
            "type": "MCQ",
            "question": "Which data structure is best for implementing a queue?",
            "modelAns": "Linked List",
            "studentAnswer": "Stack"
        },
        # Test 3: True/False - Correct
        {
            "questionId": "q3",
            "type": "TF",
            "question": "Is a binary search tree always balanced?",
            "modelAns": "False",
            "studentAnswer": "False"
        },
        # Test 4: True/False - Wrong
        {
            "questionId": "q4",
            "type": "TF",
            "question": "Can we access array elements in O(1) time?",
            "modelAns": "True",
            "studentAnswer": "False"
        },
        # Test 5: Short Answer - Good Answer
        {
            "questionId": "q5",
            "type": "short answer",
            "question": "Explain the difference between a stack and a queue.",
            "modelAns": "Stack follows LIFO (Last In First Out) while queue follows FIFO (First In First Out). Stack uses push/pop, queue uses enqueue/dequeue.",
            "studentAnswer": "Stack is LIFO last in first out. Queue is FIFO first in first out."
        },
        # Test 6: Short Answer - Partial Answer
        {
            "questionId": "q6",
            "type": "short answer",
            "question": "What is big O notation and why is it important?",
            "modelAns": "Big O notation describes how an algorithm's time or space complexity grows with input size. It helps compare algorithm efficiency.",
            "studentAnswer": "Big O is used for algorithms."
        },
        # Test 7: Short Answer - Poor Answer
        {
            "questionId": "q7",
            "type": "short answer",
            "question": "What is polymorphism in Object-Oriented Programming?",
            "modelAns": "Polymorphism allows objects to take multiple forms. It enables one interface to be used for different underlying data types.",
            "studentAnswer": "It means many forms."
        }
    ]
}

print("=" * 80)
print("AI GRADING SERVICE TEST")
print("=" * 80)
print(f"\nSending request to {BASE_URL}/grade")
print(f"\nTest Payload:")
print(json.dumps(test_payload, indent=2))

try:
    # Send the grading request
    response = requests.post(
        f"{BASE_URL}/grade",
        json=test_payload,
        timeout=60
    )
    
    print("\n" + "=" * 80)
    print(f"Response Status: {response.status_code}")
    print("=" * 80)
    
    if response.status_code == 200:
        result = response.json()
        
        print(f"\nGRADING RESULTS:")
        print(f"Exam ID: {result['examId']}")
        print(f"Student ID: {result['studentId']}")
        print(f"\nTotal Questions: {len(result['questions'])}")
        
        total_grade = 0
        for q in result['questions']:
            total_grade += q['grade']
            print(f"\n{'─' * 80}")
            print(f"Question ID: {q['questionId']}")
            print(f"Grade: {q['grade']}")
            print(f"Feedback: {q['feedback']}")
        
        avg_grade = total_grade / len(result['questions'])
        print(f"\n{'=' * 80}")
        print(f"AVERAGE SCORE: {avg_grade:.2f}/1.0 ({avg_grade * 100:.1f}%)")
        print("=" * 80)
    else:
        print(f"\nError: {response.text}")

except requests.exceptions.ConnectionError:
    print("\nERROR: Cannot connect to server!")
    print(f"   Make sure the server is running at {BASE_URL}")
    print("   Run: python server.py")
except requests.exceptions.Timeout:
    print("\nERROR: Request timeout! The server took too long to respond.")
except Exception as e:
    print(f"\nERROR: {str(e)}")

print("\nTest Complete!")
