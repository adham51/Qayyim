"use client";

import {useState, useEffect} from "react";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Label} from "@/components/ui/label";
import {PageHeader} from "@/components/page-header";
import {FileCheck2, Loader2, Sparkles} from "lucide-react";
import {Select, SelectTrigger, SelectValue, SelectContent, SelectItem} from "@/components/ui/select";
import {FileUpload} from "@/components/file-upload";
import {FILE_UPLOAD, MESSAGES} from "@/lib/constants";
import {useToast} from "@/hooks/use-toast";
import {FileRejection} from "react-dropzone";
import {Textarea} from "@/components/ui/textarea";

interface Exam {
    id: string;
    title: string;
    type: string;
    examDate: string | null;
    createdAt: string;
    updatedAt: string;
    courseCode: string | null;
    courseName: string | null;
    totalSubmissions: number;
    gradedSubmissions: number;
}

export default function UploadSubmissionsPage() {
    const {toast} = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [exams, setExams] = useState<Exam[]>([]);
    const [loadingExams, setLoadingExams] = useState(true);
    const [selectedExamId, setSelectedExamId] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [rejectedFiles, setRejectedFiles] = useState<FileRejection[]>([]);

    // AI Grading fields
    const [question, setQuestion] = useState("");
    const [studentAnswer, setStudentAnswer] = useState("");
    const [modelAnswer, setModelAnswer] = useState("");
    const [isGrading, setIsGrading] = useState(false);
    const [gradingResult, setGradingResult] = useState<any>(null);

    // Single student submission grading
    const [singleExamId, setSingleExamId] = useState("");
    const [singleFile, setSingleFile] = useState<File[]>([]);
    const [singleRejectedFiles, setSingleRejectedFiles] = useState<FileRejection[]>([]);
    const [isSingleSubmitting, setIsSingleSubmitting] = useState(false);
    const [singleSubmissionResult, setSingleSubmissionResult] = useState<any>(null);

    useEffect(() => {
        const fetchExams = async () => {
            try {
                setLoadingExams(true);
                const token = localStorage.getItem("token");
                if (!token) {
                    setLoadingExams(false);
                    return;
                }

                const res = await fetch("/api/v1/teacher/exams", {
                    headers: {Authorization: `Bearer ${token}`},
                });
                const data = await res.json();

                if (res.ok) {
                    // The API returns { data: { exams: [...], availableCourses: [...] } }
                    const examsData = data.data?.exams || [];
                    setExams(Array.isArray(examsData) ? examsData : []);
                } else {
                    toast({
                        variant: "destructive",
                        title: "Error",
                        description: "Failed to load exams",
                    });
                }
            } catch (err) {
                console.error("Error fetching exams:", err);
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Failed to load exams",
                });
            } finally {
                setLoadingExams(false);
            }
        };

        fetchExams();
    }, [toast]);

    const handleGradeWithAI = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsGrading(true);

        try {
            if (!question.trim()) throw new Error("Please enter a question");
            if (!studentAnswer.trim()) throw new Error("Please enter the student answer");
            if (!modelAnswer.trim()) throw new Error("Please enter the model answer");

            const response = await fetch("http://localhost:5001/grade", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    examId: "test",
                    studentId: "test",
                    questions: [{
                        questionId: "1",
                        type: "SHORT_ANSWER",
                        question,
                        modelAns: modelAnswer,
                        studentAnswer,
                    }]
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "Failed to grade answer");
            }

            setGradingResult(data.questions[0]);
            toast({
                title: "Grading Complete!",
                description: "AI has graded the student answer.",
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Grading failed");
        } finally {
            setIsGrading(false);
        }
    };

    const handleSingleSubmission = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSingleSubmitting(true);
        setSingleSubmissionResult(null);

        try {
            if (!singleExamId) throw new Error("Please select an exam");
            if (singleFile.length === 0) throw new Error("Please upload a student submission PDF");

            if (singleFile[0].type !== FILE_UPLOAD.ALLOWED_TYPES.PDF) {
                throw new Error(MESSAGES.UPLOAD.INVALID_TYPE);
            }

            if (singleFile[0].size > FILE_UPLOAD.MAX_FILE_SIZE) {
                const sizeMB = (singleFile[0].size / 1024 / 1024).toFixed(2);
                throw new Error(`${MESSAGES.UPLOAD.FILE_TOO_LARGE} (File size: ${sizeMB}MB)`);
            }

            const formData = new FormData();
            formData.append("examId", singleExamId);
            formData.append("autoExtract", "true");
            formData.append("file", singleFile[0]);

            const token = localStorage.getItem("token");
            if (!token) throw new Error("Not logged in");

            const res = await fetch("/api/v1/teacher/student-submission", {
                method: "POST",
                headers: {Authorization: `Bearer ${token}`},
                body: formData,
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || data.message || "Submission processing failed");
            }

            setSingleSubmissionResult(data.data);

            toast({
                title: "Submission Processed & Graded!",
                description: `Successfully processed and graded submission for ${data.data.submission.studentUserId}`,
            });

            setSingleFile([]);
            setSingleRejectedFiles([]);

        } catch (err) {
            setError(err instanceof Error ? err.message : "Error occurred");
            toast({
                variant: "destructive",
                title: "Error",
                description: err instanceof Error ? err.message : "Failed to process submission",
            });
        } finally {
            setIsSingleSubmitting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);
        try {
            if (!selectedExamId) throw new Error("Please select an exam");
            if (!files.length) throw new Error("Please upload at least one PDF");

            const nonPdfFiles = files.filter(file => file.type !== FILE_UPLOAD.ALLOWED_TYPES.PDF);
            if (nonPdfFiles.length > 0) {
                const fileNames = nonPdfFiles.map(f => f.name).join(', ');
                throw new Error(`${MESSAGES.UPLOAD.INVALID_TYPE}. Please remove: ${fileNames}`);
            }

            const oversizedFiles = files.filter(file => file.size > FILE_UPLOAD.MAX_FILE_SIZE);
            if (oversizedFiles.length > 0) {
                const fileNames = oversizedFiles.map(f => `${f.name} (${(f.size / 1024 / 1024).toFixed(2)}MB)`).join(', ');
                throw new Error(`${MESSAGES.UPLOAD.FILE_TOO_LARGE}. Please remove: ${fileNames}`);
            }

            const formData = new FormData();
            formData.append("examId", selectedExamId);
            formData.append("autoExtract", "true");
            files.forEach((f) => formData.append("files", f));

            const token = localStorage.getItem("token");
            if (!token) throw new Error("Not logged in");

            const res = await fetch("/api/v1/teacher/student-submission", {
                method: "POST",
                headers: {Authorization: `Bearer ${token}`},
                body: formData,
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || data.message || "Upload failed");
            }

            const backendErrors = data.data?.errors || [];
            if (backendErrors.length > 0) {
                const newRejectedFiles: FileRejection[] = [];
                const validFiles: File[] = [];
                const erroredFileNames = new Set(backendErrors.map((e: any) => e.filename));

                files.forEach(file => {
                    if (erroredFileNames.has(file.name)) {
                        const error = backendErrors.find((e: any) => e.filename === file.name);
                        newRejectedFiles.push({
                            file,
                            errors: [{
                                code: 'backend-validation',
                                message: error?.error || 'Validation failed'
                            }]
                        });
                    } else {
                        validFiles.push(file);
                    }
                });

                setFiles(validFiles);
                setRejectedFiles(prev => [...prev, ...newRejectedFiles]);

                const errorMessages = backendErrors.map((e: any) => {
                    const errorMsg = e.error || '';
                    const studentId = errorMsg.includes(':')
                        ? errorMsg.split(':')[1].trim()
                        : e.filename.replace(/\.pdf$/i, '');
                    return `Student ID not found: ${studentId} (${e.filename})`;
                }).join('\n');

                setError(`Validation failed. Please fix all errors before uploading:\n${errorMessages}`);
                return;
            }

            const selectedExam = exams.find(exam => exam.id === selectedExamId);
            const examTitle = selectedExam?.title || "the exam";
            const uploadedCount = data.data?.uploaded || 0;

            toast({
                title: "Upload Successful!",
                description: `Successfully uploaded ${uploadedCount} student ${uploadedCount === 1 ? 'submission' : 'submissions'} for ${examTitle}.`,
            });

            setTimeout(() => {
                window.location.href = "/teacher/exams";
            }, 2000);

        } catch (err) {
            setError(err instanceof Error ? err.message : "Error occurred");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
            <PageHeader title="Upload Student Submissions"
                        description="Select an exam and upload student answer sheets for grading."/>

            <Card className="border-2 border-blue-200 bg-blue-50/30">
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-blue-600"/>
                        AI-Powered Single Submission Grading
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-6">
                        <div className="grid max-w-md gap-2">
                            <Label htmlFor="single-exam-selection">Select Exam</Label>
                            <Select value={singleExamId}
                                    onValueChange={setSingleExamId}
                                    disabled={loadingExams}>
                                <SelectTrigger id="single-exam-selection">
                                    <SelectValue placeholder={loadingExams ? "Loading exams..." : "Choose an exam..."}/>
                                </SelectTrigger>
                                <SelectContent>
                                    {exams.map((exam) => (
                                        <SelectItem key={exam.id}
                                                    value={exam.id}>
                                            {exam.title}
                                            {exam.courseCode && exam.courseName && ` (${exam.courseCode} - ${exam.courseName})`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label>Upload Student Answer Sheet (PDF)</Label>
                            <FileUpload
                                maxFiles={1}
                                maxSize={FILE_UPLOAD.MAX_FILE_SIZE}
                                value={singleFile}
                                onFilesChange={setSingleFile}
                                rejectedFiles={singleRejectedFiles}
                                onRejectedFilesChange={setSingleRejectedFiles}
                            />
                            <p className="text-xs text-muted-foreground">
                                Name file
                                as: <code className="rounded bg-muted px-1 py-0.5">{"{"}student_user_id{"}"}.pdf</code>
                            </p>
                        </div>

                        <div className="flex justify-end">
                            <Button
                                size="lg"
                                onClick={handleSingleSubmission}
                                disabled={isSingleSubmitting || !singleExamId || singleFile.length === 0}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                {isSingleSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin"/> Processing & Grading...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="mr-2 h-4 w-4"/> Process & Grade with AI
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    {singleSubmissionResult && (
                        <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4">
                            <h3 className="font-semibold text-green-900 mb-3">Grading Complete!</h3>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="font-semibold">Student ID:</span>
                                        <p className="text-gray-700">{singleSubmissionResult.submission?.studentUserId}</p>
                                    </div>
                                    <div>
                                        <span className="font-semibold">Total Score:</span>
                                        <p className="text-lg font-bold text-green-600">
                                            {singleSubmissionResult.submission?.totalMarks?.toFixed(2)} / {singleSubmissionResult.grading?.results?.reduce((sum: number, r: any) => sum + r.questionGrade, 0)?.toFixed(2)}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="font-semibold">Questions Graded:</span>
                                        <p className="text-gray-700">{singleSubmissionResult.grading?.gradedQuestions}</p>
                                    </div>
                                    <div>
                                        <span className="font-semibold">S3 Upload:</span>
                                        <p className="text-gray-700">{singleSubmissionResult.s3Upload?.success ? '✓ Success' : '✗ Failed'}</p>
                                    </div>
                                </div>

                                <div className="border-t border-green-200 pt-3">
                                    <span className="font-semibold text-sm">Question Breakdown:</span>
                                    <div className="mt-2 space-y-2 max-h-[300px] overflow-y-auto">
                                        {singleSubmissionResult.grading?.results?.map((result: any, idx: number) => (
                                            <div key={idx}
                                                 className="bg-white p-3 rounded border border-green-100">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="font-semibold text-sm">Question {result.questionId}</span>
                                                    <span className="text-sm font-bold text-green-600">
          {/* Corrected logic: Evaluates the actual grade vs the max grade */}
                                                        {`${(result.studentGrade || 0).toFixed(2) *result.questionGrade} / ${result.questionGrade}`}
        </span>
                                                </div>
                                                <p className="text-xs text-gray-600 mb-1">
                                                    <strong>Answer:</strong> {result.answer || 'No answer'}
                                                </p>
                                                <p className="text-xs text-gray-700">
                                                    <strong>Feedback:</strong> {result.feedback}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="grid gap-6">
                {error &&
                    <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive whitespace-pre-wrap">{error}</div>}

                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Bulk Submission Upload</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        <div className="grid max-w-md gap-2">
                            <Label htmlFor="exam-selection">Select Exam</Label>
                            <Select value={selectedExamId}
                                    onValueChange={setSelectedExamId}
                                    disabled={loadingExams}>
                                <SelectTrigger id="exam-selection">
                                    <SelectValue placeholder={loadingExams ? "Loading exams..." : "Choose an exam..."}/>
                                </SelectTrigger>
                                <SelectContent>
                                    {exams.map((exam) => (
                                        <SelectItem key={exam.id}
                                                    value={exam.id}>
                                            {exam.title}
                                            {exam.courseCode && exam.courseName && ` (${exam.courseCode} - ${exam.courseName})`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label>Upload Student Answer Sheets</Label>
                            <FileUpload
                                maxFiles={FILE_UPLOAD.MAX_STUDENT_SUBMISSIONS}
                                maxSize={FILE_UPLOAD.MAX_FILE_SIZE}
                                value={files}
                                onFilesChange={setFiles}
                                rejectedFiles={rejectedFiles}
                                onRejectedFilesChange={setRejectedFiles}
                            />
                            <p className="text-xs text-muted-foreground">
                                Name files
                                as: <code className="rounded bg-muted px-1 py-0.5">{"{"}student_user_id{"}"}.pdf</code>
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end">
                    <Button size="lg"
                            onClick={handleSubmit}
                            disabled={isSubmitting || !selectedExamId || !files.length}>
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin"/> Uploading...
                            </>
                        ) : (
                            <>
                                <FileCheck2 className="mr-2 h-4 w-4"/> Submit for Grading
                            </>
                        )}
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">AI Quick Grading (Test)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-6">
                        <div className="grid gap-2">
                            <Label htmlFor="question">Question</Label>
                            <Textarea
                                id="question"
                                placeholder="Enter the exam question..."
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                className="min-h-[100px]"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="student-answer">Student Answer</Label>
                            <Textarea
                                id="student-answer"
                                placeholder="Enter the student's answer..."
                                value={studentAnswer}
                                onChange={(e) => setStudentAnswer(e.target.value)}
                                className="min-h-[100px]"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="model-answer">Model Answer (Reference)</Label>
                            <Textarea
                                id="model-answer"
                                placeholder="Enter the expected/model answer..."
                                value={modelAnswer}
                                onChange={(e) => setModelAnswer(e.target.value)}
                                className="min-h-[100px]"
                            />
                        </div>

                        <div className="flex justify-end">
                            <Button
                                size="lg"
                                onClick={handleGradeWithAI}
                                disabled={isGrading || !question.trim() || !studentAnswer.trim() || !modelAnswer.trim()}
                            >
                                {isGrading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin"/> Grading...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="mr-2 h-4 w-4"/> Grade with AI
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    {gradingResult && (
                        <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
                            <h3 className="font-semibold text-blue-900 mb-3">Grading Result</h3>

                            <div className="space-y-3">
                                <div>
                                    <span className="font-semibold text-sm">Grade:</span>
                                    <p className="text-lg font-bold text-blue-600">
                                        {gradingResult.grade !== undefined ? (gradingResult.grade * 100).toFixed(0) + '%' : 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <span className="font-semibold text-sm">Feedback:</span>
                                    <p className="text-sm text-gray-700">{gradingResult.feedback || 'No feedback'}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}