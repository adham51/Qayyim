"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
    BookOpen,
    Calendar,
    Clock,
    FileText,
    ArrowLeft,
    Loader2,
    CheckCircle,
    XCircle,
    AlertCircle
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { getCourceContent } from "@/services/studentResultService";
import { CourseContent } from "@/types/student-results";

// Gradient backgrounds (same as courses page)
const courseGradients = [
    "bg-gradient-to-br from-blue-500 to-cyan-600",
    "bg-gradient-to-br from-purple-500 to-pink-600",
    "bg-gradient-to-br from-orange-500 to-red-600",
    "bg-gradient-to-br from-green-500 to-emerald-600",
    "bg-gradient-to-br from-indigo-500 to-blue-600",
    "bg-gradient-to-br from-rose-500 to-pink-600",
    "bg-gradient-to-br from-teal-500 to-cyan-600",
    "bg-gradient-to-br from-amber-500 to-orange-600",
];

const getCourseGradient = (courseId: string) => {
    const hash = courseId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return courseGradients[hash % courseGradients.length];
};

const getSectionColor = (sectionType: string) => {
    switch (sectionType) {
        case 'LECTURE':
            return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
        case 'LAB':
            return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
        case 'TUTORIAL':
            return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
        default:
            return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
    }
};

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'GRADED':
            return <CheckCircle className="h-5 w-5 text-green-600" />;
        case 'PENDING':
            return <Clock className="h-5 w-5 text-yellow-600" />;
        default:
            return <XCircle className="h-5 w-5 text-red-600" />;
    }
};

const getStatusBadge = (status: string) => {
    switch (status) {
        case 'GRADED':
            return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Graded</Badge>;
        case 'PENDING':
            return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Pending</Badge>;
        default:
            return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Not Submitted</Badge>;
    }
};

export default function CourseDetailPage({ params }: { params: { id: string } }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [courseData, setCourseData] = useState<CourseContent | null>(null);

    useEffect(() => {
        const fetchCourseDetails = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await getCourceContent(params.id);
                setCourseData(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load course details');
            } finally {
                setLoading(false);
            }
        };

        fetchCourseDetails();
    }, [params.id]);

    if (loading) {
        return (
            <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
                <PageHeader title="Loading..." />
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
                <PageHeader title="Error" />
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-destructive">{error}</p>
                        <Button asChild className="mt-4">
                            <Link href="/student/courses">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Courses
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!courseData || !courseData.course) {
        return (
            <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
                <PageHeader title="Course not found" />
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-muted-foreground">The course you're looking for doesn't exist.</p>
                        <Button asChild className="mt-4">
                            <Link href="/student/courses">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Courses
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const { course, totalExams, averageMarks } = courseData;

    // Count pending exams
    const pendingExams = course.exams.filter(exam =>
        exam.submissions.length > 0 && exam.submissions[0].status === 'PENDING'
    ).length;

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
            {/* Back Button */}
            <div>
                <Button variant="ghost" asChild>
                    <Link href="/student/courses">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Courses
                    </Link>
                </Button>
            </div>

            {/* Course Header */}
            <div className="relative overflow-hidden rounded-lg">
                <div className={`${getCourseGradient(course.id)} p-8 md:p-12`}>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-white/90 font-mono font-medium text-lg">
                                {course.courseCode}
                            </span>
                            <span className={`text-xs px-3 py-1 rounded-full font-medium ${getSectionColor(course.sectionType)}`}>
                                {course.sectionType}
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                            {course.courseName}
                        </h1>
                        <div className="flex flex-wrap items-center gap-4 text-white/80 text-sm">
                            <span>Section {course.sectionNumber}</span>
                            <span>•</span>
                            <span>{course.semester} {course.academicYear}</span>
                        </div>
                    </div>
                    <div className="absolute top-0 right-0 opacity-10">
                        <BookOpen className="h-48 w-48 text-white" />
                    </div>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Exams</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalExams}</div>
                        <p className="text-xs text-muted-foreground">
                            {course.exams.filter(e => e.submissions.length > 0 && e.submissions[0].status === 'GRADED').length} graded
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {averageMarks.toFixed(1)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Out of total marks
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Pending</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {pendingExams}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Awaiting grading
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Exams List */}
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Course Exams</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        All assessments for this course
                    </p>
                </CardHeader>
                <CardContent>
                    {course.exams.length === 0 ? (
                        <div className="text-center py-12">
                            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">No exams available for this course</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {course.exams.map((exam) => {
                                const submission = exam.submissions.length > 0 ? exam.submissions[0] : null;
                                const status = submission
                                    ? submission.status
                                    : 'NOT_SUBMITTED';
                                const isClickable = submission !== null;

                                return (
                                    <Link
                                        key={exam.id}
                                        href={isClickable ? `/student/results/${exam.id}` : '#'}
                                        className={!isClickable ? 'pointer-events-none' : ''}
                                    >
                                        <Card className={`transition-all ${isClickable ? 'hover:shadow-md hover:border-primary/50 cursor-pointer' : 'opacity-60'}`}>
                                            <CardContent className="p-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-start gap-4 flex-1">
                                                        <div className="mt-1">
                                                            {getStatusIcon(status)}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h3 className="font-semibold text-base">
                                                                    {exam.title}
                                                                </h3>
                                                                {getStatusBadge(status)}
                                                            </div>
                                                            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                                                <span className="flex items-center gap-1">
                                                                    <FileText className="h-3.5 w-3.5" />
                                                                    {exam.type.replace('_', ' ')}
                                                                </span>
                                                                {exam.examDate && (
                                                                    <span className="flex items-center gap-1">
                                                                        <Calendar className="h-3.5 w-3.5" />
                                                                        {new Date(exam.examDate).toLocaleDateString()}
                                                                    </span>
                                                                )}
                                                                <span>
                                                                    Total: {exam.totalMarks} marks
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        {status === 'GRADED' && submission?.marks !== null && submission?.marks !== undefined ? (
                                                            <div>
                                                                <div className="text-2xl font-bold">
                                                                    {submission.marks}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    / {exam.totalMarks}
                                                                </div>
                                                            </div>
                                                        ) : status === 'PENDING' ? (
                                                            <div className="text-sm text-yellow-600">
                                                                Pending
                                                            </div>
                                                        ) : (
                                                            <div className="text-sm text-red-600">
                                                                Not Submitted
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}