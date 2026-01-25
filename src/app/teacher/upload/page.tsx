"use client";

import {useState, useEffect} from "react";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Label} from "@/components/ui/label";
import {PageHeader} from "@/components/page-header";
import {FileCheck2, Loader2, CheckCircle2, Clock} from "lucide-react";
import {Select, SelectTrigger, SelectValue, SelectContent, SelectItem} from "@/components/ui/select";
import {FileUpload} from "@/components/file-upload";
import {FILE_UPLOAD, MESSAGES} from "@/lib/constants";
import {useToast} from "@/hooks/use-toast";
import {FileRejection} from "react-dropzone";

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

interface UploadResult {
    queued: number;
    failed: number;
    jobs: Array<{
        jobId: string;
        filename: string;
        studentUserId: string;
        s3Url: string;
        status: string;
    }>;
    errors: Array<{
        filename: string;
        error: string;
    }>;
}

export default function UploadSubmissionsPage() {
    const {toast} = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

    const [exams, setExams] = useState<Exam[]>([]);
    const [loadingExams, setLoadingExams] = useState(true);
    const [selectedExamId, setSelectedExamId] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [rejectedFiles, setRejectedFiles] = useState<FileRejection[]>([]);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setUploadResult(null);
        setIsSubmitting(true);

        try {
            if (!selectedExamId) throw new Error("Please select an exam");
            if (!files.length) throw new Error("Please upload at least one PDF");

            // Validate file types
            const nonPdfFiles = files.filter(file => file.type !== FILE_UPLOAD.ALLOWED_TYPES.PDF);
            if (nonPdfFiles.length > 0) {
                const fileNames = nonPdfFiles.map(f => f.name).join(', ');
                throw new Error(`${MESSAGES.UPLOAD.INVALID_TYPE}. Please remove: ${fileNames}`);
            }

            // Validate file sizes
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

            // Upload submissions for parallel processing
            const res = await fetch("/api/v1/teacher/student-submission", {
                method: "POST",
                headers: {Authorization: `Bearer ${token}`},
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || data.message || "Upload failed");
            }

            const result = data.data as UploadResult;
            setUploadResult(result);

            // Handle errors if any
            if (result.errors && result.errors.length > 0) {
                const newRejectedFiles: FileRejection[] = result.errors.map(error => {
                    const file = files.find(f => f.name === error.filename);
                    return {
                        file: file!,
                        errors: [{
                            code: 'backend-validation',
                            message: error.error
                        }]
                    };
                });

                const validFiles = files.filter(f =>
                    !result.errors.some(e => e.filename === f.name)
                );

                setFiles(validFiles);
                setRejectedFiles(prev => [...prev, ...newRejectedFiles]);
            }

            // Show success message
            if (result.queued > 0) {
                toast({
                    title: "Submissions Queued Successfully!",
                    description: `${result.queued} submission${result.queued === 1 ? '' : 's'} queued for processing. Please allow up to 3 minutes for evaluation to complete.`,
                    duration: 5000,
                });

                // Clear successful files
                if (result.failed === 0) {
                    setFiles([]);
                    setRejectedFiles([]);
                }
            }

            if (result.failed > 0) {
                toast({
                    variant: "destructive",
                    title: "Some Submissions Failed",
                    description: `${result.failed} submission${result.failed === 1 ? '' : 's'} failed validation. Please check the errors below.`,
                    duration: 5000,
                });
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : "Error occurred");
            toast({
                variant: "destructive",
                title: "Upload Failed",
                description: err instanceof Error ? err.message : "An error occurred",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
            <PageHeader
                title="Upload Student Submissions"
                description="Select an exam and upload student answer sheets for automated grading."
            />

            <div className="grid gap-6">
                {error && (
                    <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive whitespace-pre-wrap">
                        {error}
                    </div>
                )}

                {uploadResult && uploadResult.queued > 0 && (
                    <Card className="border-2 border-green-200 bg-green-50/30">
                        <CardContent className="pt-6">
                            <div className="flex items-start gap-4">
                                <CheckCircle2 className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                                <div className="flex-1">
                                    <h3 className="font-semibold text-green-900 mb-2">
                                        Submissions Queued Successfully!
                                    </h3>
                                    <p className="text-sm text-green-800 mb-4">
                                        {uploadResult.queued} submission{uploadResult.queued === 1 ? '' : 's'} {uploadResult.queued === 1 ? 'is' : 'are'} currently being evaluated.
                                        Please allow up to 3 minutes for the evaluation to complete.
                                    </p>
                                    <div className="flex items-center gap-2 text-sm text-green-700">
                                        <Clock className="h-4 w-4" />
                                        <span>Processing in progress...</span>
                                    </div>

                                    {uploadResult.failed > 0 && (
                                        <div className="mt-4 pt-4 border-t border-green-200">
                                            <p className="text-sm text-amber-700 font-semibold mb-2">
                                                {uploadResult.failed} submission{uploadResult.failed === 1 ? '' : 's'} failed validation:
                                            </p>
                                            <ul className="text-xs text-amber-800 space-y-1">
                                                {uploadResult.errors.map((error, idx) => (
                                                    <li key={idx}>
                                                        <strong>{error.filename}:</strong> {error.error}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Upload Submissions</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        <div className="grid max-w-md gap-2">
                            <Label htmlFor="exam-selection">Select Exam</Label>
                            <Select
                                value={selectedExamId}
                                onValueChange={setSelectedExamId}
                                disabled={loadingExams}
                            >
                                <SelectTrigger id="exam-selection">
                                    <SelectValue placeholder={loadingExams ? "Loading exams..." : "Choose an exam..."} />
                                </SelectTrigger>
                                <SelectContent>
                                    {exams.map((exam) => (
                                        <SelectItem key={exam.id} value={exam.id}>
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
                                Name files as: <code className="rounded bg-muted px-1 py-0.5">{"{"}student_user_id{"}"}.pdf</code>
                            </p>
                            <p className="text-xs text-muted-foreground">
                                You can upload multiple PDFs at once. Each will be processed in parallel.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end">
                    <Button
                        size="lg"
                        onClick={handleSubmit}
                        disabled={isSubmitting || !selectedExamId || !files.length}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Uploading & Queuing...
                            </>
                        ) : (
                            <>
                                <FileCheck2 className="mr-2 h-4 w-4" />
                                Submit for Grading
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}