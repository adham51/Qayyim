"use client"
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Check, X, AlertTriangle, MessageCircle, FileText, BookOpen } from "lucide-react";
import Link from "next/link";
import { getSubmissionDetail } from "@/services/studentResultService";
import { SubmissionDetail } from "@/types/student-results";

interface CombinedAnswer {
    questionId: string;
    question: string;
    questionGrade: number;
    modelAnswer: string;
    studentAnswer: string;
    studentGrade: number;
    feedback: string;
    type?: string;
}

export default function DetailedFeedbackPage({ params }: { params: { id: string } }) {
    const [data, setData] = useState<SubmissionDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchSubmissionDetail() {
            try {
                setLoading(true);
                setError(null);
                const result = await getSubmissionDetail(params.id);
                setData(result);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setLoading(false);
            }
        }

        fetchSubmissionDetail();
    }, [params.id]);

    if (loading) {
        return (
            <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
                <PageHeader title="Loading..." />
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-center h-64">
                            <p className="text-muted-foreground">Loading submission details...</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
                <PageHeader title="Error" />
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-destructive">Error: {error}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
                <PageHeader title="Result not found" />
            </div>
        );
    }

    const { submission, exam } = data;

    // Combine exam questions with student answers
    const combinedAnswers: CombinedAnswer[] = [];

    try {
        // Parse exam questions
        const examQuestions = typeof exam.questions === 'string'
            ? JSON.parse(exam.questions)
            : exam.questions || [];

        // Parse student answers
        const studentAnswers = Array.isArray(submission.originalAnswers)
            ? submission.originalAnswers
            : typeof submission.originalAnswers === 'object'
                ? Object.values(submission.originalAnswers)
                : [];

        // Combine questions with answers
        examQuestions.forEach((examQ: any) => {
            const studentAns = studentAnswers.find((ans: any) => ans.questionId === examQ.questionId);

            combinedAnswers.push({
                questionId: examQ.questionId,
                question: examQ.question || 'Question text not available',
                questionGrade: examQ.questionGrade || 0,
                modelAnswer: examQ.answer || 'Model answer not available',
                studentAnswer: studentAns?.answer || 'No answer provided',
                studentGrade: studentAns?.studentGrade || 0,
                feedback: studentAns?.feedback || 'No feedback provided',
                type: examQ.type,
            });
        });
    } catch (err) {
        console.error('Error parsing questions/answers:', err);
    }

    // Calculate percentage
    const percentage = exam.totalMarks && submission.marks !== null
        ? ((submission.marks / exam.totalMarks) * 100).toFixed(1)
        : null;

    // Get grade color based on percentage
    const getGradeColor = (grade: number, total: number) => {
        const percent = (grade / total) * 100;
        if (percent >= 90) return 'text-green-600 dark:text-green-400';
        if (percent >= 70) return 'text-blue-600 dark:text-blue-400';
        if (percent >= 50) return 'text-yellow-600 dark:text-yellow-400';
        return 'text-red-600 dark:text-red-400';
    };

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
            <PageHeader
                title={`Feedback: ${exam.title}`}
                description={
                    submission.marks !== null && exam.totalMarks
                        ? `Your score: ${submission.marks}/${exam.totalMarks} (${percentage}%). Review detailed feedback below.`
                        : submission.marks !== null
                            ? `Your score: ${submission.marks}. Review detailed feedback below.`
                            : 'Your submission is pending grading.'
                }
            >
                <Button asChild>
                    <Link href="/student/grievance">
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Have a concern?
                    </Link>
                </Button>
            </PageHeader>

            {/* Score Overview */}
            {submission.marks !== null && exam.totalMarks && (
                <Card className="border-2">
                    <CardHeader>
                        <CardTitle className="font-headline">Score Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Score</p>
                                <p className={`text-4xl font-bold ${getGradeColor(submission.marks, exam.totalMarks)}`}>
                                    {submission.marks} / {exam.totalMarks}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-muted-foreground">Percentage</p>
                                <p className={`text-4xl font-bold ${getGradeColor(submission.marks, exam.totalMarks)}`}>
                                    {percentage}%
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Exam Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div>
                            <span className="font-semibold">Title: </span>
                            <span className="text-muted-foreground">{exam.title}</span>
                        </div>
                        {exam.description && (
                            <div>
                                <span className="font-semibold">Description: </span>
                                <span className="text-muted-foreground">{exam.description}</span>
                            </div>
                        )}
                        <div>
                            <span className="font-semibold">Type: </span>
                            <span className="text-muted-foreground">{exam.type.replace('_', ' ')}</span>
                        </div>
                        {exam.totalMarks && (
                            <div>
                                <span className="font-semibold">Total Marks: </span>
                                <span className="text-muted-foreground">{exam.totalMarks}</span>
                            </div>
                        )}
                        {exam.examDate && (
                            <div>
                                <span className="font-semibold">Exam Date: </span>
                                <span className="text-muted-foreground">
                                    {new Date(exam.examDate).toLocaleDateString()}
                                </span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Submission Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div>
                            <span className="font-semibold">Status: </span>
                            <span className={`font-medium ${
                                submission.status === 'GRADED'
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-yellow-600 dark:text-yellow-400'
                            }`}>
                                {submission.status}
                            </span>
                        </div>
                        <div>
                            <span className="font-semibold">Score: </span>
                            <span className="text-muted-foreground">
                                {submission.marks !== null ? submission.marks : 'Pending'}
                            </span>
                        </div>
                        <div>
                            <span className="font-semibold">Submitted: </span>
                            <span className="text-muted-foreground">
                                {new Date(submission.submittedAt).toLocaleString()}
                            </span>
                        </div>
                        {submission.gradedAt && (
                            <div>
                                <span className="font-semibold">Graded: </span>
                                <span className="text-muted-foreground">
                                    {new Date(submission.gradedAt).toLocaleString()}
                                </span>
                            </div>
                        )}
                        {submission.fileLink && (
                            <div>
                                <span className="font-semibold">Your Submission: </span>
                                <Button asChild variant="link" className="p-0 h-auto">
                                    <a href={submission.fileLink} target="_blank" rel="noopener noreferrer">
                                        View PDF
                                    </a>
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {submission.feedback && (
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Overall Feedback</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950">
                            <h4 className="flex items-center font-semibold text-yellow-800 dark:text-yellow-300">
                                <AlertTriangle className="mr-2 h-4 w-4"/>
                                Instructor Feedback
                            </h4>
                            <p className="mt-2 text-yellow-700 dark:text-yellow-400 whitespace-pre-wrap">
                                {submission.feedback}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Detailed Question-by-Question Breakdown */}
            {combinedAnswers.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Question-by-Question Breakdown</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Review each question with your answer, the model answer, and instructor feedback
                        </p>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="single" collapsible className="w-full">
                            {combinedAnswers.map((item, index) => (
                                <AccordionItem value={`item-${index}`} key={index}>
                                    <AccordionTrigger>
                                        <div className="flex w-full items-center justify-between pr-4">
                                            <div className="flex items-center gap-3">
                                                <span className="font-semibold">Q{item.questionId}</span>
                                                {item.type && (
                                                    <span className="text-xs px-2 py-1 rounded bg-secondary text-secondary-foreground">
                                                        {item.type}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className={`font-bold ${getGradeColor(item.studentGrade * item.questionGrade, item.questionGrade)}`}>
                                                    {item.studentGrade * item.questionGrade} / {item.questionGrade}
                                                </span>
                                                {item.studentGrade === item.questionGrade ? (
                                                    <Check className="h-5 w-5 text-green-600" />
                                                ) : item.studentGrade === 0 ? (
                                                    <X className="h-5 w-5 text-red-600" />
                                                ) : (
                                                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                                                )}
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="space-y-6 pt-4">
                                        {/* Question Text */}
                                        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
                                            <div className="flex items-start gap-2">
                                                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                                                <div className="flex-1">
                                                    <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
                                                        Question
                                                    </h4>
                                                    <p className="text-blue-800 dark:text-blue-200 whitespace-pre-wrap">
                                                        {item.question}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <Separator />

                                        {/* Your Answer */}
                                        <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-900 dark:bg-purple-950">
                                            <h4 className="font-semibold text-purple-900 dark:text-purple-300 mb-2">
                                                Your Answer
                                            </h4>
                                            <p className="text-purple-800 dark:text-purple-200 whitespace-pre-wrap">
                                                {item.studentAnswer}
                                            </p>
                                        </div>

                                        {/* Model Answer */}
                                        <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
                                            <div className="flex items-start gap-2">
                                                <BookOpen className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                                                <div className="flex-1">
                                                    <h4 className="font-semibold text-green-900 dark:text-green-300 mb-2">
                                                        Model Answer
                                                    </h4>
                                                    <p className="text-green-800 dark:text-green-200 whitespace-pre-wrap">
                                                        {item.modelAnswer}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Feedback */}
                                        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950">
                                            <div className="flex items-start gap-2">
                                                <MessageCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                                                <div className="flex-1">
                                                    <h4 className="font-semibold text-yellow-900 dark:text-yellow-300 mb-2">
                                                        Instructor Feedback
                                                    </h4>
                                                    <p className="text-yellow-800 dark:text-yellow-200 whitespace-pre-wrap">
                                                        {item.feedback}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Score Summary */}
                                        <div className="flex items-center justify-between pt-2 border-t">
                                            <span className="text-sm text-muted-foreground">
                                                Points Earned
                                            </span>
                                            <span className={`text-lg font-bold ${getGradeColor(item.studentGrade, item.questionGrade)}`}>
                                                {item.studentGrade.toFixed(2)} / {item.questionGrade}
                                                ({((item.studentGrade / item.questionGrade) * 100).toFixed(1)}%)
                                            </span>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </CardContent>
                </Card>
            )}

            {/* Model Answer File */}
            {exam.modelAnswerFile && (
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Model Answer Document</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Button asChild variant="outline">
                            <a href={exam.modelAnswerFile} target="_blank" rel="noopener noreferrer">
                                <FileText className="mr-2 h-4 w-4" />
                                View Model Answer PDF
                            </a>
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}