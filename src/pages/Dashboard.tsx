import { useNavigate } from 'react-router-dom';
import { 
  Lightbulb, 
  FolderKanban, 
  Users,
  TrendingUp
} from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';

interface GaugeProps {
  value: number;
  max: number;
  label: string;
  subLabel: string;
  color: string;
  size?: 'sm' | 'lg';
}

function Gauge({ value, max, label, subLabel, color, size = 'sm' }: GaugeProps) {
  const percentage = Math.min((value / max) * 100, 100);
  const strokeWidth = size === 'lg' ? 12 : 8;
  const radius = size === 'lg' ? 60 : 45;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: radius * 2 + 20, height: radius + 30 }}>
        <svg 
          width={radius * 2 + 20} 
          height={radius + 30} 
          className="overflow-visible"
        >
          {/* Background arc */}
          <path
            d={`M ${10} ${radius + 10} A ${radius} ${radius} 0 0 1 ${radius * 2 + 10} ${radius + 10}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted/30"
            strokeLinecap="round"
          />
          {/* Foreground arc */}
          <path
            d={`M ${10} ${radius + 10} A ${radius} ${radius} 0 0 1 ${radius * 2 + 10} ${radius + 10}`}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
          />
        </svg>
        {/* Center circle with value */}
        <div 
          className="absolute flex items-center justify-center rounded-full"
          style={{ 
            width: radius * 1.1, 
            height: radius * 1.1, 
            backgroundColor: color,
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -30%)'
          }}
        >
          <span className="text-white font-bold text-sm sm:text-base">
            {value.toLocaleString()}
          </span>
        </div>
      </div>
      <div className="text-center mt-2">
        <p className="text-xs sm:text-sm font-medium" style={{ color }}>{label}</p>
        <p className="text-xs sm:text-sm text-muted-foreground">{subLabel}</p>
      </div>
    </div>
  );
}

interface MetricGaugeCardProps {
  leftGauge: {
    value: number;
    max: number;
    label: string;
    subLabel: string;
    color: string;
  };
  rightGauge: {
    value: number;
    max: number;
    label: string;
    subLabel: string;
    color: string;
  };
}

function MetricGaugeCard({ leftGauge, rightGauge }: MetricGaugeCardProps) {
  return (
    <div className="rounded-2xl p-6 sm:p-8" style={{ backgroundColor: 'hsl(232, 70%, 25%)' }}>
      <div className="flex justify-around items-end gap-4">
        <Gauge {...leftGauge} />
        <Gauge {...rightGauge} />
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <MetricGaugeCard
          leftGauge={{
            value: 25000,
            max: 300000,
            label: "Return on Investment",
            subLabel: "25,000",
            color: "#22c55e"
          }}
          rightGauge={{
            value: 275000,
            max: 300000,
            label: "Investment",
            subLabel: "300,000",
            color: "#ea580c"
          }}
        />
        <MetricGaugeCard
          leftGauge={{
            value: 12,
            max: 270,
            label: "Elapsed Time",
            subLabel: "12 days",
            color: "#38bdf8"
          }}
          rightGauge={{
            value: 258,
            max: 270,
            label: "Project Time",
            subLabel: "270 days",
            color: "#22c55e"
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
