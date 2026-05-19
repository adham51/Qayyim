# Data Flow Diagram (DFD) - Web Architecture

## Level 0: Context Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│                          QA'YYIM GRADING SYSTEM                               │
│                                                                                 │
│  ┌──────────┐                                                  ┌─────────────┐ │
│  │  User /  │───────────────────────────────────────────────►  │  Frontend   │ │
│  │ Browser  │◄───────────────────────────────────────────────  │ (Next.js)   │ │
│  └──────────┘                                                  └─────────────┘ │
│       ▲                                                                ▲        │
│       │                                                                │        │
│       │                                                                ▼        │
│       │                                                          ┌─────────────┐ │
│       └──────────────────────────────────────────────────────►  │  Backend    │ │
│                                                                 │  (Next.js   │ │
│                                                                 │   API)      │ │
│                                                                 └─────────────┘ │
│                                                                       ▲        │
└───────────────────────────────────────────────────────────────────────┼────────┘
                                                                         │
                   Communicates with External Services
```

## Level 1: Detailed DFD

```
╔═══════════════════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                                       ║
║                                    QAYYIM GRADING SYSTEM DFD                                        ║
║                                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                                     │
│  ┌─────────┐          ┌──────────────────┐          ┌────────────────────────────┐                 │
│  │  User/  │          │   Frontend       │          │      Backend API           │                 │
│  │ Browser │◄────────►│   (Next.js)      │◄────────►│   (Next.js Routes)         │                 │
│  └─────────┘          │                  │          │                            │                 │
│                       │  - Login Form    │          │  - Auth Endpoints          │                 │
│                       │  - Upload UI     │          │  - File Upload Endpoints   │                 │
│                       │  - Grading View  │          │  - Grading Endpoints      │                 │
│                       │  - Results Dash  │          │  - Data Processing        │                 │
│                       └──────────────────┘          └────────────────────────────┘                 │
│                                                            ▲  │  ▲  │  ▲                           │
│                                                            │  │  │  │  │                           │
│                          ┌─────────────────────────────────┘  │  │  │  │                           │
│                          │                                    │  │  │  │                           │
│                    3. Validate                                │  │  │  │                           │
│                    JWT Token                                  │  │  │  │                           │
│                          │                                    │  │  │  │                           │
│                          ▼                                    │  │  │  │                           │
│                    ┌──────────────────────┐                   │  │  │  │                           │
│                    │  Authentication      │                   │  │  │  │                           │
│                    │  Service (JWT Verify)│                   │  │  │  │                           │
│                    │  - Token Validation  │                   │  │  │  │                           │
│                    │  - User Role Check   │                   │  │  │  │                           │
│                    │  - Session Mgmt      │                   │  │  │  │                           │
│                    └──────────────────────┘                   │  │  │  │                           │
│                                                               │  │  │  │                           │
│                                                               │  │  │  │                           │
│        ┌──────────────────────────────────────────────────────┘  │  │  │                           │
│        │                                                         │  │  │                           │
│        │  4. Send PDF File                                      │  │  │                           │
│        │                                                         │  │  │                           │
│        ▼                                                         │  │  │                           │
│  ┌──────────────────────┐                                       │  │  │                           │
│  │   OCR Service        │                                       │  │  │                           │
│  │   (Flask API Port    │                                       │  │  │                           │
│  │   :5001)             │                                       │  │  │                           │
│  │                      │                                       │  │  │                           │
│  │ - PDF to Text        │                                       │  │  │                           │
│  │ - Text Extraction    │                                       │  │  │                           │
│  │ - Vision Processing  │                                       │  │  │                           │
│  └──────────────────────┘                                       │  │  │                           │
│        │                                                         │  │  │                           │
│        │ 5. Return Extracted Text                              │  │  │                           │
│        │                                                         │  │  │                           │
│        └─────────────────────────────────────────┐              │  │  │                           │
│                                                  │              │  │  │                           │
│                                                  ▼              │  │  │                           │
│                                             (Process Text)      │  │  │                           │
│                                                  │              │  │  │                           │
│                                                  │ 6. Send Answer + Model Answer                 │
│                                                  │                  │  │                           │
│                                                  ▼                  │  │                           │
│                                         ┌──────────────────────┐   │  │                           │
│                                         │  Grading Service     │   │  │                           │
│                                         │  (RAG Flask API      │   │  │                           │
│                                         │  Port :5002)         │   │  │                           │
│                                         │                      │   │  │                           │
│                                         │ - Grade Comparison   │   │  │                           │
│                                         │ - Score Calculation  │   │  │                           │
│                                         │ - Feedback Gen       │   │  │                           │
│                                         │ - RAG Integration    │   │  │                           │
│                                         └──────────────────────┘   │  │                           │
│                                                  │                 │  │                           │
│                                                  │ 7. Return Grades + Feedback                   │
│                                                  │                 │  │                           │
│                                                  ▼                 │  │                           │
│                                            (Store Results)         │  │                           │
│                                                  │                 │  │                           │
│        ┌─────────────────────────────────────────┼─────────────────┘  │                           │
│        │                                         │                    │                           │
│        │ 8. Store File                           │ 9. Store Metadata  │                           │
│        │                                         │   & Grades        │                           │
│        ▼                                         ▼                    ▼                           │
│  ┌──────────────────────┐                  ┌──────────────────────────────────┐                 │
│  │   AWS S3 Bucket      │                  │   MySQL Database                 │                 │
│  │                      │                  │                                  │                 │
│  │ - Student PDFs       │                  │ - Users (students/teachers)      │                 │
│  │ - Original Uploads   │                  │ - Exams & Questions              │                 │
│  │ - Archive Storage    │                  │ - Submissions & Grades           │                 │
│  │ - File Management    │                  │ - Results & Feedback             │                 │
│  └──────────────────────┘                  │ - RAG Vector Store Metadata      │                 │
│                                             └──────────────────────────────────┘                 │
│                                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Data Flows Summary

| Flow # | From | To | Data | Description |
|--------|------|-----|------|-------------|
| 1 | User/Browser | Frontend | Request/Response | User interactions (login, file upload, view results) |
| 2 | Frontend | Backend API | HTTP Request | Sends user requests with authentication token |
| 3 | Backend API | Auth Service | JWT Token | Validates user credentials and permissions |
| 4 | Backend API | OCR Service | PDF File | Sends student answer sheet for text extraction |
| 5 | OCR Service | Backend API | Extracted Text | Returns OCR result with question answers |
| 6 | Backend API | Grading Service | Answer + Model Answer | Sends student answers and model answers for grading |
| 7 | Grading Service | Backend API | Grades + Feedback | Returns grades, scores, and AI-generated feedback |
| 8 | Backend API | S3 | PDF File | Stores original and processed files |
| 9 | Backend API | MySQL DB | Metadata | Stores user data, exam info, grades, results |
| 10 | Backend API | Frontend | Response | Returns grading results and data |
| 11 | Frontend | User/Browser | Display | Shows results and feedback to user |

## Process Flows

### Authentication Flow
```
User → Frontend (Login Form) → Backend API → Auth Service → JWT Token → Response
```

### File Upload & Grading Flow
```
User → Frontend (Upload) → Backend API → S3 (Store)
                                    ↓
                            OCR Service → Extract Text
                                    ↓
                            Grading Service → Grade & Generate Feedback
                                    ↓
                            MySQL DB (Store Results)
                                    ↓
                            Frontend (Display Results)
                                    ↓
                            User (View Dashboard)
```

### Data Storage
```
- Files: AWS S3 (PDFs, documents)
- User Data: MySQL (student/teacher profiles, exam data, grades)
- Vector Data: MySQL (RAG embeddings metadata)
```

## Technology Stack

| Component | Technology | Port |
|-----------|-----------|------|
| Frontend | Next.js (React) | 3000 |
| Backend | Next.js API Routes | 3000 |
| Auth | JWT + Session | Built-in |
| OCR | Flask + Python | 5001 |
| Grading/RAG | Flask + Python | 5002 |
| Database | MySQL | 3307 |
| Storage | AWS S3 | HTTPS |

## Security Considerations

1. **Frontend to Backend**: HTTPS + JWT Authentication
2. **Backend to Services**: Internal communication (same server/docker network)
3. **Database Access**: Encrypted credentials, connection pooling
4. **File Storage**: S3 bucket with access controls
5. **API Rate Limiting**: Token-based authentication
6. **Data Validation**: Input validation at all endpoints

