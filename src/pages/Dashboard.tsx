import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
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
    <div className="fusion-card p-5 sm:p-6 hover:shadow-lg transition-all duration-300 group">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Dual Arc Gauge */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative flex-shrink-0 cursor-pointer">
              <svg width="140" height="75" viewBox="0 0 140 75" className="overflow-visible">
                <defs>
                  <linearGradient id={`inner-grad-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="hsl(152, 60%, 40%)" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="hsl(152, 60%, 40%)" stopOpacity="1" />
                  </linearGradient>
                  <linearGradient id={`outer-grad-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="hsl(217, 36%, 46%)" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="hsl(217, 36%, 46%)" stopOpacity="1" />
                  </linearGradient>
                  <filter id={`shadow-${uniqueId}`} x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.15"/>
                  </filter>
                </defs>
                
                {/* Outer arc background */}
                <path
                  d={`M ${centerX - outerRadius} ${centerY} A ${outerRadius} ${outerRadius} 0 0 1 ${centerX + outerRadius} ${centerY}`}
                  fill="none"
                  stroke="hsl(217, 14%, 82%)"
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  opacity="0.5"
                />
                {/* Outer arc foreground */}
                <path
                  d={`M ${centerX - outerRadius} ${centerY} A ${outerRadius} ${outerRadius} 0 0 1 ${centerX + outerRadius} ${centerY}`}
                  fill="none"
                  stroke={`url(#outer-grad-${uniqueId})`}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeDasharray={outerCircumference}
                  strokeDashoffset={outerOffset}
                  filter={`url(#shadow-${uniqueId})`}
                  className="transition-all duration-700 ease-out"
                />
                
                {/* Inner arc background */}
                <path
                  d={`M ${centerX - innerRadius} ${centerY} A ${innerRadius} ${innerRadius} 0 0 1 ${centerX + innerRadius} ${centerY}`}
                  fill="none"
                  stroke="hsl(217, 14%, 82%)"
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  opacity="0.5"
                />
                {/* Inner arc foreground */}
                <path
                  d={`M ${centerX - innerRadius} ${centerY} A ${innerRadius} ${innerRadius} 0 0 1 ${centerX + innerRadius} ${centerY}`}
                  fill="none"
                  stroke={`url(#inner-grad-${uniqueId})`}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeDasharray={innerCircumference}
                  strokeDashoffset={innerOffset}
                  filter={`url(#shadow-${uniqueId})`}
                  className="transition-all duration-700 ease-out"
                />
              </svg>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-2 text-sm">
              <p className="font-semibold">{title}</p>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span>{outerMetric.label}: {outerMetric.displayValue}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-success" />
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
        
        {/* Legend */}
        <div className="flex flex-col gap-3 flex-1 min-w-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2.5 cursor-pointer hover:bg-muted/50 rounded-lg p-1.5 -m-1.5 transition-colors">
                <div className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">{outerMetric.label}</p>
                  <p className="text-base font-bold text-foreground">
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
              <div className="flex items-center gap-2.5 cursor-pointer hover:bg-muted/50 rounded-lg p-1.5 -m-1.5 transition-colors">
                <div className="w-2.5 h-2.5 rounded-full bg-success flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">{innerMetric.label}</p>
                  <p className="text-base font-bold text-foreground">
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
