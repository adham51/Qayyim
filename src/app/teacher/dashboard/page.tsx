"use client"
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BookCopy, GraduationCap, CheckCircle, PlusCircle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const gradeData = [
  { name: 'A', count: 15 },
  { name: 'B', count: 25 },
  { name: 'C', count: 18 },
  { name: 'D', count: 5 },
  { name: 'F', count: 20 },
];

export default function TeacherDashboard() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
      <PageHeader
        title="Dashboard"
        description="Welcome back, here's a summary of your activities."
      >
        <Button asChild>
          <Link href="/teacher/exams/create">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Exam
          </Link>
        </Button>
      </PageHeader>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Exams Created"
          value="12"
          icon={<BookCopy className="h-6 w-6 text-muted-foreground" />}
        />
        <StatCard
          title="Students Graded"
          value="452"
          icon={<GraduationCap className="h-6 w-6 text-muted-foreground" />}
        />
        <StatCard
          title="Pending Submissions"
          value="32"
          icon={<CheckCircle className="h-6 w-6 text-muted-foreground" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Overall Grade Distribution</CardTitle>
          <CardDescription>Distribution of grades across all exams.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gradeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    borderColor: 'hsl(var(--border))',
                  }}
                />
                <Legend />
                <Bar dataKey="count" fill="hsl(var(--primary))" name="Number of Students" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
