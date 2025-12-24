import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Home,
  Lightbulb,
  FolderKanban,
  Users,
  User,
  LogOut,
  Database,
  GitBranch,
  Sparkles,
  Bell,
  ArrowLeft,
  Mail,
  Smartphone,
  MessageSquare,
  Star,
  CheckCircle2,
  UserPlus,
  AlertCircle,
  CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

const navItems = [
  { label: 'Home', icon: Home, href: '/dashboard' },
  { label: 'Ideas', icon: Lightbulb, href: '/ideas' },
  { label: 'Projects', icon: FolderKanban, href: '/projects' },
  { label: 'Teams', icon: Users, href: '/teams' },
  { label: 'Crunch', icon: Database, href: '/crunch' },
  { label: 'Flow', icon: GitBranch, href: '/flow' },
  { label: 'Account', icon: User, href: '/account' },
];

interface NotificationPreference {
  id: string;
  label: string;
  description: string;
  email: boolean;
  push: boolean;
}

interface NotificationCategory {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  preferences: NotificationPreference[];
}

const initialCategories: NotificationCategory[] = [
  {
    id: 'ideas',
    label: 'Ideas',
    icon: Lightbulb,
    color: 'bg-amber-100 text-amber-600',
    preferences: [
      { id: 'idea_submitted', label: 'New idea submitted', description: 'When someone submits a new idea', email: true, push: true },
      { id: 'idea_scored', label: 'Idea scored', description: 'When an idea receives an AI score', email: true, push: false },
      { id: 'idea_converted', label: 'Idea converted to project', description: 'When an idea becomes a project', email: true, push: true },
      { id: 'idea_comment', label: 'Comment on your idea', description: 'When someone comments on your idea', email: true, push: true },
    ]
  },
  {
    id: 'projects',
    label: 'Projects',
    icon: FolderKanban,
    color: 'bg-blue-100 text-blue-600',
    preferences: [
      { id: 'project_created', label: 'New project created', description: 'When a new project is started', email: true, push: false },
      { id: 'task_assigned', label: 'Task assigned to you', description: 'When you are assigned a new task', email: true, push: true },
      { id: 'task_completed', label: 'Task completed', description: 'When a task in your project is completed', email: false, push: false },
      { id: 'project_status', label: 'Project status changed', description: 'When a project status is updated', email: true, push: false },
    ]
  },
  {
    id: 'teams',
    label: 'Teams',
    icon: Users,
    color: 'bg-indigo-100 text-indigo-600',
    preferences: [
      { id: 'team_invite', label: 'Team invitation', description: 'When you are invited to join a team', email: true, push: true },
      { id: 'member_joined', label: 'New team member', description: 'When someone joins your team', email: true, push: false },
      { id: 'member_left', label: 'Team member left', description: 'When someone leaves your team', email: true, push: false },
      { id: 'team_mention', label: 'Team mention', description: 'When your team is mentioned', email: false, push: true },
    ]
  },
  {
    id: 'account',
    label: 'Account',
    icon: User,
    color: 'bg-purple-100 text-purple-600',
    preferences: [
      { id: 'security_alert', label: 'Security alerts', description: 'Important security notifications', email: true, push: true },
      { id: 'billing_reminder', label: 'Billing reminders', description: 'Upcoming payment reminders', email: true, push: false },
      { id: 'usage_limit', label: 'Usage limit warnings', description: 'When approaching plan limits', email: true, push: true },
      { id: 'weekly_digest', label: 'Weekly activity digest', description: 'Summary of weekly activity', email: true, push: false },
    ]
  },
];

export default function NotificationSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [categories, setCategories] = useState(initialCategories);
  const [hasChanges, setHasChanges] = useState(false);

  const togglePreference = (categoryId: string, preferenceId: string, type: 'email' | 'push') => {
    setCategories(prev => prev.map(category => {
      if (category.id === categoryId) {
        return {
          ...category,
          preferences: category.preferences.map(pref => {
            if (pref.id === preferenceId) {
              return { ...pref, [type]: !pref[type] };
            }
            return pref;
          })
        };
      }
      return category;
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    // Mock save - in real app would persist to backend
    toast({
      title: "Settings saved",
      description: "Your notification preferences have been updated.",
    });
    setHasChanges(false);
  };

  const enableAll = (categoryId: string) => {
    setCategories(prev => prev.map(category => {
      if (category.id === categoryId) {
        return {
          ...category,
          preferences: category.preferences.map(pref => ({
            ...pref,
            email: true,
            push: true
          }))
        };
      }
      return category;
    }));
    setHasChanges(true);
  };

  const disableAll = (categoryId: string) => {
    setCategories(prev => prev.map(category => {
      if (category.id === categoryId) {
        return {
          ...category,
          preferences: category.preferences.map(pref => ({
            ...pref,
            email: false,
            push: false
          }))
        };
      }
      return category;
    }));
    setHasChanges(true);
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
                item.label === 'Account' 
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
        <div className="max-w-3xl mx-auto">
          {/* Back Button & Header */}
          <div className="mb-8">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/account')}
              className="mb-4 -ml-2 text-muted-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Account
            </Button>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg gradient-hero flex items-center justify-center">
                <Bell className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-3xl font-display font-bold text-foreground">Notification Settings</h1>
            </div>
            <p className="text-muted-foreground">
              Choose which events trigger notifications and how you'd like to receive them
            </p>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-6 mb-6 p-4 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Email</span>
            </div>
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Push</span>
            </div>
          </div>

          {/* Notification Categories */}
          <div className="space-y-6">
            {categories.map((category) => (
              <div key={category.id} className="fusion-card overflow-hidden">
                {/* Category Header */}
                <div className="flex items-center justify-between p-4 border-b border-border bg-muted/20">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${category.color}`}>
                      <category.icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-display font-semibold text-foreground">{category.label}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => enableAll(category.id)}
                      className="text-xs"
                    >
                      Enable all
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => disableAll(category.id)}
                      className="text-xs text-muted-foreground"
                    >
                      Disable all
                    </Button>
                  </div>
                </div>

                {/* Preferences List */}
                <div className="divide-y divide-border">
                  {category.preferences.map((preference) => (
                    <div key={preference.id} className="flex items-center justify-between p-4">
                      <div className="flex-1 min-w-0 mr-8">
                        <p className="font-medium text-foreground">{preference.label}</p>
                        <p className="text-sm text-muted-foreground">{preference.description}</p>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <Switch
                            checked={preference.email}
                            onCheckedChange={() => togglePreference(category.id, preference.id, 'email')}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Smartphone className="w-4 h-4 text-muted-foreground" />
                          <Switch
                            checked={preference.push}
                            onCheckedChange={() => togglePreference(category.id, preference.id, 'push')}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Save Button */}
          {hasChanges && (
            <div className="sticky bottom-0 left-0 right-0 p-4 mt-6 -mx-8 bg-background/80 backdrop-blur-sm border-t border-border">
              <div className="max-w-3xl mx-auto flex items-center justify-between">
                <p className="text-sm text-muted-foreground">You have unsaved changes</p>
                <div className="flex items-center gap-3">
                  <Button variant="outline" onClick={() => setCategories(initialCategories)}>
                    Reset
                  </Button>
                  <Button onClick={handleSave}>
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
