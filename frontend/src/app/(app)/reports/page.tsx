"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { DailyReport, DailyReportInput } from "@/lib/types";
import { useCurrentUser } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { PlusCircle, Search, Calendar as CalendarIcon, User as UserIcon, Loader2, Smile, Meh, Frown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getInitials } from "@/lib/utils";

export default function DailyReportsPage() {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [content, setContent] = useState("");
  const [sentiment, setSentiment] = useState<string>("Great");
  const [blockers, setBlockers] = useState("");
  const [nextDayPlan, setNextDayPlan] = useState("");

  const { data: reports, isLoading } = useQuery<DailyReport[]>({
    queryKey: ["daily-reports"],
    queryFn: async () => {
      const res = await api.get("/attendance/reports/");
      return res.data;
    },
  });

  const { data: todayReport } = useQuery<DailyReport>({
    queryKey: ["daily-reports", "today"],
    queryFn: async () => {
      const res = await api.get("/attendance/reports/today/");
      return res.data;
    },
    retry: false, // It will 404 if not submitted
  });

  const submitMutation = useMutation({
    mutationFn: async (data: DailyReportInput) => {
      const res = await api.post("/attendance/reports/", data);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Daily report submitted successfully! 🎉");
      queryClient.invalidateQueries({ queryKey: ["daily-reports"] });
      queryClient.invalidateQueries({ queryKey: ["daily-reports", "today"] });
      setIsSubmitModalOpen(false);
      setContent("");
      setBlockers("");
      setNextDayPlan("");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || "Failed to submit report");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      toast.error("Report content cannot be empty.");
      return;
    }
    submitMutation.mutate({
      content,
      sentiment,
      blockers,
      next_day_plan: nextDayPlan,
    });
  };

  const filteredReports = reports?.filter(r => 
    r.user_full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.content.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const getSentimentIcon = (sent: string) => {
    switch (sent) {
      case "Great": return <Smile className="h-4 w-4 text-green-500" />;
      case "Okay": return <Meh className="h-4 w-4 text-amber-500" />;
      case "Struggling": return <Frown className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  const getSentimentColor = (sent: string) => {
    switch (sent) {
      case "Great": return "bg-green-500/10 text-green-500 border-green-200/20";
      case "Okay": return "bg-amber-500/10 text-amber-500 border-amber-200/20";
      case "Struggling": return "bg-red-500/10 text-red-500 border-red-200/20";
      default: return "";
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Daily Reports</h2>
          <p className="text-muted-foreground mt-1">
            Read team updates and submit your end-of-day summary.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search reports..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Dialog open={isSubmitModalOpen} onOpenChange={setIsSubmitModalOpen}>
            <DialogTrigger asChild>
              <Button disabled={!!todayReport}>
                {todayReport ? "Submitted for Today" : (
                  <>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Submit Report
                  </>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] h-[90vh] overflow-y-auto">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Submit Daily Wrap-Up</DialogTitle>
                  <DialogDescription>
                    Write down what you accomplished today. This will be shared with your managers.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-6">
                  
                  <div className="space-y-2">
                    <Label>How was your day?</Label>
                    <Select value={sentiment} onValueChange={setSentiment}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select sentiment" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Great">
                          <div className="flex items-center">
                            <Smile className="mr-2 h-4 w-4 text-green-500" /> Great & Productive
                          </div>
                        </SelectItem>
                        <SelectItem value="Okay">
                          <div className="flex items-center">
                            <Meh className="mr-2 h-4 w-4 text-amber-500" /> Okay / Average
                          </div>
                        </SelectItem>
                        <SelectItem value="Struggling">
                          <div className="flex items-center">
                            <Frown className="mr-2 h-4 w-4 text-red-500" /> Struggling / Hard Day
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>What did you accomplish today?</Label>
                    <Textarea 
                      placeholder="I closed 2 deals, sent 10 emails, and finished the presentation..."
                      className="min-h-[150px] resize-none"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Any blockers or challenges? (Optional)</Label>
                    <Textarea 
                      placeholder="I am waiting on approval for..."
                      className="min-h-[80px] resize-none"
                      value={blockers}
                      onChange={(e) => setBlockers(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Main focus for tomorrow? (Optional)</Label>
                    <Input 
                      placeholder="Focusing on the XYZ project..."
                      value={nextDayPlan}
                      onChange={(e) => setNextDayPlan(e.target.value)}
                    />
                  </div>

                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsSubmitModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitMutation.isPending}>
                    {submitMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Submit Wrap-Up
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center border rounded-xl bg-card border-dashed">
          <div className="rounded-full bg-muted p-4 mb-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold">No reports found</h3>
          <p className="text-muted-foreground max-w-sm mt-2">
            No one has submitted a daily report yet, or your search didn't match anything.
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {filteredReports.map((report) => (
            <Card key={report.id} className="overflow-hidden">
              <CardHeader className="bg-muted/30 pb-4 border-b">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-border">
                      <AvatarImage src={report.user_avatar} />
                      <AvatarFallback>{getInitials(report.user_full_name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">{report.user_full_name}</CardTitle>
                      <CardDescription className="flex items-center mt-1">
                        <CalendarIcon className="mr-1 h-3 w-3" />
                        {format(new Date(report.date), "EEEE, MMMM do, yyyy")}
                      </CardDescription>
                    </div>
                  </div>
                  {report.sentiment && (
                    <Badge variant="outline" className={getSentimentColor(report.sentiment)}>
                      {getSentimentIcon(report.sentiment)}
                      <span className="ml-1.5">{report.sentiment}</span>
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wider">Accomplishments</h4>
                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                      {report.content}
                    </div>
                  </div>
                  
                  {(report.blockers || report.next_day_plan) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border/50">
                      {report.blockers && (
                        <div className="bg-red-500/5 dark:bg-red-500/10 p-3 rounded-lg border border-red-200/20">
                          <h4 className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1 flex items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5"></span>
                            Blockers / Challenges
                          </h4>
                          <p className="text-sm text-foreground/80">{report.blockers}</p>
                        </div>
                      )}
                      {report.next_day_plan && (
                        <div className="bg-blue-500/5 dark:bg-blue-500/10 p-3 rounded-lg border border-blue-200/20">
                          <h4 className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1 flex items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5"></span>
                            Tomorrow's Focus
                          </h4>
                          <p className="text-sm text-foreground/80">{report.next_day_plan}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
