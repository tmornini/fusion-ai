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
  Plus,
  Wand2,
  GripVertical,
  TrendingUp,
  Clock,
  DollarSign,
  Star,
  LayoutGrid,
  BarChart3,
  LogOut,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Idea {
  id: string;
  title: string;
  score: number;
  estimatedImpact: number;
  estimatedTime: number;
  estimatedCost: number;
  priority: number;
}

const mockIdeas: Idea[] = [
  { id: '1', title: 'AI-Powered Customer Segmentation', score: 92, estimatedImpact: 85, estimatedTime: 120, estimatedCost: 45000, priority: 1 },
  { id: '2', title: 'Automated Report Generation', score: 87, estimatedImpact: 78, estimatedTime: 80, estimatedCost: 32000, priority: 2 },
  { id: '3', title: 'Predictive Maintenance System', score: 84, estimatedImpact: 90, estimatedTime: 200, estimatedCost: 75000, priority: 3 },
  { id: '4', title: 'Real-time Analytics Dashboard', score: 81, estimatedImpact: 72, estimatedTime: 60, estimatedCost: 28000, priority: 4 },
  { id: '5', title: 'Smart Inventory Optimization', score: 78, estimatedImpact: 68, estimatedTime: 100, estimatedCost: 38000, priority: 5 },
  { id: '6', title: 'Employee Training Assistant', score: 74, estimatedImpact: 65, estimatedTime: 90, estimatedCost: 35000, priority: 6 },
];

const navItems = [
  { label: 'Home', icon: Home, href: '/dashboard', active: false },
  { label: 'Ideas', icon: Lightbulb, href: '/ideas', active: true },
  { label: 'Projects', icon: FolderKanban, href: '/projects', active: false },
  { label: 'Teams', icon: Users, href: '/teams', active: false },
  { label: 'Account', icon: User, href: '/account', active: false },
];

function IdeaCard({ idea, view, onScore }: { idea: Idea; view: 'priority' | 'performance'; onScore: (id: string) => void }) {
  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600 bg-green-50';
    if (score >= 70) return 'text-amber-600 bg-amber-50';
    return 'text-red-500 bg-red-50';
  };

  return (
    <div className="fusion-card p-5 hover:shadow-lg transition-all group">
      <div className="flex items-start gap-4">
        <div className="text-muted-foreground/50 group-hover:text-muted-foreground transition-colors mt-1 cursor-grab active:cursor-grabbing">
          <GripVertical className="w-5 h-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="font-display font-semibold text-foreground text-lg mb-1 truncate">
                {idea.title}
              </h3>
              {view === 'priority' && (
                <span className="text-xs text-muted-foreground">Priority #{idea.priority}</span>
              )}
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

            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onScore(idea.id)}
              className="gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <BarChart3 className="w-4 h-4" />
              View Score
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Ideas() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<'priority' | 'performance'>('priority');
  const [ideas] = useState<Idea[]>(mockIdeas);

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

  const sortedIdeas = [...ideas].sort((a, b) => {
    if (view === 'priority') return a.priority - b.priority;
    return b.score - a.score;
  });

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
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">Ideas</h1>
            <p className="text-muted-foreground">Explore and prioritize innovation opportunities</p>
          </div>
          <Button variant="hero" className="gap-2" onClick={() => navigate('/ideas/new')}>
            <Plus className="w-4 h-4" />
            Create or Generate Idea
            <Wand2 className="w-4 h-4" />
          </Button>
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
            />
          ))}
        </div>
      </main>
    </div>
  );
}
