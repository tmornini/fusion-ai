import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { 
  Sparkles, 
  Home, 
  Lightbulb, 
  FolderKanban, 
  Users, 
  User,
  GripVertical,
  TrendingUp,
  Clock,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  XCircle,
  LayoutGrid,
  BarChart3,
  LogOut,
  Loader2,
  Eye,
  Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Project {
  id: string;
  title: string;
  status: 'approved' | 'under_review' | 'sent_back';
  priorityScore: number;
  estimatedTime: number;
  actualTime: number;
  estimatedCost: number;
  actualCost: number;
  estimatedImpact: number;
  actualImpact: number;
  progress: number;
  priority: number;
}

const mockProjects: Project[] = [
  { id: '1', title: 'AI-Powered Customer Segmentation', status: 'approved', priorityScore: 92, estimatedTime: 120, actualTime: 85, estimatedCost: 45000, actualCost: 38000, estimatedImpact: 85, actualImpact: 78, progress: 72, priority: 1 },
  { id: '2', title: 'Automated Report Generation', status: 'approved', priorityScore: 87, estimatedTime: 80, actualTime: 60, estimatedCost: 32000, actualCost: 28000, estimatedImpact: 78, actualImpact: 82, progress: 85, priority: 2 },
  { id: '3', title: 'Predictive Maintenance System', status: 'under_review', priorityScore: 84, estimatedTime: 200, actualTime: 45, estimatedCost: 75000, actualCost: 18000, estimatedImpact: 90, actualImpact: 0, progress: 22, priority: 3 },
  { id: '4', title: 'Real-time Analytics Dashboard', status: 'approved', priorityScore: 81, estimatedTime: 60, actualTime: 55, estimatedCost: 28000, actualCost: 26000, estimatedImpact: 72, actualImpact: 70, progress: 95, priority: 4 },
  { id: '5', title: 'Smart Inventory Optimization', status: 'sent_back', priorityScore: 78, estimatedTime: 100, actualTime: 30, estimatedCost: 38000, actualCost: 12000, estimatedImpact: 68, actualImpact: 0, progress: 15, priority: 5 },
  { id: '6', title: 'Employee Training Assistant', status: 'under_review', priorityScore: 74, estimatedTime: 90, actualTime: 20, estimatedCost: 35000, actualCost: 8000, estimatedImpact: 65, actualImpact: 0, progress: 18, priority: 6 },
];

const navItems = [
  { label: 'Home', icon: Home, href: '/dashboard', active: false },
  { label: 'Ideas', icon: Lightbulb, href: '/ideas', active: false },
  { label: 'Projects', icon: FolderKanban, href: '/projects', active: true },
  { label: 'Teams', icon: Users, href: '/teams', active: false },
  { label: 'Account', icon: User, href: '/account', active: false },
];

function ProjectCard({ project, view, onView }: { project: Project; view: 'priority' | 'performance'; onView: (id: string) => void }) {
  const getStatusConfig = (status: Project['status']) => {
    switch (status) {
      case 'approved':
        return { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 border-green-200', label: 'Approved' };
      case 'under_review':
        return { icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', label: 'Under Review' };
      case 'sent_back':
        return { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 border-red-200', label: 'Sent Back' };
    }
  };

  const statusConfig = getStatusConfig(project.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="fusion-card p-5 hover:shadow-lg transition-all group">
      <div className="flex items-start gap-4">
        <div className="text-muted-foreground/50 group-hover:text-muted-foreground transition-colors mt-1 cursor-grab active:cursor-grabbing">
          <GripVertical className="w-5 h-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="font-display font-semibold text-foreground text-lg truncate">
                  {project.title}
                </h3>
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusConfig.bg}`}>
                  <StatusIcon className={`w-3.5 h-3.5 ${statusConfig.color}`} />
                  <span className={statusConfig.color}>{statusConfig.label}</span>
                </div>
              </div>
              {view === 'priority' && (
                <span className="text-xs text-muted-foreground">Priority #{project.priority}</span>
              )}
            </div>
            
            {/* Progress Ring */}
            <div className="flex items-center gap-2">
              <div className="relative w-12 h-12">
                <svg className="w-12 h-12 -rotate-90">
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    className="text-muted"
                  />
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray={`${project.progress * 1.256} 125.6`}
                    className="text-primary"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground">
                  {project.progress}%
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-end justify-between gap-4">
            <div className="grid grid-cols-4 gap-4 flex-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Target className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Score</p>
                  <p className="text-sm font-medium text-foreground">{project.priorityScore}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Impact</p>
                  <p className="text-sm font-medium text-foreground">
                    {project.actualImpact || project.estimatedImpact}
                    {project.actualImpact > 0 && project.actualImpact !== project.estimatedImpact && (
                      <span className={`text-xs ml-1 ${project.actualImpact >= project.estimatedImpact ? 'text-green-600' : 'text-amber-600'}`}>
                        ({project.actualImpact >= project.estimatedImpact ? '+' : ''}{project.actualImpact - project.estimatedImpact})
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Time</p>
                  <p className="text-sm font-medium text-foreground">
                    {project.actualTime}h
                    <span className="text-xs text-muted-foreground ml-1">/ {project.estimatedTime}h</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cost</p>
                  <p className="text-sm font-medium text-foreground">
                    ${(project.actualCost / 1000).toFixed(0)}k
                    <span className="text-xs text-muted-foreground ml-1">/ ${(project.estimatedCost / 1000).toFixed(0)}k</span>
                  </p>
                </div>
              </div>
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onView(project.id)}
              className="gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Eye className="w-4 h-4" />
              View Details
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Projects() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<'priority' | 'performance'>('priority');
  const [projects] = useState<Project[]>(mockProjects);

  const { data: userProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*, companies(*)')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  const companyName = userProfile?.companies?.name || 'Your Company';
  const userName = user?.email?.split('@')[0] || 'User';

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const sortedProjects = [...projects].sort((a, b) => {
    if (view === 'priority') return a.priority - b.priority;
    return b.priorityScore - a.priorityScore;
  });

  const statusCounts = {
    approved: projects.filter(p => p.status === 'approved').length,
    under_review: projects.filter(p => p.status === 'under_review').length,
    sent_back: projects.filter(p => p.status === 'sent_back').length,
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Sidebar */}
      <aside className="w-64 border-r border-border bg-card/50 backdrop-blur-sm fixed left-0 top-0 bottom-0 flex flex-col">
        <div className="flex items-center gap-3 p-6 border-b border-border">
          <div className="w-9 h-9 rounded-lg gradient-hero flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-display font-bold text-foreground">Fusion AI</span>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => navigate(item.href)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                item.active 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{userName}</p>
              <p className="text-xs text-muted-foreground truncate">{companyName}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleSignOut}
            className="w-full justify-start text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">Projects</h1>
            <p className="text-muted-foreground">Track and manage active projects</p>
          </div>
          
          {/* Status Summary */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-600">{statusCounts.approved} Approved</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-600">{statusCounts.under_review} Under Review</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200">
              <XCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium text-red-500">{statusCounts.sent_back} Sent Back</span>
            </div>
          </div>
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
            {sortedProjects.length} projects • Sorted by {view === 'priority' ? 'priority rank' : 'highest score'}
          </span>
        </div>

        {/* Projects Grid */}
        <div className="space-y-4">
          {sortedProjects.map((project) => (
            <ProjectCard 
              key={project.id} 
              project={project} 
              view={view}
              onView={(id) => navigate(`/projects/${id}`)}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
