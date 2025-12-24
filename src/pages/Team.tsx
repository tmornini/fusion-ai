import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users,
  Search,
  Star,
  TrendingUp,
  Award,
  Briefcase,
  ChevronRight,
  Plus,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Zap,
  Brain,
  Target,
  Heart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { DashboardLayout } from '@/components/DashboardLayout';

// Mock team data
const mockTeamMembers = [
  {
    id: '1',
    name: 'Sarah Chen',
    role: 'Project Lead',
    department: 'Operations',
    email: 'sarah.chen@company.com',
    availability: 85,
    performanceScore: 94,
    projectsCompleted: 12,
    currentProjects: 3,
    strengths: ['Strategic Planning', 'Team Leadership', 'Risk Management'],
    teamDimensions: { driver: 78, analytical: 85, expressive: 62, amiable: 70 },
    recentAchievements: ['Led Q4 transformation initiative', 'Mentored 3 new team members'],
    status: 'available',
  },
  {
    id: '2',
    name: 'Mike Thompson',
    role: 'ML Engineer',
    department: 'Engineering',
    email: 'mike.thompson@company.com',
    availability: 60,
    performanceScore: 91,
    projectsCompleted: 8,
    currentProjects: 2,
    strengths: ['Machine Learning', 'Python', 'Data Architecture'],
    teamDimensions: { driver: 55, analytical: 95, expressive: 40, amiable: 58 },
    recentAchievements: ['Improved model accuracy by 15%', 'Published internal ML guidelines'],
    status: 'busy',
  },
  {
    id: '3',
    name: 'Jessica Park',
    role: 'Data Scientist',
    department: 'Analytics',
    email: 'jessica.park@company.com',
    availability: 70,
    performanceScore: 88,
    projectsCompleted: 6,
    currentProjects: 2,
    strengths: ['Statistical Analysis', 'Visualization', 'Predictive Modeling'],
    teamDimensions: { driver: 45, analytical: 92, expressive: 68, amiable: 75 },
    recentAchievements: ['Created customer analytics dashboard', 'Reduced reporting time by 40%'],
    status: 'available',
  },
  {
    id: '4',
    name: 'David Martinez',
    role: 'Backend Developer',
    department: 'Engineering',
    email: 'david.martinez@company.com',
    availability: 40,
    performanceScore: 86,
    projectsCompleted: 10,
    currentProjects: 4,
    strengths: ['API Development', 'Database Design', 'System Integration'],
    teamDimensions: { driver: 70, analytical: 82, expressive: 35, amiable: 55 },
    recentAchievements: ['Built real-time sync system', 'Zero downtime deployment streak'],
    status: 'limited',
  },
  {
    id: '5',
    name: 'Emily Rodriguez',
    role: 'UX Designer',
    department: 'Design',
    email: 'emily.rodriguez@company.com',
    availability: 90,
    performanceScore: 92,
    projectsCompleted: 15,
    currentProjects: 1,
    strengths: ['User Research', 'Prototyping', 'Design Systems'],
    teamDimensions: { driver: 50, analytical: 72, expressive: 88, amiable: 85 },
    recentAchievements: ['Redesigned onboarding flow', 'Increased user satisfaction by 25%'],
    status: 'available',
  },
  {
    id: '6',
    name: 'Alex Kim',
    role: 'Product Manager',
    department: 'Product',
    email: 'alex.kim@company.com',
    availability: 55,
    performanceScore: 89,
    projectsCompleted: 7,
    currentProjects: 3,
    strengths: ['Roadmap Planning', 'Stakeholder Management', 'Agile Methods'],
    teamDimensions: { driver: 85, analytical: 70, expressive: 78, amiable: 65 },
    recentAchievements: ['Launched 2 major features', 'Improved sprint velocity by 20%'],
    status: 'busy',
  },
];

export default function Team() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<string | null>(null);

  const filteredMembers = mockTeamMembers.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getAvailabilityColor = (availability: number) => {
    if (availability >= 70) return 'text-green-600 bg-green-50 border-green-200';
    if (availability >= 40) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-red-500 bg-red-50 border-red-200';
  };

  const getStatusIndicator = (status: string) => {
    switch (status) {
      case 'available': return { color: 'bg-green-500', label: 'Available' };
      case 'busy': return { color: 'bg-amber-500', label: 'Busy' };
      case 'limited': return { color: 'bg-red-500', label: 'Limited' };
      default: return { color: 'bg-muted', label: 'Unknown' };
    }
  };

  const getDimensionIcon = (dimension: string) => {
    switch (dimension) {
      case 'driver': return Target;
      case 'analytical': return Brain;
      case 'expressive': return Zap;
      case 'amiable': return Heart;
      default: return Star;
    }
  };

  const member = selectedMember ? mockTeamMembers.find(m => m.id === selectedMember) : null;

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Team</h1>
          <p className="text-muted-foreground mt-1">
            {mockTeamMembers.length} members • Manage roles, strengths, and availability
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add Member
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, role, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team Members List */}
        <div className="lg:col-span-2 space-y-4">
          {filteredMembers.map((memberItem) => {
            const statusInfo = getStatusIndicator(memberItem.status);
            
            return (
              <div
                key={memberItem.id}
                onClick={() => setSelectedMember(memberItem.id)}
                className={`fusion-card p-5 cursor-pointer transition-all hover:shadow-lg ${
                  selectedMember === memberItem.id ? 'ring-2 ring-primary' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <span className="text-lg font-bold text-primary">
                        {memberItem.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background ${statusInfo.color}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">{memberItem.name}</h3>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getAvailabilityColor(memberItem.availability)}`}>
                        {memberItem.availability}% available
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {memberItem.role} • {memberItem.department}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-3">
                      {memberItem.strengths.slice(0, 3).map((strength, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50 text-xs text-muted-foreground">
                          <Star className="w-3 h-3 text-amber-500" />
                          {strength}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                        <span>{memberItem.performanceScore}% performance</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5" />
                        <span>{memberItem.currentProjects} active projects</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-primary" />
                        <span>{memberItem.projectsCompleted} completed</span>
                      </div>
                    </div>
                  </div>

                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Member Detail Panel */}
        <div className="lg:col-span-1">
          {member ? (
            <div className="fusion-card p-6 sticky top-24">
              <div className="text-center mb-6">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary">
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <h3 className="text-lg font-display font-semibold text-foreground">{member.name}</h3>
                <p className="text-sm text-muted-foreground">{member.role}</p>
                <p className="text-xs text-muted-foreground">{member.email}</p>
              </div>

              <Tabs defaultValue="dimensions" className="w-full">
                <TabsList className="w-full mb-4">
                  <TabsTrigger value="dimensions" className="flex-1 text-xs">Dimensions</TabsTrigger>
                  <TabsTrigger value="performance" className="flex-1 text-xs">Performance</TabsTrigger>
                </TabsList>

                <TabsContent value="dimensions" className="space-y-4">
                  <p className="text-xs text-muted-foreground text-center">
                    Team Dimensions Assessment Results
                  </p>
                  {Object.entries(member.teamDimensions).map(([key, value]) => {
                    const Icon = getDimensionIcon(key);
                    return (
                      <div key={key} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium text-foreground capitalize">{key}</span>
                          </div>
                          <span className="text-sm font-bold text-primary">{value}%</span>
                        </div>
                        <Progress value={value} className="h-2" />
                      </div>
                    );
                  })}
                </TabsContent>

                <TabsContent value="performance" className="space-y-4">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 text-center">
                    <BarChart3 className="w-8 h-8 text-primary mx-auto mb-2" />
                    <div className="text-3xl font-bold text-primary">{member.performanceScore}%</div>
                    <p className="text-xs text-muted-foreground">Overall Performance Score</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-muted/30 text-center">
                      <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto mb-1" />
                      <div className="text-lg font-bold text-foreground">{member.projectsCompleted}</div>
                      <p className="text-xs text-muted-foreground">Completed</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30 text-center">
                      <AlertCircle className="w-5 h-5 text-amber-600 mx-auto mb-1" />
                      <div className="text-lg font-bold text-foreground">{member.currentProjects}</div>
                      <p className="text-xs text-muted-foreground">Active</p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="fusion-card p-6 text-center">
              <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">Select a team member to view details</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
