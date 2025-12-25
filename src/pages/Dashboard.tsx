import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { 
  Lightbulb, 
  FolderKanban, 
  Users,
  TrendingUp,
  DollarSign,
  Clock,
  Zap,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight
} from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Custom hook for animated counting
function useCountUp(end: number, duration: number = 1500, delay: number = 0) {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const animate = (timestamp: number) => {
        if (!startTimeRef.current) startTimeRef.current = timestamp;
        const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
        
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        countRef.current = Math.floor(easeOutQuart * end);
        setCount(countRef.current);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setCount(end);
        }
      };
      requestAnimationFrame(animate);
    }, delay);

    return () => clearTimeout(timeout);
  }, [end, duration, delay]);

  return count;
}

interface DualGaugeMetric {
  value: number;
  max: number;
  label: string;
  displayValue: string;
  tooltipDetail?: string;
}

interface DualGaugeCardProps {
  title: string;
  icon: React.ReactNode;
  innerMetric: DualGaugeMetric;
  outerMetric: DualGaugeMetric;
  animationDelay?: number;
}

function DualGaugeCard({ title, icon, innerMetric, outerMetric, animationDelay = 0 }: DualGaugeCardProps) {
  const animatedInner = useCountUp(innerMetric.value, 1500, animationDelay);
  const animatedOuter = useCountUp(outerMetric.value, 1500, animationDelay + 200);
  
  const innerPercentage = Math.min((animatedInner / innerMetric.max) * 100, 100);
  const outerPercentage = Math.min((animatedOuter / outerMetric.max) * 100, 100);
  
  const innerRadius = 36;
  const outerRadius = 52;
  const strokeWidth = 10;
  const centerX = 70;
  const centerY = 65;
  
  const innerCircumference = Math.PI * innerRadius;
  const outerCircumference = Math.PI * outerRadius;
  
  const innerOffset = innerCircumference - (innerPercentage / 100) * innerCircumference;
  const outerOffset = outerCircumference - (outerPercentage / 100) * outerCircumference;

  const formatValue = (value: number, displayValue: string) => {
    if (displayValue.startsWith('$')) {
      if (displayValue.includes('K')) {
        return `$${(value / 1000).toFixed(value >= 1000 ? 1 : 0)}K`;
      }
      return `$${value.toLocaleString()}`;
    }
    if (displayValue.endsWith('%')) return `${value}%`;
    if (displayValue.endsWith('d')) return `${value}d`;
    return value.toLocaleString();
  };

  const uniqueId = title.replace(/\s+/g, '-').toLowerCase();

  return (
    <div className="relative overflow-hidden fusion-card p-6 sm:p-8 hover:shadow-xl transition-all duration-300 group border-2 border-transparent hover:border-primary/20">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-accent/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative z-10">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow duration-300">
            {icon}
          </div>
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
        </div>
        
        <div className="flex items-center gap-6">
          {/* Dual Arc Gauge - Larger */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="relative flex-shrink-0 cursor-pointer">
                <svg width="160" height="85" viewBox="0 0 160 85" className="overflow-visible">
                  <defs>
                    <linearGradient id={`inner-grad-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity="1" />
                    </linearGradient>
                    <linearGradient id={`outer-grad-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="1" />
                    </linearGradient>
                    <filter id={`glow-${uniqueId}`} x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                    <filter id={`shadow-${uniqueId}`} x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.2"/>
                    </filter>
                  </defs>
                  
                  {/* Outer arc background */}
                  <path
                    d={`M ${80 - 58} ${75} A 58 58 0 0 1 ${80 + 58} ${75}`}
                    fill="none"
                    stroke="hsl(var(--muted))"
                    strokeWidth={12}
                    strokeLinecap="round"
                    opacity="0.4"
                  />
                  {/* Outer arc foreground */}
                  <path
                    d={`M ${80 - 58} ${75} A 58 58 0 0 1 ${80 + 58} ${75}`}
                    fill="none"
                    stroke={`url(#outer-grad-${uniqueId})`}
                    strokeWidth={12}
                    strokeLinecap="round"
                    strokeDasharray={Math.PI * 58}
                    strokeDashoffset={Math.PI * 58 - (outerPercentage / 100) * Math.PI * 58}
                    filter={`url(#shadow-${uniqueId})`}
                    className="transition-all duration-700 ease-out group-hover:filter-none"
                    style={{ filter: `url(#glow-${uniqueId})` }}
                  />
                  
                  {/* Inner arc background */}
                  <path
                    d={`M ${80 - 40} ${75} A 40 40 0 0 1 ${80 + 40} ${75}`}
                    fill="none"
                    stroke="hsl(var(--muted))"
                    strokeWidth={12}
                    strokeLinecap="round"
                    opacity="0.4"
                  />
                  {/* Inner arc foreground */}
                  <path
                    d={`M ${80 - 40} ${75} A 40 40 0 0 1 ${80 + 40} ${75}`}
                    fill="none"
                    stroke={`url(#inner-grad-${uniqueId})`}
                    strokeWidth={12}
                    strokeLinecap="round"
                    strokeDasharray={Math.PI * 40}
                    strokeDashoffset={Math.PI * 40 - (innerPercentage / 100) * Math.PI * 40}
                    filter={`url(#shadow-${uniqueId})`}
                    className="transition-all duration-700 ease-out"
                    style={{ filter: `url(#glow-${uniqueId})` }}
                  />
                </svg>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <div className="space-y-2 text-sm">
                <p className="font-semibold">{title}</p>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                  <span>{outerMetric.label}: {outerMetric.displayValue}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-success" />
                  <span>{innerMetric.label}: {innerMetric.displayValue}</span>
                </div>
                {(outerMetric.tooltipDetail || innerMetric.tooltipDetail) && (
                  <p className="text-muted-foreground text-xs pt-1 border-t border-border">
                    {outerMetric.tooltipDetail || innerMetric.tooltipDetail}
                  </p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
          
          {/* Legend - Enhanced */}
          <div className="flex flex-col gap-4 flex-1 min-w-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded-xl p-2 -m-2 transition-colors">
                  <div className="w-3 h-3 rounded-full bg-primary flex-shrink-0 shadow-sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium truncate">{outerMetric.label}</p>
                    <p className="text-xl font-bold text-foreground">
                      {formatValue(animatedOuter, outerMetric.displayValue)}
                    </p>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="font-medium">{outerMetric.label}</p>
                <p className="text-muted-foreground text-xs">{outerMetric.tooltipDetail || `${outerMetric.displayValue} of ${outerMetric.max.toLocaleString()} max`}</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded-xl p-2 -m-2 transition-colors">
                  <div className="w-3 h-3 rounded-full bg-success flex-shrink-0 shadow-sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium truncate">{innerMetric.label}</p>
                    <p className="text-xl font-bold text-foreground">
                      {formatValue(animatedInner, innerMetric.displayValue)}
                    </p>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="font-medium">{innerMetric.label}</p>
                <p className="text-muted-foreground text-xs">{innerMetric.tooltipDetail || `${innerMetric.displayValue} of ${innerMetric.max.toLocaleString()} max`}</p>
              </TooltipContent>
            </Tooltip>
          </div>
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
      {/* Welcome Section - Enhanced Hero Card */}
      <div className="relative overflow-hidden fusion-card p-6 sm:p-8 mb-6 sm:mb-8 border-2 border-primary/10">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-transparent to-accent/[0.06]" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-accent/10 to-transparent rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
        
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Greeting */}
            <div className="flex items-start gap-4">
              <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 items-center justify-center shadow-lg">
                <Sparkles className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-primary mb-1">Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}</p>
                <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-2">
                  Welcome back, {userName}
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground max-w-md">
                  Here's an overview of your work in progress at <span className="font-medium text-foreground">{companyName}</span>
                </p>
              </div>
            </div>
            
            {/* Key Stats Summary */}
            <div className="flex flex-wrap gap-3 sm:gap-4">
              {[
                { label: 'Active Ideas', value: 12, icon: Lightbulb, trend: '+3', color: 'bg-warning-soft text-warning-text border-warning-border' },
                { label: 'Projects', value: 5, icon: FolderKanban, trend: '+1', color: 'bg-info-soft text-info-text border-info-border' },
                { label: 'Completed', value: 8, icon: CheckCircle2, trend: null, color: 'bg-success-soft text-success-text border-success-border' },
                { label: 'Pending Review', value: 3, icon: AlertCircle, trend: null, color: 'bg-error-soft text-error-text border-error-border' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className={`relative flex items-center gap-3 px-4 py-3 rounded-xl border ${stat.color} transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-default`}
                >
                  <stat.icon className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-medium opacity-80">{stat.label}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg font-bold">{stat.value}</span>
                      {stat.trend && (
                        <span className="flex items-center text-xs font-medium text-success">
                          <ArrowUpRight className="w-3 h-3" />
                          {stat.trend}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Grid - Dual Gauge Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <DualGaugeCard
          title="Cost Overview"
          icon={<DollarSign className="w-5 h-5 text-primary" />}
          outerMetric={{
            value: 42300,
            max: 50000,
            label: "Budget Spent",
            displayValue: "$42.3K",
            tooltipDetail: "84.6% of total budget utilized"
          }}
          innerMetric={{
            value: 25000,
            max: 50000,
            label: "ROI Generated",
            displayValue: "$25K",
            tooltipDetail: "50% return on investment achieved"
          }}
          animationDelay={0}
        />
        <DualGaugeCard
          title="Time Tracking"
          icon={<Clock className="w-5 h-5 text-primary" />}
          outerMetric={{
            value: 25,
            max: 30,
            label: "Total Duration",
            displayValue: "25d",
            tooltipDetail: "Project timeline: 30 days total"
          }}
          innerMetric={{
            value: 12,
            max: 30,
            label: "Days Elapsed",
            displayValue: "12d",
            tooltipDetail: "40% of timeline completed"
          }}
          animationDelay={150}
        />
        <DualGaugeCard
          title="Project Impact"
          icon={<Zap className="w-5 h-5 text-primary" />}
          outerMetric={{
            value: 92,
            max: 100,
            label: "Target Score",
            displayValue: "92%",
            tooltipDetail: "Goal: 92% impact score"
          }}
          innerMetric={{
            value: 85,
            max: 100,
            label: "Current Score",
            displayValue: "85%",
            tooltipDetail: "7 points below target"
          }}
          animationDelay={300}
        />
      </div>

      {/* Quick Actions */}
      <div className="relative overflow-hidden fusion-card p-6 sm:p-8 border-2 border-dashed border-border/60 hover:border-primary/30 transition-colors">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.02] via-transparent to-accent/[0.02]" />
        <div className="relative z-10">
          <h2 className="text-lg sm:text-xl font-display font-semibold text-foreground mb-5 sm:mb-6">Quick Actions</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {[
              { label: 'New Idea', icon: Lightbulb, href: '/ideas/new', color: 'from-yellow-500/20 to-yellow-600/10' },
              { label: 'Create Project', icon: FolderKanban, href: '/projects', color: 'from-primary/20 to-primary/10' },
              { label: 'Invite Team', icon: Users, href: '/teams', color: 'from-success/20 to-success/10' },
              { label: 'View Reports', icon: TrendingUp, href: '/dashboard', color: 'from-info/20 to-info/10' },
            ].map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.href)}
                className="relative overflow-hidden flex flex-col items-center gap-3 p-5 sm:p-6 rounded-xl border-2 border-border/50 hover:border-primary/40 bg-card hover:bg-card/80 transition-all duration-300 group hover:shadow-lg hover:-translate-y-0.5"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                <div className="relative z-10 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center group-hover:from-primary/15 group-hover:to-primary/5 transition-all duration-300 shadow-sm group-hover:shadow-md">
                  <action.icon className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                </div>
                <span className="relative z-10 text-sm sm:text-base font-semibold text-foreground text-center">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
