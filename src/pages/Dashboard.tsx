import { useNavigate } from 'react-router-dom';
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
  LogOut,
  Database,
  GitBranch
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
  { label: 'Crunch', icon: Database, href: '/crunch' },
  { label: 'Flow', icon: GitBranch, href: '/flow' },
  { label: 'Account', icon: User, href: '/account' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const userName = 'Demo User';
  const companyName = 'Demo Company';

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Sidebar */}
      <aside className="w-64 border-r border-border bg-card/50 backdrop-blur-sm fixed left-0 top-0 bottom-0 flex flex-col">
        {/* Logo */}
        <div className="flex items-center gap-3 p-6 border-b border-border">
          <div className="w-9 h-9 rounded-lg gradient-hero flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-display font-bold text-foreground">Fusion AI</span>
        </div>

        {/* Navigation */}
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

        {/* Account Section */}
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
            onClick={() => navigate('/')}
            className="w-full justify-start text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8">
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
              { label: 'New Idea', icon: Lightbulb, href: '/ideas/new' },
              { label: 'Create Project', icon: FolderKanban, href: '/projects' },
              { label: 'Invite Team', icon: Users, href: '/teams' },
              { label: 'View Reports', icon: TrendingUp, href: '/dashboard' },
            ].map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.href)}
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
