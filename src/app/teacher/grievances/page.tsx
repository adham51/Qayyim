"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Check, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

interface Grievance {
  id: string;
  grievanceType: string;
  questionNumber: number | null;
  description: string;
  status: string;
  instructorResponse: string | null;
  createdAt: string;
  reviewedAt: string | null;
  resolvedAt: string | null;
  student: {
    user: {
      name: string;
      email: string;
    };
  };
  exam: {
    id: string;
    title: string;
    description: string | null;
  };
  submission: {
    id: string;
    marks: number | null;
    feedback: string | null;
    status: string;
  };
}

export default function GrievancesPage() {
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    fetchGrievances();
  }, []);

  const fetchGrievances = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast({
          title: "Error",
          description: "Please log in to continue",
          variant: "destructive",
        });
        router.push('/login');
        return;
      }

      const res = await fetch("/api/v1/grievances", {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error("Failed to fetch grievances");
      }

      const data = await res.json();
      setGrievances(data.data || []);
    } catch (error) {
      console.error("Error fetching grievances:", error);
      toast({
        title: "Error",
        description: "Failed to load grievances",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (grievanceId: string, action: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error("Not logged in");
      }

      const res = await fetch(`/api/v1/grievances/${grievanceId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update grievance");
      }

      toast({
        title: "Success",
        description: action === "resolve" ? "Grievance marked as resolved" : "Grievance dismissed",
      });

      fetchGrievances();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update grievance",
        variant: "destructive",
      });
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "PENDING":
        return "secondary";
      case "RESOLVED":
        return "default";
      case "UNDER_REVIEW":
        return "outline";
      case "REJECTED":
        return "destructive";
      default:
        return "outline";
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatGrievanceType = (type: string) => {
    return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        <PageHeader
          title="Grievances & Complaints"
          description="Review and respond to student-submitted grievances."
        />
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
      <PageHeader
        title="Grievances & Complaints"
        description="Review and respond to student-submitted grievances."
      />
      <Card>
        <CardContent className="pt-6">
          {grievances.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No grievances submitted yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Exam</TableHead>
                  <TableHead>Grievance Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grievances.map((grievance) => (
                  <TableRow key={grievance.id}>
                    <TableCell className="font-medium">{grievance.student.user.name}</TableCell>
                    <TableCell>{grievance.exam.title}</TableCell>
                    <TableCell>{formatGrievanceType(grievance.grievanceType)}</TableCell>
                    <TableCell>{formatDate(grievance.createdAt)}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(grievance.status)}>
                        {grievance.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/teacher/grievances/${grievance.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          {grievance.status !== "RESOLVED" && grievance.status !== "REJECTED" && (
                            <>
                              <DropdownMenuItem onClick={() => handleAction(grievance.id, "resolve")}>
                                <Check className="mr-2 h-4 w-4" />
                                Mark as Resolved
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleAction(grievance.id, "dismiss")}>
                                <X className="mr-2 h-4 w-4" />
                                Dismiss
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

