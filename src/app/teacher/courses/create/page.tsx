"use client";

import * as React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import Link from "next/link";
import { FileUpload } from "@/components/file-upload";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {createCourse, uploadReference} from "@/services/instructorCoursesService";

export default function CreateCoursePage() {
    const router = useRouter();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [courseCode, setCourseCode] = useState("");
    const [courseName, setCourseName] = useState("");
    const [sectionType, setSectionType] = useState<string>("");
    const [sectionNumber, setSectionNumber] = useState("");
    const [academicYear, setAcademicYear] = useState("");
    const [semester, setSemester] = useState<string>("");
    const [referenceFiles, setReferenceFiles] = useState<File[]>([]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            if (!courseCode.trim()) throw new Error("Course code is required");
            if (!courseName.trim()) throw new Error("Course name is required");
            if (!sectionType) throw new Error("Section type is required");
            if (!sectionNumber.trim()) throw new Error("Section number is required");
            if (!academicYear.trim()) throw new Error("Academic year is required");
            if (!semester) throw new Error("Semester is required");
            if ((!referenceFiles || referenceFiles.length === 0) && sectionType === "LECTURE") {
                throw new Error("Reference file is required");
            }

            await createCourse({
                courseCode,
                courseName,
                sectionType,
                sectionNumber,
                academicYear,
                semester,
            });

            if ((referenceFiles && referenceFiles.length>0) && sectionType === "LECTURE") {
                const uploadResult = await uploadReference(referenceFiles[0], courseName);
                toast({
                    title: "Course Created Successfully!",
                    description: uploadResult?.message || `Course "${courseName}" has been created and file is processing.`,
                });
            }

            toast({
                title: "Course Created Successfully!",
                description: `Course "${courseName}" has been created and recorded.`,
            });



            router.push("/teacher/courses");
            router.refresh();

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An error occurred during course creation";
            setError(errorMessage);
            toast({
                variant: "destructive",
                title: "Error",
                description: errorMessage,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
            <PageHeader
                title="Create New Course"
                description="Set up a new course with section details and academic information."
            />

            <form onSubmit={handleSubmit} className="grid gap-6">
                {error && (
                    <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
                        {error}
                    </div>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Course Information</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="course-code">Course Code</Label>
                            <Input
                                id="course-code"
                                placeholder="e.g., CS101"
                                value={courseCode}
                                onChange={(e) => setCourseCode(e.target.value)}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="course-name">Course Name</Label>
                            <Input
                                id="course-name"
                                placeholder="e.g., Introduction to Computer Science"
                                value={courseName}
                                onChange={(e) => setCourseName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="section-type">Section Type</Label>
                            <Select value={sectionType} onValueChange={setSectionType} required>
                                <SelectTrigger id="section-type">
                                    <SelectValue placeholder="Select section type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="LECTURE">Lecture</SelectItem>
                                    <SelectItem value="LAB">Lab</SelectItem>
                                    <SelectItem value="TUTORIAL">Tutorial</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="section-number">Section Number</Label>
                            <Input
                                id="section-number"
                                placeholder="e.g., 01"
                                value={sectionNumber}
                                onChange={(e) => setSectionNumber(e.target.value)}
                                required
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Academic Details</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="academic-year">Academic Year</Label>
                            <Input
                                id="academic-year"
                                placeholder="e.g., 2024-2025"
                                value={academicYear}
                                onChange={(e) => setAcademicYear(e.target.value)}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="semester">Semester</Label>
                            <Select value={semester} onValueChange={setSemester} required>
                                <SelectTrigger id="semester">
                                    <SelectValue placeholder="Select semester" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="FALL">Fall</SelectItem>
                                    <SelectItem value="SPRING">Spring</SelectItem>
                                    <SelectItem value="SUMMER">Summer</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Course Materials</CardTitle>
                        <CardDescription>
                            Upload reference materials for the course (optional).
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        <div className="grid gap-2">
                            <Label>Upload Reference</Label>
                            <FileUpload
                                maxFiles={1}
                                onFilesChange={setReferenceFiles}
                                value={referenceFiles}
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" asChild type="button">
                        <Link href="/teacher/courses">Cancel</Link>
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating Course...
                            </>
                        ) : (
                            "Create Course"
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}