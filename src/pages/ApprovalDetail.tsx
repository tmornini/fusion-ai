import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  AlertTriangle, 
  TrendingUp, 
  Clock, 
  User,
  Calendar,
  Target,
  Lightbulb,
  CheckCircle,
  XCircle,
  MessageSquare,
  FileText,
  DollarSign,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface IdeaDetail {
  id: string;
  title: string;
  description: string;
  submittedBy: string;
  submittedAt: string;
  priority: "high" | "medium" | "low";
  score: number;
  category: string;
  impact: {
    level: string;
    description: string;
  };
  effort: {
    level: string;
    timeEstimate: string;
    teamSize: string;
  };
  cost: {
    estimate: string;
    breakdown: string;
  };
  risks: Array<{
    title: string;
    severity: "high" | "medium" | "low";
    mitigation: string;
  }>;
  assumptions: string[];
  alignments: string[];
  attachments: number;
  comments: number;
}

const mockIdea: IdeaDetail = {
  id: "1",
  title: "AI-Powered Customer Support Chatbot",
  description: "Implement an intelligent chatbot using GPT-4 to handle tier-1 customer support inquiries. The system would integrate with our existing helpdesk platform and learn from historical ticket data to provide accurate, context-aware responses.",
  submittedBy: "Sarah Chen",
  submittedAt: "January 15, 2024",
  priority: "high",
  score: 87,
  category: "Customer Experience",
  impact: {
    level: "High",
    description: "Expected to reduce support ticket volume by 40% and improve first-response time from 4 hours to under 1 minute for common inquiries."
  },
  effort: {
    level: "Medium",
    timeEstimate: "3-4 months",
    teamSize: "4-5 engineers"
  },
  cost: {
    estimate: "$120,000 - $150,000",
    breakdown: "Development: $80K, API costs: $20K/year, Training: $10K"
  },
  risks: [
    {
      title: "AI response accuracy",
      severity: "high",
      mitigation: "Implement human escalation for low-confidence responses and continuous training loop"
    },
    {
      title: "Integration complexity",
      severity: "medium",
      mitigation: "Phase rollout starting with FAQ-only queries before expanding scope"
    },
    {
      title: "Customer acceptance",
      severity: "low",
      mitigation: "Clear bot identification and easy handoff to human agents"
    }
  ],
  assumptions: [
    "Current helpdesk API supports required integrations",
    "Historical ticket data is clean and categorizable",
    "Legal has approved AI usage for customer interactions"
  ],
  alignments: [
    "Q1 OKR: Improve customer satisfaction score by 15%",
    "Digital transformation initiative",
    "Cost optimization program"
  ],
  attachments: 3,
  comments: 7
};

const severityConfig = {
  high: { className: "bg-destructive/10 text-destructive border-destructive/20" },
  medium: { className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  low: { className: "bg-muted text-muted-foreground border-border" }
};

export default function ApprovalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showClarificationDialog, setShowClarificationDialog] = useState(false);
  const [feedback, setFeedback] = useState("");

  const handleApprove = () => {
    toast.success("Idea approved successfully", {
      description: "The submitter has been notified and the idea is moving to project planning."
    });
    navigate("/review");
  };

  const handleReject = () => {
    toast.info("Idea sent back for revision", {
      description: "The submitter has been notified with your feedback."
    });
    setShowRejectDialog(false);
    navigate("/review");
  };

  const handleRequestClarification = () => {
    toast.info("Clarification requested", {
      description: "The submitter has been notified to provide additional information."
    });
    setShowClarificationDialog(false);
  };

  const idea = mockIdea;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link to="/review">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div>
                <p className="text-sm text-muted-foreground">Reviewing Idea</p>
                <h1 className="text-lg font-bold text-foreground">{idea.title}</h1>
              </div>
            </div>
            <Badge 
              variant="outline" 
              className="bg-destructive/10 text-destructive border-destructive/20"
            >
              High Priority
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32">
        {/* Meta Info */}
        <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground mb-8">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>Submitted by <span className="text-foreground font-medium">{idea.submittedBy}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{idea.submittedAt}</span>
          </div>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            <span>{idea.category}</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>{idea.attachments} attachments</span>
          </div>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span>{idea.comments} comments</span>
          </div>
        </div>

        {/* Score Banner */}
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20 mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Innovation Score</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-primary">{idea.score}</span>
                  <span className="text-muted-foreground">/100</span>
                </div>
              </div>
              <div className="flex gap-8">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Impact</p>
                  <p className="text-xl font-semibold text-foreground">{idea.impact.level}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Effort</p>
                  <p className="text-xl font-semibold text-foreground">{idea.effort.level}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Timeline</p>
                  <p className="text-xl font-semibold text-foreground">{idea.effort.timeEstimate}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        <Card className="bg-card border-border mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lightbulb className="h-5 w-5 text-primary" />
              Idea Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground leading-relaxed">{idea.description}</p>
          </CardContent>
        </Card>

        {/* Impact & Effort */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                Expected Impact
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground">{idea.impact.description}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5 text-amber-600" />
                Effort Required
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Timeline</span>
                <span className="text-foreground font-medium">{idea.effort.timeEstimate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Team Size</span>
                <span className="text-foreground font-medium">{idea.effort.teamSize}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cost */}
        <Card className="bg-card border-border mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5 text-primary" />
              Cost Estimate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground mb-2">{idea.cost.estimate}</p>
            <p className="text-sm text-muted-foreground">{idea.cost.breakdown}</p>
          </CardContent>
        </Card>

        {/* Risks */}
        <Card className="bg-card border-border mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Identified Risks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {idea.risks.map((risk, index) => (
              <div key={index} className="p-4 rounded-lg bg-muted/30 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-foreground">{risk.title}</h4>
                  <Badge variant="outline" className={severityConfig[risk.severity].className}>
                    {risk.severity} risk
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Mitigation:</span> {risk.mitigation}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Assumptions */}
        <Card className="bg-card border-border mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Key Assumptions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {idea.assumptions.map((assumption, index) => (
                <li key={index} className="flex items-start gap-2 text-foreground">
                  <span className="text-primary mt-1">•</span>
                  {assumption}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Strategic Alignment */}
        <Card className="bg-card border-border mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-primary" />
              Strategic Alignment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {idea.alignments.map((alignment, index) => (
                <Badge key={index} variant="secondary" className="bg-primary/10 text-primary border-0">
                  {alignment}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Fixed Decision Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <Button 
              variant="outline" 
              onClick={() => setShowClarificationDialog(true)}
              className="gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              Request Clarification
            </Button>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowRejectDialog(true)}
                className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <XCircle className="h-4 w-4" />
                Send Back
              </Button>
              <Button 
                onClick={handleApprove}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle className="h-4 w-4" />
                Approve Idea
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Back for Revision</DialogTitle>
            <DialogDescription>
              Provide feedback to help the submitter improve their idea.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Explain what changes or additional information is needed..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="min-h-[120px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleReject} variant="destructive">
              Send Back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clarification Dialog */}
      <Dialog open={showClarificationDialog} onOpenChange={setShowClarificationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Clarification</DialogTitle>
            <DialogDescription>
              Ask the submitter for additional details before making a decision.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="What additional information do you need?"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="min-h-[120px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClarificationDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRequestClarification}>
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
