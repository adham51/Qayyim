"use client"

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BookCopy, GraduationCap, CheckCircle, PlusCircle, Loader2 } from "lucide-react";
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

interface DashboardData {
  statistics: {
    totalExams: number;
    totalSubmissions: number;
    pendingSubmissions: number;
    studentsGraded: number;
  };
  gradeDistribution: {
    A: number;
    B: number;
    C: number;
    D: number;
    F: number;
  };
}

export default function TeacherDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const response = await fetch('/api/v1/teacher/dashboard', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
        });
        const result = await response.json();
        if (result.success) {
          setData(result.data);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  // Map API distribution to Recharts format
  const chartData = data ? [
    { name: 'A', count: data.gradeDistribution.A },
    { name: 'B', count: data.gradeDistribution.B },
    { name: 'C', count: data.gradeDistribution.C },
    { name: 'D', count: data.gradeDistribution.D },
    { name: 'F', count: data.gradeDistribution.F },
  ] : [];

  if (loading) {
    return (
        <div className="flex h-full items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );
  }

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
              value={data?.statistics.totalExams.toString() || "0"}
              icon={<BookCopy className="h-6 w-6 text-muted-foreground" />}
          />
          <StatCard
              title="Students Graded"
              value={data?.statistics.studentsGraded.toString() || "0"}
              icon={<GraduationCap className="h-6 w-6 text-muted-foreground" />}
          />
          <StatCard
              title="Pending Submissions"
              value={data?.statistics.pendingSubmissions.toString() || "0"}
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
                <BarChart data={chartData}>
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