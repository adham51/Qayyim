"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/page-header";
import Link from "next/link";
import { FileUpload } from "@/components/file-upload";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
// Import the service we updated [cite: 1, 2]
import { saveExam } from "@/services/teacherExamService";

interface Course {
  id: string;
  courseCode: string;
  courseName: string;
  sectionType: string;
  sectionNumber: string;
  academicYear: string;
  semester: string;
}

export default function CreateExamPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  // Form state
  const [title, setTitle] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [examType, setExamType] = useState<string>("");
  const [deadline, setDeadline] = useState("");
  const [modelAnswerFiles, setModelAnswerFiles] = useState<File[]>([]);

  // Fetch courses on component mount
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoadingCourses(true);
        const token = localStorage.getItem('token');
        if (!token) return;

        const res = await fetch("/api/v1/courses", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (res.ok && data.data?.flatCourses) {
          setCourses(data.data.flatCourses);
        }
      } catch (err) {
        console.error('Error fetching courses:', err);
      } finally {
        setLoadingCourses(false);
      }
    };

    fetchCourses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // 1) Validation
      if (!title.trim()) throw new Error("Exam title is required");
      if (!selectedCourseId) throw new Error("Please select a course");
      if (!examType) throw new Error("Exam type is required");
      if (modelAnswerFiles.length === 0) throw new Error("Please upload a model answer PDF for extraction");

      // 2) Prepare metadata for the service
      const selectedCourse = courses.find(c => c.id === selectedCourseId);
      const examMeta = {
        title,
        type: examType, // Must match "MCQ", "TRUE_FALSE", etc. [cite: 4]
        examDate: deadline || null,
        description: selectedCourse
            ? `${selectedCourse.courseCode} - ${selectedCourse.courseName}`
            : null,
        courseId: selectedCourseId,
      };

      // 3) Call the integrated saveExam service [cite: 1, 2, 5]
      // This function handles: OCR -> AI Extraction -> S3 Upload -> Database Save
      await saveExam(modelAnswerFiles[0], examMeta);

      // 4) Success Handling
      toast({
        title: "Exam Created Successfully!",
        description: `Exam "${title}" has been processed and saved.`,
      });

      router.push("/teacher/exams");
      router.refresh();

    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred during exam creation");
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to create exam",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        <PageHeader
            title="Create New Exam"
            description="Upload your exam PDF. Our AI will automatically extract questions and model answers."
        />

        <form onSubmit={handleSubmit} className="grid gap-6">
          {error && (
              <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
                {error}
              </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Exam Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="exam-title">Exam Title</Label>
                <Input
                    id="exam-title"
                    placeholder="e.g., Data Structures Midterm"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="course">Course</Label>
                <Select
                    value={selectedCourseId}
                    onValueChange={setSelectedCourseId}
                    required
                    disabled={loadingCourses}
                >
                  <SelectTrigger id="course">
                    <SelectValue placeholder={loadingCourses ? "Loading courses..." : "Select a course"} />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.courseCode} - {course.courseName}
                        </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="exam-type">Exam Type</Label>
                <Select value={examType} onValueChange={setExamType} required>
                  <SelectTrigger id="exam-type">
                    <SelectValue placeholder="Select exam type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MCQ">MCQ</SelectItem>
                    <SelectItem value="TRUE_FALSE">True/False</SelectItem>
                    <SelectItem value="SHORT_ANSWER">Short Answer</SelectItem>
                    <SelectItem value="MIXED">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="deadline">Exam Date / Deadline</Label>
                <Input
                    id="deadline"
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-headline">AI Extraction</CardTitle>
              <CardDescription>Upload the PDF containing questions and answers. The AI will parse these for grading.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="grid gap-2">
                <Label>Upload Model Answers (PDF)</Label>
                <FileUpload
                    maxFiles={1}
                    onFilesChange={setModelAnswerFiles}
                    value={modelAnswerFiles}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" asChild type="button">
              <Link href="/teacher/exams">Cancel</Link>
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing AI Extraction...
                  </>
              ) : (
                  "Create & Extract Exam"
              )}
            </Button>
          </div>
        </form>
      </div>
  );
}