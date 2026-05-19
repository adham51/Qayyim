"use client"
import { useState, useEffect, use } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Eye } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";

interface Submission {
  id: string;
  studentName: string;
  studentId: string;
  studentEmail: string;
  examId: string;
  marks: number | null;
  feedback: string;
  status: string;
  gradedAt: string | null;
  createdAt: string;
}

interface Exam {
  id: string;
  title: string;
  description: string | null;
  type: string;
  deadline: string | null;
  courseCode: string | null;
  courseName: string | null;
}

interface ExamResultsResponse {
  exam: Exam;
  submissions: Submission[];
}

export default function GradingResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [exam, setExam] = useState<Exam | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchExamResults() {
      try {
        setLoading(true);
        setError(null);
        
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found. Please log in.');
        }

        const response = await fetch(`/api/v1/teacher/exams/${id}/results`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include',
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Authentication failed. Please log in again.');
          }
          if (response.status === 404) {
            throw new Error('Exam not found.');
          }
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || `Failed to fetch exam results: ${response.status}`
          );
        }

        const data = await response.json();
        const results: ExamResultsResponse = data.data;
        setExam(results.exam);
        setSubmissions(results.submissions);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchExamResults();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        <PageHeader
          title="Loading Exam Results"
          description="Please wait while we fetch the exam data..."
        />
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Loading exam results...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        <PageHeader
          title="Exam Results"
          description={error || "Exam not found"}
        />
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">{error || "Exam not found"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const gradedCount = submissions.filter(s => s.status === 'GRADED').length;
  const totalCount = submissions.length;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
      <PageHeader
        title={`Results: ${exam.title}`}
        description={
          exam.courseCode 
            ? `${exam.courseCode} - ${exam.courseName || ''} | Showing ${gradedCount} of ${totalCount} graded submissions.`
            : `Showing ${gradedCount} of ${totalCount} graded submissions.`
        }
      >
        <Button asChild>
          <Link href={`/api/v1/teacher/exams/${exam.id}/results/download`}>
            <Download className="mr-2 h-4 w-4" />
            Download Grades
          </Link>
        </Button>
      </PageHeader>
      <Card>
        <CardContent className="pt-6">
          {submissions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Feedback</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">
                      {sub.studentName}
                      <div className="text-sm text-muted-foreground">{sub.studentEmail}</div>
                    </TableCell>
                    <TableCell>
                      {sub.marks !== null ? (
                        <Badge variant={sub.marks >= 80 ? "default" : sub.marks >= 60 ? "secondary" : "destructive"}>
                          {sub.marks}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Not Graded</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={sub.status === 'GRADED' ? 'default' : 'outline'}>
                        {sub.status === 'GRADED' ? 'Graded' : 'Pending'}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {sub.feedback || <span className="text-muted-foreground">No feedback</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/teacher/exams/${exam.id}/review/${sub.studentId}`}>
                          <Eye className="h-4 w-4"/>
                          <span className="sr-only">View Details</span>
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">No submissions found for this exam.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
