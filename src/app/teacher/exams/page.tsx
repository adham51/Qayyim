"use client"
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Eye, Search } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { getTeacherExams, TeacherExam, AvailableCourse } from "@/services/teacherExamService";

export default function ExamManagementPage() {
  const [exams, setExams] = useState<TeacherExam[]>([]);
  const [availableCourses, setAvailableCourses] = useState<AvailableCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourseCode, setSelectedCourseCode] = useState<string>("all");

  useEffect(() => {
    async function fetchExams() {
      try {
        setLoading(true);
        setError(null);
        const courseCode = selectedCourseCode === "all" ? undefined : selectedCourseCode;
        const data = await getTeacherExams(courseCode);
        setExams(data.exams);
        setAvailableCourses(data.availableCourses);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchExams();
  }, [selectedCourseCode]);

  // Filter exams by search query
  const filteredExams = useMemo(() => {
    if (!searchQuery.trim()) {
      return exams;
    }
    
    const query = searchQuery.toLowerCase();
    return exams.filter(exam => 
      exam.title.toLowerCase().includes(query) ||
      exam.courseCode?.toLowerCase().includes(query) ||
      exam.courseName?.toLowerCase().includes(query)
    );
  }, [exams, searchQuery]);

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        <PageHeader
          title="Exam Management"
          description="View, edit, and manage all your created exams."
        >
          <Button asChild>
            <Link href="/teacher/exams/create">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create New Exam
            </Link>
          </Button>
        </PageHeader>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Loading exams...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        <PageHeader
          title="Exam Management"
          description="View, edit, and manage all your created exams."
        >
          <Button asChild>
            <Link href="/teacher/exams/create">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create New Exam
            </Link>
          </Button>
        </PageHeader>
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">Error loading exams: {error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
      <PageHeader
        title="Exam Management"
        description="View, edit, and manage all your created exams."
      >
        <Button asChild>
          <Link href="/teacher/exams/create">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Exam
          </Link>
        </Button>
      </PageHeader>
      
      {/* Search and Filter Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search exams by title or course..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedCourseCode} onValueChange={setSelectedCourseCode}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by course" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {availableCourses.map((course) => (
                  <SelectItem key={course.courseCode} value={course.courseCode}>
                    {course.courseCode} - {course.courseName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filteredExams.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exam Title</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Submissions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Results</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExams.map((exam) => (
                  <TableRow key={exam.id}>
                    <TableCell>
                      <div className="font-medium">{exam.title}</div>
                      {exam.courseCode && (
                        <div className="text-sm text-muted-foreground mt-1">
                          <Badge variant="outline" className="text-xs">
                            {exam.courseCode}
                          </Badge>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {exam.courseCode ? (
                        <div>
                          <div className="font-medium">{exam.courseCode}</div>
                          {exam.courseName && (
                            <div className="text-sm text-muted-foreground">{exam.courseName}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No course</span>
                      )}
                    </TableCell>
                    <TableCell>{exam.gradedSubmissions} / {exam.totalSubmissions}</TableCell>
                    <TableCell>
                      {exam.gradedSubmissions < exam.totalSubmissions && exam.totalSubmissions > 0 ? (
                        <Badge variant="secondary">Grading in Progress</Badge>
                      ) : exam.totalSubmissions === 0 ? (
                        <Badge variant="outline">No Submissions</Badge>
                      ) : (
                        <Badge>Completed</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/teacher/exams/${exam.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Results
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">
                {searchQuery ? 'No exams found matching your search.' : 'No exams found.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
