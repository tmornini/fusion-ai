import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users,
  Search,
  Filter,
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
  Heart,
  Sparkles,
  Home,
  Lightbulb,
  FolderKanban,
  User,
  LogOut
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
    teamDimensions: {
      driver: 78,
      analytical: 85,
      expressive: 62,
      amiable: 70,
    },
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
    teamDimensions: {
      driver: 55,
      analytical: 95,
      expressive: 40,
      amiable: 58,
    },
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
    teamDimensions: {
      driver: 45,
      analytical: 92,
      expressive: 68,
      amiable: 75,
    },
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
    teamDimensions: {
      driver: 70,
      analytical: 82,
      expressive: 35,
      amiable: 55,
    },
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
    teamDimensions: {
      driver: 50,
      analytical: 72,
      expressive: 88,
      amiable: 85,
    },
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
    teamDimensions: {
      driver: 85,
      analytical: 70,
      expressive: 78,
      amiable: 65,
    },
    recentAchievements: ['Launched 2 major features', 'Improved sprint velocity by 20%'],
    status: 'busy',
  },
];

const navItems = [
  { label: 'Home', icon: Home, href: '/dashboard' },
  { label: 'Ideas', icon: Lightbulb, href: '/ideas' },
  { label: 'Projects', icon: FolderKanban, href: '/projects' },
  { label: 'Teams', icon: Users, href: '/teams', active: true },
  { label: 'Account', icon: User, href: '/account' },
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
      case 'available':
        return { color: 'bg-green-500', label: 'Available' };
      case 'busy':
        return { color: 'bg-amber-500', label: 'Busy' };
      case 'limited':
        return { color: 'bg-red-500', label: 'Limited' };
      default:
        return { color: 'bg-muted', label: 'Unknown' };
    }
  };

  const getDimensionIcon = (dimension: string) => {
    switch (dimension) {
      case 'driver':
        return Target;
      case 'analytical':
        return Brain;
      case 'expressive':
        return Zap;
      case 'amiable':
        return Heart;
      default:
        return Star;
    }
  };

  const member = selectedMember ? mockTeamMembers.find(m => m.id === selectedMember) : null;

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
              <p className="text-sm font-medium text-foreground truncate">Demo User</p>
              <p className="text-xs text-muted-foreground truncate">Demo Company</p>
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

        {/* Search and Filter */}
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
          <Button variant="outline" size="icon">
            <Filter className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Team Members List */}
          <div className="lg:col-span-2 space-y-4">
            {filteredMembers.map((member) => {
              const statusInfo = getStatusIndicator(member.status);
              
              return (
                <div
                  key={member.id}
                  onClick={() => setSelectedMember(member.id)}
                  className={`fusion-card p-5 cursor-pointer transition-all hover:shadow-lg ${
                    selectedMember === member.id ? 'ring-2 ring-primary' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="relative">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <span className="text-lg font-bold text-primary">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background ${statusInfo.color}`} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground">{member.name}</h3>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getAvailabilityColor(member.availability)}`}>
                          {member.availability}% available
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {member.role} • {member.department}
                      </p>

                      {/* Strengths */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {member.strengths.slice(0, 3).map((strength, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50 text-xs text-muted-foreground"
                          >
                            <Star className="w-3 h-3 text-amber-500" />
                            {strength}
                          </span>
                        ))}
                      </div>

                      {/* Stats Row */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                          <span>{member.performanceScore}% performance</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Briefcase className="w-3.5 h-3.5" />
                          <span>{member.currentProjects} active projects</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Award className="w-3.5 h-3.5 text-primary" />
                          <span>{member.projectsCompleted} completed</span>
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
                {/* Header */}
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
                    
                    <div className="pt-4 border-t border-border">
                      <p className="text-xs text-muted-foreground mb-2">Best suited for:</p>
                      <div className="flex flex-wrap gap-1">
                        {member.teamDimensions.analytical > 80 && (
                          <span className="px-2 py-1 rounded-md bg-blue-50 text-blue-600 text-xs border border-blue-200">Data Analysis</span>
                        )}
                        {member.teamDimensions.driver > 70 && (
                          <span className="px-2 py-1 rounded-md bg-purple-50 text-purple-600 text-xs border border-purple-200">Leadership</span>
                        )}
                        {member.teamDimensions.expressive > 75 && (
                          <span className="px-2 py-1 rounded-md bg-amber-50 text-amber-600 text-xs border border-amber-200">Communication</span>
                        )}
                        {member.teamDimensions.amiable > 75 && (
                          <span className="px-2 py-1 rounded-md bg-green-50 text-green-600 text-xs border border-green-200">Collaboration</span>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="performance" className="space-y-4">
                    {/* Performance Score */}
                    <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 text-center">
                      <BarChart3 className="w-8 h-8 text-primary mx-auto mb-2" />
                      <div className="text-3xl font-bold text-primary">{member.performanceScore}%</div>
                      <p className="text-xs text-muted-foreground">Overall Performance Score</p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-muted/30 text-center">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto mb-1" />
                        <div className="text-lg font-bold text-foreground">{member.projectsCompleted}</div>
                        <p className="text-xs text-muted-foreground">Completed</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/30 text-center">
                        <AlertCircle className="w-5 h-5 text-amber-600 mx-auto mb-1" />
                        <div className="text-lg font-bold text-foreground">{member.currentProjects}</div>
                        <p className="text-xs text-muted-foreground">In Progress</p>
                      </div>
                    </div>

                    {/* Recent Achievements */}
                    <div className="pt-4 border-t border-border">
                      <p className="text-xs text-muted-foreground mb-2">Recent Achievements</p>
                      <div className="space-y-2">
                        {member.recentAchievements.map((achievement, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <Award className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-foreground">{achievement}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                <Button className="w-full mt-6" variant="outline">
                  View Full Profile
                </Button>
              </div>
            ) : (
              <div className="fusion-card p-8 text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium text-foreground mb-2">Select a Team Member</h3>
                <p className="text-sm text-muted-foreground">
                  Click on a team member to view their dimensions, performance, and work history.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
