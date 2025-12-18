import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { 
  Sparkles, 
  Home, 
  Lightbulb, 
  FolderKanban, 
  Users, 
  User,
  Clock,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MetricCardProps {
  title: string;
  estimated: string;
  actual: string;
  variance: number;
  icon: React.ReactNode;
  unit: string;
}

function MetricCard({ title, estimated, actual, variance, icon, unit }: MetricCardProps) {
  const isPositive = variance >= 0;
  
  return (
    <div className="fusion-card p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          {icon}
        </div>
        <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
          {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
          {Math.abs(variance)}%
        </div>
      </div>
      <h3 className="text-lg font-display font-semibold text-foreground mb-4">{title}</h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Estimated</span>
          <span className="text-sm font-medium text-foreground">{estimated} {unit}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Actual</span>
          <span className="text-sm font-medium text-foreground">{actual} {unit}</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all ${isPositive ? 'bg-green-500' : 'bg-red-500'}`}
            style={{ width: `${Math.min(100, (parseFloat(actual) / parseFloat(estimated)) * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

const navItems = [
  { label: 'Home', icon: Home, href: '/dashboard', active: true },
  { label: 'Ideas', icon: Lightbulb, href: '/ideas' },
  { label: 'Projects', icon: FolderKanban, href: '/projects' },
  { label: 'Teams', icon: Users, href: '/teams' },
  { label: 'Account', icon: User, href: '/account' },
];

export default function Dashboard() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

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

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (userProfile && !userProfile.onboarding_completed) {
      navigate('/onboarding');
    }
  }, [userProfile, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const companyName = userProfile?.companies?.name || 'Your Company';
  const userName = user?.email?.split('@')[0] || 'User';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg gradient-hero flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-display font-bold text-foreground">Fusion AI</span>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => item.href === '/dashboard' ? null : null}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    item.active 
                      ? 'bg-primary/10 text-primary' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
            </nav>

            {/* Account */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-foreground">{userName}</p>
                <p className="text-xs text-muted-foreground">{companyName}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleSignOut}
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">
            Welcome back, {userName}
          </h1>
          <p className="text-muted-foreground">
            Here's an overview of your work in progress at {companyName}
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <MetricCard
            title="Estimated vs Actual Time"
            estimated="120"
            actual="98"
            variance={18}
            icon={<Clock className="w-6 h-6 text-primary" />}
            unit="hours"
          />
          <MetricCard
            title="Estimated vs Actual Cost"
            estimated="45,000"
            actual="42,300"
            variance={6}
            icon={<DollarSign className="w-6 h-6 text-primary" />}
            unit="USD"
          />
          <MetricCard
            title="Estimated vs Actual Impact"
            estimated="85"
            actual="92"
            variance={8}
            icon={<TrendingUp className="w-6 h-6 text-primary" />}
            unit="score"
          />
        </div>

        {/* Quick Actions */}
        <div className="fusion-card p-6">
          <h2 className="text-lg font-display font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'New Idea', icon: Lightbulb },
              { label: 'Create Project', icon: FolderKanban },
              { label: 'Invite Team', icon: Users },
              { label: 'View Reports', icon: TrendingUp },
            ].map((action) => (
              <button
                key={action.label}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <action.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <span className="text-sm font-medium text-foreground">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}