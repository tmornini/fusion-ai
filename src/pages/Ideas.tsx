import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Plus,
  Wand2,
  GripVertical,
  TrendingUp,
  Clock,
  DollarSign,
  Star,
  LayoutGrid,
  BarChart3,
  Eye,
  ClipboardCheck,
  ChevronRight,
  ArrowRight,
  Lightbulb
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Badge } from '@/components/ui/badge';

interface Idea {
  id: string;
  title: string;
  score: number;
  estimatedImpact: number;
  estimatedTime: number;
  estimatedCost: number;
  priority: number;
  status: 'draft' | 'scored' | 'pending_review' | 'approved' | 'rejected';
  submittedBy: string;
}

const mockIdeas: Idea[] = [
  { id: '1', title: 'AI-Powered Customer Segmentation', score: 92, estimatedImpact: 85, estimatedTime: 120, estimatedCost: 45000, priority: 1, status: 'pending_review', submittedBy: 'Sarah Chen' },
  { id: '2', title: 'Automated Report Generation', score: 87, estimatedImpact: 78, estimatedTime: 80, estimatedCost: 32000, priority: 2, status: 'approved', submittedBy: 'Mike Thompson' },
  { id: '3', title: 'Predictive Maintenance System', score: 84, estimatedImpact: 90, estimatedTime: 200, estimatedCost: 75000, priority: 3, status: 'scored', submittedBy: 'Emily Rodriguez' },
  { id: '4', title: 'Real-time Analytics Dashboard', score: 81, estimatedImpact: 72, estimatedTime: 60, estimatedCost: 28000, priority: 4, status: 'pending_review', submittedBy: 'David Kim' },
  { id: '5', title: 'Smart Inventory Optimization', score: 78, estimatedImpact: 68, estimatedTime: 100, estimatedCost: 38000, priority: 5, status: 'draft', submittedBy: 'Lisa Wang' },
  { id: '6', title: 'Employee Training Assistant', score: 74, estimatedImpact: 65, estimatedTime: 90, estimatedCost: 35000, priority: 6, status: 'rejected', submittedBy: 'Jessica Park' },
];

const statusConfig = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  scored: { label: 'Scored', className: 'bg-primary/10 text-primary' },
  pending_review: { label: 'Pending Review', className: 'bg-amber-500/10 text-amber-600' },
  approved: { label: 'Approved', className: 'bg-emerald-500/10 text-emerald-600' },
  rejected: { label: 'Sent Back', className: 'bg-destructive/10 text-destructive' },
};

function IdeaCard({ idea, view, onScore, onReview }: { 
  idea: Idea; 
  view: 'priority' | 'performance'; 
  onScore: (id: string) => void;
  onReview: (id: string) => void;
}) {
  const navigate = useNavigate();
  
  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-600 bg-emerald-50';
    if (score >= 70) return 'text-amber-600 bg-amber-50';
    return 'text-destructive bg-destructive/10';
  };

  const canReview = idea.status === 'pending_review';
  const canConvert = idea.status === 'approved';

  return (
    <div 
      className="fusion-card p-5 hover:shadow-lg transition-all group cursor-pointer"
      onClick={() => onScore(idea.id)}
    >
      <div className="flex items-start gap-4">
        <div className="text-muted-foreground/50 group-hover:text-muted-foreground transition-colors mt-1 cursor-grab active:cursor-grabbing">
          <GripVertical className="w-5 h-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="font-display font-semibold text-foreground text-lg truncate group-hover:text-primary transition-colors">
                  {idea.title}
                </h3>
                <Badge variant="outline" className={statusConfig[idea.status].className}>
                  {statusConfig[idea.status].label}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {view === 'priority' && <span>Priority #{idea.priority}</span>}
                <span>•</span>
                <span>by {idea.submittedBy}</span>
              </div>
            </div>
            <div className={`px-3 py-1.5 rounded-lg font-semibold text-sm ${getScoreColor(idea.score)}`}>
              <Star className="w-3.5 h-3.5 inline mr-1" />
              {idea.score}
            </div>
          </div>

          <div className="flex items-end justify-between gap-4">
            <div className="grid grid-cols-3 gap-4 flex-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Impact</p>
                  <p className="text-sm font-medium text-foreground">{idea.estimatedImpact}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Time</p>
                  <p className="text-sm font-medium text-foreground">{idea.estimatedTime}h</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cost</p>
                  <p className="text-sm font-medium text-foreground">${(idea.estimatedCost / 1000).toFixed(0)}k</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onScore(idea.id)}
                className="gap-2"
              >
                <Eye className="w-4 h-4" />
                View
              </Button>
              {canReview && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onReview(idea.id)}
                  className="gap-2 border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  Review
                </Button>
              )}
              {canConvert && (
                <Button 
                  size="sm" 
                  onClick={() => navigate(`/ideas/${idea.id}/convert`)}
                  className="gap-2"
                >
                  <ArrowRight className="w-4 h-4" />
                  Convert
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Ideas() {
  const navigate = useNavigate();
  const [view, setView] = useState<'priority' | 'performance'>('priority');
  const [ideas] = useState<Idea[]>(mockIdeas);

  const sortedIdeas = [...ideas].sort((a, b) => {
    if (view === 'priority') return a.priority - b.priority;
    return b.score - a.score;
  });

  const pendingReviewCount = ideas.filter(i => i.status === 'pending_review').length;

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">Ideas</h1>
          <p className="text-muted-foreground">Explore and prioritize innovation opportunities</p>
        </div>
        <div className="flex items-center gap-3">
          {pendingReviewCount > 0 && (
            <Button 
              variant="outline" 
              className="gap-2 border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
              onClick={() => navigate('/review')}
            >
              <ClipboardCheck className="w-4 h-4" />
              Review Queue ({pendingReviewCount})
            </Button>
          )}
          <Button variant="hero" className="gap-2" onClick={() => navigate('/ideas/new')}>
            <Plus className="w-4 h-4" />
            Create or Generate Idea
            <Wand2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Flow Indicator */}
      <div className="flex items-center gap-2 mb-6 p-3 rounded-lg bg-muted/30 border border-border">
        <Lightbulb className="w-4 h-4 text-primary" />
        <span className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Idea Flow:</span>
          {' '}Create → Score & Prioritize → Review & Approve → Convert to Project
        </span>
        <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-2 mb-6">
        <div className="inline-flex rounded-lg border border-border p-1 bg-muted/50">
          <button
            onClick={() => setView('priority')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              view === 'priority'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            Priority View
          </button>
          <button
            onClick={() => setView('performance')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              view === 'performance'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Performance View
          </button>
        </div>
        <span className="text-sm text-muted-foreground ml-4">
          {sortedIdeas.length} ideas • Sorted by {view === 'priority' ? 'priority rank' : 'highest score'}
        </span>
      </div>

      {/* Ideas Grid */}
      <div className="space-y-4">
        {sortedIdeas.map((idea) => (
          <IdeaCard 
            key={idea.id} 
            idea={idea} 
            view={view} 
            onScore={(id) => navigate(`/ideas/${id}/score`)}
            onReview={(id) => navigate(`/review/${id}`)}
          />
        ))}
      </div>

      {/* Empty State */}
      {sortedIdeas.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Lightbulb className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No ideas yet</h3>
          <p className="text-muted-foreground mb-6">Start by creating your first idea or generating one with AI</p>
          <Button variant="hero" onClick={() => navigate('/ideas/new')}>
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Idea
          </Button>
        </div>
      )}
    </DashboardLayout>
  );
}
