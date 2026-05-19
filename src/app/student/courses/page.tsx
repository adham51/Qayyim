"use client";

import { Course } from "@/types/student-results";
import { useEffect, useState } from "react";
import { getStudentCourses } from "@/services/studentResultService";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { BookOpen, Loader2 } from "lucide-react";
import Link from "next/link";

// Gradient backgrounds for courses
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

// Get consistent gradient for a course based on its ID
const getCourseGradient = (courseId: string) => {
    const hash = courseId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return courseGradients[hash % courseGradients.length];
};

// Get section type badge color
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

export default function MyCoursesPage() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadCourses() {
            try {
                setLoading(false);
                setError(null);
                const coursesData = await getStudentCourses();
                setCourses(coursesData);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load courses');
            } finally {
                setLoading(false);
            }
        }

        loadCourses();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
                <PageHeader title="My Courses" description="View all your enrolled courses" />
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
                <PageHeader title="My Courses" description="View all your enrolled courses" />
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-destructive">{error}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
            <PageHeader
                title="My Courses"
                description={`You are enrolled in ${courses.length} ${courses.length === 1 ? 'course' : 'courses'}`}
            />

            {courses.length === 0 ? (
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center py-12">
                            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">No courses found</p>
                            <p className="text-sm text-muted-foreground mt-2">
                                You are not enrolled in any courses yet
                            </p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {courses.map((course) => (
                        <Link
                            key={course.id}
                            href={`/student/courses/${course.id}`}
                            className="group"
                        >
                            <Card className="h-full overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer border-2 hover:border-primary/50">
                                {/* Gradient Header */}
                                <div className={`h-32 ${getCourseGradient(course.id)} flex items-center justify-center relative overflow-hidden`}>
                                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-colors" />
                                    <BookOpen className="h-16 w-16 text-white/90 relative z-10 group-hover:scale-110 transition-transform" />
                                </div>

                                <CardHeader className="space-y-2 pb-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors line-clamp-2">
                                                {course.courseName}
                                            </h3>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-mono font-medium text-muted-foreground">
                                            {course.courseCode}
                                        </span>
                                    </div>
                                </CardHeader>

                                <CardContent className="space-y-3 pb-4">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getSectionColor(course.sectionType)}`}>
                                            {course.sectionType}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            Section {course.sectionNumber}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>{course.semester}</span>
                                        <span>{course.academicYear}</span>
                                    </div>

                                    {!course.isActive && (
                                        <div className="pt-2 border-t">
                                            <span className="text-xs text-yellow-600 dark:text-yellow-400">
                                                Inactive
                                            </span>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}