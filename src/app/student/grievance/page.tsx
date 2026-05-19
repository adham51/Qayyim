"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/page-header";
import { Send } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

interface Submission {
  id: string;
  examId: string;
  exam: {
    id: string;
    title: string;
    description: string | null;
  };
  marks: number | null;
  feedback: string | null;
  gradedAt: Date | null;
  status: string;
}

export default function StudentGrievancePage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    submissionId: "",
    grievanceType: "",
    questionNumber: "",
    description: "",
  });

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
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

      const res = await fetch("/api/v1/student/submissions", {
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
        throw new Error("Failed to fetch submissions");
      }

      const data = await res.json();
      setSubmissions(data.data || []);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      toast({
        title: "Error",
        description: "Failed to load submissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.submissionId || !formData.grievanceType || !formData.description) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (formData.description.length < 50) {
      toast({
        title: "Error",
        description: "Description must be at least 50 characters",
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

      const res = await fetch("/api/v1/grievances", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          questionNumber: formData.questionNumber ? parseInt(formData.questionNumber) : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit grievance");
      }

      toast({
        title: "Success",
        description: "Grievance submitted successfully",
      });
      
      setFormData({
        submissionId: "",
        grievanceType: "",
        questionNumber: "",
        description: "",
      });
      
      router.push("/student/dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit grievance",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
      <PageHeader
        title="Submit a Grievance"
        description="If you believe there is an error in your grading, please fill out this form."
      />

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit}>
            <div className="grid gap-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="exam-selection">Select Exam *</Label>
                  <Select
                    value={formData.submissionId}
                    onValueChange={(value) => setFormData({ ...formData, submissionId: value })}
                  >
                    <SelectTrigger id="exam-selection">
                      <SelectValue placeholder="Choose the relevant exam..." />
                    </SelectTrigger>
                    <SelectContent>
                      {loading ? (
                        <SelectItem value="loading" disabled>Loading...</SelectItem>
                      ) : submissions.length === 0 ? (
                        <SelectItem value="none" disabled>No submissions available</SelectItem>
                      ) : (
                        submissions.map((submission) => (
                          <SelectItem key={submission.id} value={submission.id}>
                            {submission.exam.title} {submission.status === 'PENDING' ? '(Pending Grading)' : '(Graded)'}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="grievance-type">Grievance Type *</Label>
                  <Select
                    value={formData.grievanceType}
                    onValueChange={(value) => setFormData({ ...formData, grievanceType: value })}
                  >
                    <SelectTrigger id="grievance-type">
                      <SelectValue placeholder="Select the type of issue..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SCORE_DISAGREEMENT">Score Disagreement</SelectItem>
                      <SelectItem value="INCORRECT_FEEDBACK">Incorrect Feedback</SelectItem>
                      <SelectItem value="MISSING_ANSWER">Missing Answer</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="question-number">Question Number (Optional)</Label>
                <Input
                  id="question-number"
                  type="number"
                  placeholder="e.g., 5"
                  value={formData.questionNumber}
                  onChange={(e) => setFormData({ ...formData, questionNumber: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="grievance-text">Describe your grievance *</Label>
                <Textarea
                  id="grievance-text"
                  placeholder="Please provide a detailed explanation of the issue (min. 50 characters)."
                  className="min-h-[150px]"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.description.length} / 50 characters minimum
                </p>
              </div>

              <div className="flex justify-end">
                <Button size="lg" type="submit" disabled={submitting}>
                  <Send className="mr-2 h-4 w-4" />
                  {submitting ? "Submitting..." : "Submit Grievance"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

