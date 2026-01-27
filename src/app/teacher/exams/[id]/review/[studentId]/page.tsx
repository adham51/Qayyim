"use client";

import React, { useEffect, useState, use } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/page-header";
import { Save, MessageSquareWarning, Loader2, CheckCircle2, XCircle, AlertCircle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function StudentAnswerReviewPage(props: { params: Promise<{ id: string; studentId: string }> }) {
  const params = use(props.params);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adjustedMarks, setAdjustedMarks] = useState<number>(0);
  const [teacherNote, setTeacherNote] = useState<string>("");

  useEffect(() => {
    async function fetchSubmissionData() {
      try {
        const response = await fetch(`/api/v1/teacher/results/${params.id}/${params.studentId}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const result = await response.json();
        if (result.success) {
          setData(result.data);
          setAdjustedMarks(result.data.submission.marks || 0);
        } else {
          setError(result.message);
        }
      } catch (err) {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    }
    fetchSubmissionData();
  }, [params.id, params.studentId]);

  const handleSaveReview = async () => {
    // TODO: Implement save functionality
    console.log("Saving review:", { adjustedMarks, teacherNote });
  };

  if (loading) {
    return (
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
    );
  }

  if (error || !data) {
    return (
        <div className="p-8 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
          <p className="mt-4 text-lg font-medium">{error || "Submission not found"}</p>
        </div>
    );
  }

  const { submission, exam, questionsWithAnswers } = data;

  return (
      <div className="flex flex-1 flex-col gap-6 p-6 bg-slate-50/50 min-h-screen">
        <PageHeader
            title={`Review: ${submission.studentName}`}
            description={`Exam: ${exam.title} • Total: ${adjustedMarks} / ${exam.totalMarks}`}
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {questionsWithAnswers && questionsWithAnswers.length > 0 ? (
                questionsWithAnswers.map((question: any, index: number) => (
                    <Card key={question.questionId} className="border-none shadow-sm overflow-hidden">
                      <CardHeader className="bg-white border-b flex flex-row items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="text-xs font-mono">
                              Q{index + 1}
                            </Badge>
                            <CardTitle className="text-base font-semibold">
                              {question.questionText}
                            </CardTitle>
                          </div>
                        </div>
                        <Badge
                            variant={question.studentGrade > 0 ? "default" : "destructive"}
                            className="text-sm py-1 px-3 shrink-0"
                        >
                          {question.studentGrade > 0 ? (
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                          ) : (
                              <XCircle className="w-3 h-3 mr-1" />
                          )}
                          {question.studentGrade} / {question.questionGrade}
                        </Badge>
                      </CardHeader>

                      <CardContent className="p-0 bg-white">
                        {/* Student Answer */}
                        <div className="p-6 border-b bg-blue-50/30">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                            <Label className="text-xs uppercase font-bold text-blue-700">
                              Student's Answer
                            </Label>
                          </div>
                          <div className="text-slate-800 bg-white p-4 rounded-lg border border-blue-100 font-medium leading-relaxed">
                            {question.studentAnswer}
                          </div>
                        </div>

                        {/* Model Answer */}
                        <div className="p-6 border-b bg-emerald-50/30">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-1 h-4 bg-emerald-500 rounded-full"></div>
                            <Label className="text-xs uppercase font-bold text-emerald-700">
                              Model Answer
                            </Label>
                          </div>
                          <div className="text-slate-800 bg-white p-4 rounded-lg border border-emerald-100 font-medium leading-relaxed">
                            {question.modelAnswer}
                          </div>
                        </div>

                        {/* AI Feedback (if available) */}
                        {question.feedback && (
                            <div className="p-6 bg-amber-50/30">
                              <div className="flex items-center gap-2 mb-3">
                                <Info className="w-4 h-4 text-amber-600" />
                                <Label className="text-xs uppercase font-bold text-amber-700">
                                  AI Feedback
                                </Label>
                              </div>
                              <div className="text-sm text-amber-900 bg-white p-4 rounded-lg border border-amber-100 leading-relaxed">
                                {question.feedback}
                              </div>
                            </div>
                        )}
                      </CardContent>
                    </Card>
                ))
            ) : (
                <Card className="border-none shadow-sm">
                  <CardContent className="p-12 text-center">
                    <AlertCircle className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                    <p className="text-slate-600">No questions found for this exam.</p>
                  </CardContent>
                </Card>
            )}
          </div>

          {/* Sidebar for actions */}
          <div className="space-y-6">
            <Card className="border-none shadow-sm sticky top-6">
              <CardHeader className="bg-gradient-to-br from-indigo-50 to-white border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  Manual Grading
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div className="space-y-2">
                  <Label htmlFor="marks" className="text-sm font-semibold">
                    Adjust Final Score
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                        id="marks"
                        type="number"
                        value={adjustedMarks}
                        onChange={(e) => setAdjustedMarks(Number(e.target.value))}
                        className="font-bold text-lg"
                        min="0"
                        max={exam.totalMarks}
                    />
                    <span className="text-slate-400 font-medium">/ {exam.totalMarks}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="note" className="text-sm font-semibold">
                    Feedback for Student
                  </Label>
                  <Textarea
                      id="note"
                      value={teacherNote}
                      onChange={(e) => setTeacherNote(e.target.value)}
                      placeholder="Add personalized feedback for the student..."
                      className="min-h-[140px] resize-none"
                  />
                </div>

                <Button
                    className="w-full shadow-lg shadow-indigo-200 bg-indigo-600 hover:bg-indigo-700"
                    onClick={handleSaveReview}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Confirm Review
                </Button>
              </CardContent>
            </Card>

            <div className="p-4 bg-amber-50 rounded-lg border border-amber-100 flex gap-3">
              <MessageSquareWarning className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 leading-relaxed">
                <strong>Note:</strong> Saving this review will finalize the grade and notify the student via the dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>
  );
}