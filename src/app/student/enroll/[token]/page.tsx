"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import {
    BookOpen,
    Loader2,
    CheckCircle,
    AlertCircle,
    ArrowRight,
    X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CourseInfo {
    id: string;
    courseCode: string;
    courseName: string;
    sectionType: string;
    sectionNumber: string;
    semester: string;
    academicYear: string;
}

interface EnrollmentData {
    course: CourseInfo;
    isEnrolled: boolean;
}

export default function EnrollmentPage({ params }: { params: { token: string } }) {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [enrolling, setEnrolling] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [enrollmentData, setEnrollmentData] = useState<EnrollmentData | null>(null);

    useEffect(() => {
        const checkEnrollment = async () => {
            try {
                setLoading(true);
                setError(null);

                const token = localStorage.getItem('token');
                if (!token) {
                    router.push('/login');
                    return;
                }

                const response = await fetch(`/api/v1/student/enroll?token=${params.token}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    }
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to verify enrollment link');
                }

                const data = await response.json();
                const enrollmentInfo = data.data;

                // If already enrolled, redirect to course page
                if (enrollmentInfo.isEnrolled) {
                    toast({
                        title: "Already Enrolled",
                        description: "You are already enrolled in this course. Redirecting...",
                    });
                    setTimeout(() => {
                        router.push(`/student/courses/${enrollmentInfo.course.id}`);
                    }, 1500);
                    return;
                }

                setEnrollmentData(enrollmentInfo);

            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load enrollment information');
            } finally {
                setLoading(false);
            }
        };

        checkEnrollment();
    }, [params.token, router, toast]);

    const handleEnroll = async () => {
        try {
            setEnrolling(true);
            setError(null);

            const token = localStorage.getItem('token');
            if (!token) {
                router.push('/login');
                return;
            }

            const response = await fetch('/api/v1/student/enroll', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ enrollmentToken: params.token })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to enroll in course');
            }

            const data = await response.json();
            const result = data.data;

            // Show success toast
            toast({
                title: "Enrollment Successful!",
                description: `You have been enrolled in ${enrollmentData?.course.courseName}`,
            });

            // Redirect to course page
            setTimeout(() => {
                router.push(`/student/courses/${result.courseId}`);
            }, 1000);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to enroll in course';
            setError(errorMessage);
            toast({
                variant: "destructive",
                title: "Enrollment Failed",
                description: errorMessage,
            });
        } finally {
            setEnrolling(false);
        }
    };

    const handleDecline = () => {
        router.push('/student/dashboard');
    };

    // Loading state
    if (loading) {
        return (
            <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
                <PageHeader title="Loading..." description="Verifying enrollment link" />
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </div>
        );
    }

    // Error state
    if (error && !enrollmentData) {
        return (
            <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
                <PageHeader title="Invalid Link" description="This enrollment link is not valid" />
                <Card className="max-w-2xl mx-auto w-full">
                    <CardContent className="pt-6">
                        <div className="text-center py-8">
                            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
                            <p className="text-destructive font-medium mb-2">{error}</p>
                            <p className="text-sm text-muted-foreground mb-6">
                                Please check the link or contact your instructor
                            </p>
                            <Button onClick={() => router.push('/student/dashboard')}>
                                Go to Dashboard
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Main enrollment confirmation UI
    if (enrollmentData) {
        const { course } = enrollmentData;

        return (
            <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
                <PageHeader
                    title="Course Enrollment"
                    description="Confirm your enrollment in this course"
                />

                <div className="max-w-2xl mx-auto w-full space-y-6">
                    {/* Course Information Card */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-primary/10 rounded-lg">
                                    <BookOpen className="h-8 w-8 text-primary" />
                                </div>
                                <div className="flex-1">
                                    <CardTitle className="text-2xl mb-2">
                                        {course.courseName}
                                    </CardTitle>
                                    <CardDescription className="text-base">
                                        <span className="font-mono font-medium text-foreground">
                                            {course.courseCode}
                                        </span>
                                        {" • "}
                                        {course.sectionType} Section {course.sectionNumber}
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between py-2 border-t">
                                    <span className="text-sm text-muted-foreground">Semester</span>
                                    <span className="text-sm font-medium">{course.semester}</span>
                                </div>
                                <div className="flex items-center justify-between py-2 border-t">
                                    <span className="text-sm text-muted-foreground">Academic Year</span>
                                    <span className="text-sm font-medium">{course.academicYear}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Confirmation Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                Confirm Enrollment
                            </CardTitle>
                            <CardDescription>
                                Would you like to enroll in this course? You'll get access to all course materials and exams.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {error && (
                                <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                                    <p className="text-sm text-destructive">{error}</p>
                                </div>
                            )}
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    onClick={handleDecline}
                                    disabled={enrolling}
                                    className="flex-1"
                                >
                                    <X className="mr-2 h-4 w-4" />
                                    No, Go Back
                                </Button>
                                <Button
                                    onClick={handleEnroll}
                                    disabled={enrolling}
                                    className="flex-1"
                                >
                                    {enrolling ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Enrolling...
                                        </>
                                    ) : (
                                        <>
                                            Yes, Enroll Me
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return null;
}