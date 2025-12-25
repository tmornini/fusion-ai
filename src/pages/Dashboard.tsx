import { useNavigate } from 'react-router-dom';
import { 
  Lightbulb, 
  FolderKanban, 
  Users,
  TrendingUp,
  DollarSign,
  Clock,
  Zap
} from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';

interface RadialGaugeProps {
  value: number;
  max: number;
  label: string;
  displayValue: string;
  color: string;
  gradientId: string;
}

function RadialGauge({ value, max, label, displayValue, color, gradientId }: RadialGaugeProps) {
  const percentage = Math.min((value / max) * 100, 100);
  const radius = 50;
  const strokeWidth = 10;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  return (
    <div className="flex flex-col items-center group">
      <div className="relative w-32 h-20">
        <svg width="128" height="80" viewBox="0 0 128 80" className="overflow-visible">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="1" />
            </linearGradient>
            <filter id={`glow-${gradientId}`}>
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          {/* Background arc */}
          <path
            d="M 14 70 A 50 50 0 0 1 114 70"
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted/20"
            strokeLinecap="round"
          />
          {/* Foreground arc with gradient */}
          <path
            d="M 14 70 A 50 50 0 0 1 114 70"
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            filter={`url(#glow-${gradientId})`}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        {/* Center value */}
        <div className="absolute inset-0 flex items-end justify-center pb-1">
          <span 
            className="text-xl font-bold transition-all duration-300 group-hover:scale-110"
            style={{ color }}
          >
            {displayValue}
          </span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-2 font-medium uppercase tracking-wider">{label}</p>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  icon: React.ReactNode;
  leftGauge: {
    value: number;
    max: number;
    label: string;
    displayValue: string;
    color: string;
    gradientId: string;
  };
  rightGauge: {
    value: number;
    max: number;
    label: string;
    displayValue: string;
    color: string;
    gradientId: string;
  };
}

function MetricCard({ title, icon, leftGauge, rightGauge }: MetricCardProps) {
  return (
    <div className="fusion-card p-5 sm:p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="flex justify-around items-end">
        <RadialGauge {...leftGauge} />
        <RadialGauge {...rightGauge} />
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

      {/* Metrics Grid - Gauge Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <MetricCard
          title="Cost Overview"
          icon={<DollarSign className="w-5 h-5 text-primary" />}
          leftGauge={{
            value: 25000,
            max: 50000,
            label: "ROI",
            displayValue: "$25K",
            color: "#22c55e",
            gradientId: "roi-gradient"
          }}
          rightGauge={{
            value: 42300,
            max: 50000,
            label: "Spent",
            displayValue: "$42.3K",
            color: "#f97316",
            gradientId: "spent-gradient"
          }}
        />
        <MetricCard
          title="Time Tracking"
          icon={<Clock className="w-5 h-5 text-primary" />}
          leftGauge={{
            value: 12,
            max: 30,
            label: "Elapsed",
            displayValue: "12d",
            color: "#38bdf8",
            gradientId: "elapsed-gradient"
          }}
          rightGauge={{
            value: 25,
            max: 30,
            label: "Remaining",
            displayValue: "18d",
            color: "#a78bfa",
            gradientId: "remaining-gradient"
          }}
        />
        <MetricCard
          title="Project Impact"
          icon={<Zap className="w-5 h-5 text-primary" />}
          leftGauge={{
            value: 85,
            max: 100,
            label: "Score",
            displayValue: "85%",
            color: "#10b981",
            gradientId: "score-gradient"
          }}
          rightGauge={{
            value: 92,
            max: 100,
            label: "Target",
            displayValue: "92%",
            color: "#06b6d4",
            gradientId: "target-gradient"
          }}
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
