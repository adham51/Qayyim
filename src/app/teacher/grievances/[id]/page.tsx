"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Separator } from "@/components/ui/separator";
import { Check, X, Send, User, Calendar, Tag, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { use } from "react";

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
    originalAnswers: any;
    marks: number | null;
    feedback: string | null;
    status: string;
    createdAt: string;
    gradedAt: string | null;
  };
}

export default function GrievanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [grievance, setGrievance] = useState<Grievance | null>(null);
  const [loading, setLoading] = useState(true);
  const [response, setResponse] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    fetchGrievance();
  }, [id]);

  const fetchGrievance = async () => {
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

      const res = await fetch(`/api/v1/grievances/${id}`, {
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
        throw new Error("Failed to fetch grievance");
      }

      const data = await res.json();
      setGrievance(data.data);
      setResponse(data.data?.instructorResponse || "");
    } catch (error) {
      console.error("Error fetching grievance:", error);
      toast({
        title: "Error",
        description: "Failed to load grievance",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendResponse = async () => {
    if (!response.trim()) {
      toast({
        title: "Error",
        description: "Please enter a response",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error("Not logged in");
      }

      const res = await fetch(`/api/v1/grievances/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "respond",
          instructorResponse: response,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send response");
      }

      toast({
        title: "Success",
        description: "Response sent successfully",
      });

      fetchGrievance();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send response",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (action: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error("Not logged in");
      }

      const res = await fetch(`/api/v1/grievances/${id}`, {
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

      router.push("/teacher/grievances");
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
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatGrievanceType = (type: string) => {
    return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        <PageHeader title="Loading..." />
      </div>
    );
  }

  if (!grievance) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        <PageHeader title="Grievance not found" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
      <PageHeader
        title="Grievance Details"
        description={`Reviewing grievance from ${grievance.student.user.name}`}
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/teacher/grievances">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          {grievance.status !== "RESOLVED" && grievance.status !== "REJECTED" && (
            <>
              <Button variant="outline" onClick={() => handleAction("dismiss")}>
                <X className="mr-2 h-4 w-4" />
                Dismiss
              </Button>
              <Button onClick={() => handleAction("resolve")}>
                <Check className="mr-2 h-4 w-4" />
                Mark as Resolved
              </Button>
            </>
          )}
        </div>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">
                Grievance from {grievance.student.user.name}
              </CardTitle>
              <CardDescription>
                Regarding the exam: <strong>{grievance.exam.title}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Description:</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {grievance.description}
                  </p>
                </div>
                {grievance.questionNumber && (
                  <div>
                    <p className="text-sm font-medium">Question Number: {grievance.questionNumber}</p>
                  </div>
                )}
                {grievance.submission.marks !== null && (
                  <div>
                    <p className="text-sm font-medium">Submission Marks: {grievance.submission.marks}</p>
                  </div>
                )}
                {grievance.submission.feedback && (
                  <div>
                    <p className="text-sm font-medium mb-2">Original Feedback:</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {grievance.submission.feedback}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="font-headline">Your Response</CardTitle>
              <CardDescription>Compose a reply to the student.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Type your detailed response here..."
                className="min-h-[150px]"
                value={response}
                onChange={(e) => setResponse(e.target.value)}
              />
              <div className="flex justify-end">
                <Button onClick={handleSendResponse} disabled={submitting}>
                  <Send className="mr-2 h-4 w-4" />
                  {submitting ? "Sending..." : "Send Reply"}
                </Button>
              </div>
              {grievance.instructorResponse && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Previous Response:</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {grievance.instructorResponse}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="lg:sticky lg:top-6">
          <CardHeader>
            <CardTitle className="font-headline">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{grievance.student.user.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Submitted: {formatDate(grievance.createdAt)}</span>
            </div>
            {grievance.reviewedAt && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Reviewed: {formatDate(grievance.reviewedAt)}</span>
              </div>
            )}
            {grievance.resolvedAt && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Resolved: {formatDate(grievance.resolvedAt)}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <span>Type: {formatGrievanceType(grievance.grievanceType)}</span>
            </div>
            {grievance.questionNumber && (
              <div className="flex items-center gap-2">
                <span className="ml-6 font-semibold">Question: {grievance.questionNumber}</span>
              </div>
            )}
            <Separator />
            <div className="flex items-center justify-between">
              <span>Status</span>
              <Badge variant={getStatusVariant(grievance.status)}>
                {grievance.status.replace(/_/g, " ")}
              </Badge>
            </div>
            <Separator />
            <div>
              <p className="font-medium mb-2">Exam</p>
              <p className="text-muted-foreground">{grievance.exam.title}</p>
            </div>
            {grievance.exam.description && (
              <div>
                <p className="font-medium mb-2">Exam Description</p>
                <p className="text-muted-foreground text-xs">{grievance.exam.description}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

