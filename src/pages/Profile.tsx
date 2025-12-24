import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User,
  Mail,
  Phone,
  Briefcase,
  Bell,
  BellOff,
  Clock,
  Star,
  Target,
  Brain,
  Zap,
  Heart,
  Save,
  CheckCircle2,
  Sparkles,
  Home,
  Lightbulb,
  FolderKanban,
  Users,
  LogOut,
  Database,
  GitBranch,
  Camera,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const navItems = [
  { label: 'Home', icon: Home, href: '/dashboard' },
  { label: 'Ideas', icon: Lightbulb, href: '/ideas' },
  { label: 'Projects', icon: FolderKanban, href: '/projects' },
  { label: 'Teams', icon: Users, href: '/teams' },
  { label: 'Crunch', icon: Database, href: '/crunch' },
  { label: 'Flow', icon: GitBranch, href: '/flow' },
  { label: 'Account', icon: User, href: '/account', active: true },
];

// Mock profile data
const mockProfile = {
  firstName: 'Alex',
  lastName: 'Thompson',
  email: 'alex.thompson@company.com',
  phone: '+1 (555) 123-4567',
  role: 'Product Manager',
  department: 'Product',
  timezone: 'America/New_York',
  bio: 'Passionate about building products that solve real problems. 8+ years in product management.',
  availability: 75,
  workingStyle: {
    driver: 70,
    analytical: 85,
    expressive: 60,
    amiable: 75,
  },
  strengths: ['Strategic Planning', 'Data Analysis', 'Stakeholder Management', 'Agile Methods'],
  notifications: {
    email: true,
    inApp: true,
    projectUpdates: true,
    taskAssignments: true,
    weeklyDigest: true,
    mentions: true,
  },
};

const allStrengths = [
  'Strategic Planning', 'Data Analysis', 'Stakeholder Management', 'Agile Methods',
  'Team Leadership', 'Risk Management', 'Budget Planning', 'Technical Writing',
  'User Research', 'Prototyping', 'Machine Learning', 'API Development',
];

export default function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(mockProfile);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 1500);
  };

  const toggleStrength = (strength: string) => {
    setProfile(prev => ({
      ...prev,
      strengths: prev.strengths.includes(strength)
        ? prev.strengths.filter(s => s !== strength)
        : [...prev.strengths, strength],
    }));
  };

  const updateWorkingStyle = (dimension: string, value: number[]) => {
    setProfile(prev => ({
      ...prev,
      workingStyle: {
        ...prev.workingStyle,
        [dimension]: value[0],
      },
    }));
  };

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
              <p className="text-sm font-medium text-foreground truncate">{profile.firstName} {profile.lastName}</p>
              <p className="text-xs text-muted-foreground truncate">{profile.role}</p>
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
        <div className="max-w-3xl mx-auto">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground mb-2">My Profile</h1>
              <p className="text-muted-foreground">
                Update your personal information and preferences
              </p>
            </div>
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="gap-2"
            >
              {saveSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Saved!
                </>
              ) : isSaving ? (
                'Saving...'
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>

          {/* Profile Photo & Basic Info */}
          <div className="fusion-card p-6 mb-6">
            <h3 className="font-display font-semibold text-foreground mb-4">Personal Information</h3>
            
            <div className="flex items-start gap-6 mb-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <span className="text-3xl font-bold text-primary">
                    {profile.firstName[0]}{profile.lastName[0]}
                  </span>
                </div>
                <button className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors">
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">First Name</label>
                  <Input
                    value={profile.firstName}
                    onChange={(e) => setProfile(prev => ({ ...prev, firstName: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Last Name</label>
                  <Input
                    value={profile.lastName}
                    onChange={(e) => setProfile(prev => ({ ...prev, lastName: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  Email
                </label>
                <Input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  Phone
                </label>
                <Input
                  value={profile.phone}
                  onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-muted-foreground" />
                  Role
                </label>
                <Input
                  value={profile.role}
                  onChange={(e) => setProfile(prev => ({ ...prev, role: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Department</label>
                <Select
                  value={profile.department}
                  onValueChange={(value) => setProfile(prev => ({ ...prev, department: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Product">Product</SelectItem>
                    <SelectItem value="Engineering">Engineering</SelectItem>
                    <SelectItem value="Design">Design</SelectItem>
                    <SelectItem value="Sales">Sales</SelectItem>
                    <SelectItem value="Operations">Operations</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Bio</label>
              <Textarea
                value={profile.bio}
                onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                placeholder="Tell us a bit about yourself..."
                className="resize-none"
                rows={3}
              />
            </div>
          </div>

          {/* Availability & Working Style */}
          <div className="fusion-card p-6 mb-6">
            <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Availability & Working Style
            </h3>
            
            <p className="text-sm text-muted-foreground mb-6">
              This information helps us match you with appropriate tasks and team members.
            </p>

            {/* Availability Slider */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-foreground">Current Availability</label>
                <span className={`text-sm font-bold ${
                  profile.availability >= 70 ? 'text-green-600' :
                  profile.availability >= 40 ? 'text-amber-600' : 'text-red-500'
                }`}>
                  {profile.availability}%
                </span>
              </div>
              <Slider
                value={[profile.availability]}
                onValueChange={(value) => setProfile(prev => ({ ...prev, availability: value[0] }))}
                max={100}
                step={5}
                className="mb-2"
              />
              <p className="text-xs text-muted-foreground">
                How much capacity do you have for new work?
              </p>
            </div>

            {/* Working Style Dimensions */}
            <div className="space-y-6">
              <p className="text-sm font-medium text-foreground">Working Style Dimensions</p>
              
              {[
                { key: 'driver', icon: Target, label: 'Driver', description: 'Results-oriented, decisive, competitive' },
                { key: 'analytical', icon: Brain, label: 'Analytical', description: 'Detail-focused, systematic, thorough' },
                { key: 'expressive', icon: Zap, label: 'Expressive', description: 'Creative, enthusiastic, persuasive' },
                { key: 'amiable', icon: Heart, label: 'Amiable', description: 'Collaborative, supportive, patient' },
              ].map((dimension) => (
                <div key={dimension.key}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <dimension.icon className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">{dimension.label}</span>
                    </div>
                    <span className="text-sm font-bold text-primary">
                      {profile.workingStyle[dimension.key as keyof typeof profile.workingStyle]}%
                    </span>
                  </div>
                  <Slider
                    value={[profile.workingStyle[dimension.key as keyof typeof profile.workingStyle]]}
                    onValueChange={(value) => updateWorkingStyle(dimension.key, value)}
                    max={100}
                    step={5}
                    className="mb-1"
                  />
                  <p className="text-xs text-muted-foreground">{dimension.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Strengths */}
          <div className="fusion-card p-6 mb-6">
            <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-primary" />
              My Strengths
            </h3>
            
            <p className="text-sm text-muted-foreground mb-4">
              Select skills you're confident in. These help match you with relevant tasks.
            </p>

            <div className="flex flex-wrap gap-2">
              {allStrengths.map((strength) => {
                const isSelected = profile.strengths.includes(strength);
                return (
                  <button
                    key={strength}
                    onClick={() => toggleStrength(strength)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                    }`}
                  >
                    {isSelected && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
                    {strength}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="fusion-card p-6">
            <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Notification Preferences
            </h3>
            
            <p className="text-sm text-muted-foreground mb-6">
              Choose how and when you'd like to be notified.
            </p>

            <div className="space-y-4">
              {[
                { key: 'email', label: 'Email Notifications', description: 'Receive notifications via email' },
                { key: 'inApp', label: 'In-App Notifications', description: 'See notifications in the app' },
                { key: 'projectUpdates', label: 'Project Updates', description: 'When projects you follow have updates' },
                { key: 'taskAssignments', label: 'Task Assignments', description: 'When you\'re assigned to a new task' },
                { key: 'mentions', label: 'Mentions', description: 'When someone mentions you in a comment' },
                { key: 'weeklyDigest', label: 'Weekly Digest', description: 'Summary of activity every Monday' },
              ].map((pref) => (
                <div key={pref.key} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-foreground">{pref.label}</p>
                    <p className="text-xs text-muted-foreground">{pref.description}</p>
                  </div>
                  <Switch
                    checked={profile.notifications[pref.key as keyof typeof profile.notifications]}
                    onCheckedChange={(checked) => setProfile(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, [pref.key]: checked },
                    }))}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}