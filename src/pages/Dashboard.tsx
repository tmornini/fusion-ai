import { useNavigate } from 'react-router-dom';
import { 
  Clock,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Lightbulb, 
  FolderKanban, 
  Users
} from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';

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
    <div className="fusion-card p-4 sm:p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          {icon}
        </div>
        <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
          {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
          {Math.abs(variance)}%
        </div>
      </div>
      <h3 className="text-base sm:text-lg font-display font-semibold text-foreground mb-3 sm:mb-4">{title}</h3>
      <div className="space-y-2 sm:space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs sm:text-sm text-muted-foreground">Estimated</span>
          <span className="text-xs sm:text-sm font-medium text-foreground">{estimated} {unit}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs sm:text-sm text-muted-foreground">Actual</span>
          <span className="text-xs sm:text-sm font-medium text-foreground">{actual} {unit}</span>
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

export default function Dashboard() {
  const navigate = useNavigate();
  const userName = 'Demo User';
  const companyName = 'Demo Company';

  return (
    <DashboardLayout userName={userName} companyName={companyName}>
      {/* Welcome Section */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-1 sm:mb-2">
          Welcome back, {userName}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Here's an overview of your work in progress at {companyName}
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <MetricCard
          title="Estimated vs Actual Time"
          estimated="120"
          actual="98"
          variance={18}
          icon={<Clock className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />}
          unit="hours"
        />
        <MetricCard
          title="Estimated vs Actual Cost"
          estimated="45,000"
          actual="42,300"
          variance={6}
          icon={<DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />}
          unit="USD"
        />
        <MetricCard
          title="Estimated vs Actual Impact"
          estimated="85"
          actual="92"
          variance={8}
          icon={<TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />}
          unit="score"
        />
      </div>

      {/* Quick Actions */}
      <div className="fusion-card p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-display font-semibold text-foreground mb-3 sm:mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            { label: 'New Idea', icon: Lightbulb, href: '/ideas/new' },
            { label: 'Create Project', icon: FolderKanban, href: '/projects' },
            { label: 'Invite Team', icon: Users, href: '/teams' },
            { label: 'View Reports', icon: TrendingUp, href: '/dashboard' },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.href)}
              className="flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors group"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <action.icon className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-foreground text-center">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
