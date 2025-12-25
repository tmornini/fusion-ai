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
        
        // Easing function for smooth animation
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
  color: string;
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
  
  const innerRadius = 40;
  const outerRadius = 58;
  const strokeWidth = 12;
  
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

  return (
    <div className="fusion-card p-5 sm:p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      
      <div className="flex items-center gap-6">
        {/* Dual Arc Gauge */}
        <div className="relative flex-shrink-0">
          <svg width="140" height="85" viewBox="0 0 140 85" className="overflow-visible">
            <defs>
              <linearGradient id={`inner-${title}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={innerMetric.color} stopOpacity="0.4" />
                <stop offset="100%" stopColor={innerMetric.color} stopOpacity="1" />
              </linearGradient>
              <linearGradient id={`outer-${title}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={outerMetric.color} stopOpacity="0.4" />
                <stop offset="100%" stopColor={outerMetric.color} stopOpacity="1" />
              </linearGradient>
              <filter id={`glow-inner-${title}`}>
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              <filter id={`glow-outer-${title}`}>
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            {/* Outer arc background */}
            <path
              d={`M ${70 - outerRadius} 75 A ${outerRadius} ${outerRadius} 0 0 1 ${70 + outerRadius} 75`}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-muted/15"
              strokeLinecap="round"
            />
            {/* Outer arc foreground */}
            <path
              d={`M ${70 - outerRadius} 75 A ${outerRadius} ${outerRadius} 0 0 1 ${70 + outerRadius} 75`}
              fill="none"
              stroke={`url(#outer-${title})`}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={outerCircumference}
              strokeDashoffset={outerOffset}
              filter={`url(#glow-outer-${title})`}
            />
            
            {/* Inner arc background */}
            <path
              d={`M ${70 - innerRadius} 75 A ${innerRadius} ${innerRadius} 0 0 1 ${70 + innerRadius} 75`}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-muted/15"
              strokeLinecap="round"
            />
            {/* Inner arc foreground */}
            <path
              d={`M ${70 - innerRadius} 75 A ${innerRadius} ${innerRadius} 0 0 1 ${70 + innerRadius} 75`}
              fill="none"
              stroke={`url(#inner-${title})`}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={innerCircumference}
              strokeDashoffset={innerOffset}
              filter={`url(#glow-inner-${title})`}
            />
          </svg>
        </div>
        
        {/* Legend */}
        <div className="flex flex-col gap-3 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0" 
              style={{ backgroundColor: outerMetric.color }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wide truncate">{outerMetric.label}</p>
              <p className="text-lg font-bold" style={{ color: outerMetric.color }}>
                {formatValue(animatedOuter, outerMetric.displayValue)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0" 
              style={{ backgroundColor: innerMetric.color }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wide truncate">{innerMetric.label}</p>
              <p className="text-lg font-bold" style={{ color: innerMetric.color }}>
                {formatValue(animatedInner, innerMetric.displayValue)}
              </p>
            </div>
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
            label: "Spent",
            displayValue: "$42.3K",
            color: "#f97316"
          }}
          innerMetric={{
            value: 25000,
            max: 50000,
            label: "ROI",
            displayValue: "$25K",
            color: "#22c55e"
          }}
          animationDelay={0}
        />
        <DualGaugeCard
          title="Time Tracking"
          icon={<Clock className="w-5 h-5 text-primary" />}
          outerMetric={{
            value: 25,
            max: 30,
            label: "Remaining",
            displayValue: "18d",
            color: "#a78bfa"
          }}
          innerMetric={{
            value: 12,
            max: 30,
            label: "Elapsed",
            displayValue: "12d",
            color: "#38bdf8"
          }}
          animationDelay={150}
        />
        <DualGaugeCard
          title="Project Impact"
          icon={<Zap className="w-5 h-5 text-primary" />}
          outerMetric={{
            value: 92,
            max: 100,
            label: "Target",
            displayValue: "92%",
            color: "#06b6d4"
          }}
          innerMetric={{
            value: 85,
            max: 100,
            label: "Score",
            displayValue: "85%",
            color: "#10b981"
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
