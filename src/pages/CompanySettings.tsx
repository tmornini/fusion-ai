import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2,
  Users,
  Settings,
  Clock,
  DollarSign,
  TrendingUp,
  Shield,
  Save,
  CheckCircle2,
  Sparkles,
  Home,
  Lightbulb,
  FolderKanban,
  User,
  LogOut,
  Database,
  GitBranch,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Crown,
  UserCheck,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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

// Mock company settings
const mockCompanySettings = {
  name: 'Acme Corporation',
  industry: 'Technology',
  size: '51-200',
  website: 'https://acmecorp.com',
  description: 'We build innovative software solutions for enterprise clients.',
  departments: ['Engineering', 'Product', 'Design', 'Sales', 'Operations', 'Finance', 'HR'],
  metrics: {
    time: {
      unit: 'hours',
      defaultEstimate: 40,
      trackActual: true,
      showVariance: true,
    },
    cost: {
      currency: 'USD',
      hourlyRate: 150,
      includeOverhead: true,
      showBudget: true,
    },
    impact: {
      scale: '1-100',
      categories: ['Revenue', 'Efficiency', 'Customer Satisfaction', 'Risk Reduction'],
      requireJustification: true,
    },
  },
  permissions: {
    allowGuestAccess: false,
    requireApprovalForProjects: true,
    allowSelfSignup: false,
    enforceSSO: false,
  },
  roles: [
    { name: 'Admin', description: 'Full access to all settings and data', count: 3 },
    { name: 'Manager', description: 'Can create and manage projects', count: 8 },
    { name: 'Member', description: 'Can view and contribute to assigned projects', count: 25 },
    { name: 'Viewer', description: 'Read-only access', count: 5 },
  ],
};

export default function CompanySettings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(mockCompanySettings);
  const [expandedSection, setExpandedSection] = useState<string | null>('company');
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

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const SectionHeader = ({ id, icon: Icon, title, description }: { id: string; icon: any; title: string; description: string }) => {
    const isExpanded = expandedSection === id;
    return (
      <button
        onClick={() => toggleSection(id)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div className="text-left">
            <p className="font-medium text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        )}
      </button>
    );
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
              <p className="text-sm font-medium text-foreground truncate">Demo User</p>
              <p className="text-xs text-muted-foreground truncate">Admin</p>
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
              <div className="flex items-center gap-2 mb-2">
                <Button variant="ghost" size="sm" onClick={() => navigate('/account')} className="text-muted-foreground">
                  ← Back to Account
                </Button>
              </div>
              <h1 className="text-3xl font-display font-bold text-foreground mb-2">Company Settings</h1>
              <p className="text-muted-foreground">
                Configure your organization's preferences and defaults
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

          {/* Settings Sections */}
          <div className="space-y-4">
            {/* Company Details */}
            <div className="fusion-card overflow-hidden">
              <SectionHeader 
                id="company" 
                icon={Building2} 
                title="Company Details" 
                description="Basic information about your organization"
              />
              {expandedSection === 'company' && (
                <div className="p-6 border-t border-border bg-muted/10">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">Company Name</label>
                      <Input
                        value={settings.name}
                        onChange={(e) => setSettings(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">Industry</label>
                      <Select
                        value={settings.industry}
                        onValueChange={(value) => setSettings(prev => ({ ...prev, industry: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Technology">Technology</SelectItem>
                          <SelectItem value="Finance">Finance</SelectItem>
                          <SelectItem value="Healthcare">Healthcare</SelectItem>
                          <SelectItem value="Retail">Retail</SelectItem>
                          <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">Company Size</label>
                      <Select
                        value={settings.size}
                        onValueChange={(value) => setSettings(prev => ({ ...prev, size: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1-10">1-10 employees</SelectItem>
                          <SelectItem value="11-50">11-50 employees</SelectItem>
                          <SelectItem value="51-200">51-200 employees</SelectItem>
                          <SelectItem value="201-500">201-500 employees</SelectItem>
                          <SelectItem value="500+">500+ employees</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">Website</label>
                      <Input
                        value={settings.website}
                        onChange={(e) => setSettings(prev => ({ ...prev, website: e.target.value }))}
                        placeholder="https://yourcompany.com"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Description</label>
                    <Textarea
                      value={settings.description}
                      onChange={(e) => setSettings(prev => ({ ...prev, description: e.target.value }))}
                      className="resize-none"
                      rows={2}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Team Structure */}
            <div className="fusion-card overflow-hidden">
              <SectionHeader 
                id="team" 
                icon={Users} 
                title="Team Structure" 
                description="Departments and organizational units"
              />
              {expandedSection === 'team' && (
                <div className="p-6 border-t border-border bg-muted/10">
                  <p className="text-sm text-muted-foreground mb-4">
                    Define the departments in your organization. These are used for filtering and organizing team members.
                  </p>
                  <div className="space-y-2 mb-4">
                    {settings.departments.map((dept, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          value={dept}
                          onChange={(e) => {
                            const newDepts = [...settings.departments];
                            newDepts[index] = e.target.value;
                            setSettings(prev => ({ ...prev, departments: newDepts }));
                          }}
                          className="flex-1"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSettings(prev => ({
                              ...prev,
                              departments: prev.departments.filter((_, i) => i !== index),
                            }));
                          }}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSettings(prev => ({ ...prev, departments: [...prev.departments, ''] }))}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Department
                  </Button>

                  <div className="mt-6 pt-6 border-t border-border">
                    <p className="text-sm font-medium text-foreground mb-4">User Roles</p>
                    <div className="space-y-3">
                      {settings.roles.map((role, index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              role.name === 'Admin' ? 'bg-purple-100' :
                              role.name === 'Manager' ? 'bg-blue-100' :
                              role.name === 'Member' ? 'bg-green-100' : 'bg-muted'
                            }`}>
                              {role.name === 'Admin' && <Crown className="w-4 h-4 text-purple-600" />}
                              {role.name === 'Manager' && <UserCheck className="w-4 h-4 text-blue-600" />}
                              {role.name === 'Member' && <User className="w-4 h-4 text-green-600" />}
                              {role.name === 'Viewer' && <Eye className="w-4 h-4 text-muted-foreground" />}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{role.name}</p>
                              <p className="text-xs text-muted-foreground">{role.description}</p>
                            </div>
                          </div>
                          <span className="text-sm text-muted-foreground">{role.count} users</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Default Metrics */}
            <div className="fusion-card overflow-hidden">
              <SectionHeader 
                id="metrics" 
                icon={TrendingUp} 
                title="Default Metrics" 
                description="How time, cost, and impact are measured"
              />
              {expandedSection === 'metrics' && (
                <div className="p-6 border-t border-border bg-muted/10">
                  {/* Time Settings */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Clock className="w-5 h-5 text-primary" />
                      <span className="font-medium text-foreground">Time Tracking</span>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/30 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-muted-foreground mb-2 block">Time Unit</label>
                          <Select
                            value={settings.metrics.time.unit}
                            onValueChange={(value) => setSettings(prev => ({
                              ...prev,
                              metrics: { ...prev.metrics, time: { ...prev.metrics.time, unit: value } },
                            }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="hours">Hours</SelectItem>
                              <SelectItem value="days">Days</SelectItem>
                              <SelectItem value="weeks">Weeks</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground mb-2 block">Default Estimate</label>
                          <Input
                            type="number"
                            value={settings.metrics.time.defaultEstimate}
                            onChange={(e) => setSettings(prev => ({
                              ...prev,
                              metrics: { ...prev.metrics, time: { ...prev.metrics.time, defaultEstimate: parseInt(e.target.value) } },
                            }))}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">Track Actual Time</p>
                          <p className="text-xs text-muted-foreground">Record time spent on tasks</p>
                        </div>
                        <Switch
                          checked={settings.metrics.time.trackActual}
                          onCheckedChange={(checked) => setSettings(prev => ({
                            ...prev,
                            metrics: { ...prev.metrics, time: { ...prev.metrics.time, trackActual: checked } },
                          }))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Cost Settings */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-4">
                      <DollarSign className="w-5 h-5 text-primary" />
                      <span className="font-medium text-foreground">Cost Calculation</span>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/30 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-muted-foreground mb-2 block">Currency</label>
                          <Select
                            value={settings.metrics.cost.currency}
                            onValueChange={(value) => setSettings(prev => ({
                              ...prev,
                              metrics: { ...prev.metrics, cost: { ...prev.metrics.cost, currency: value } },
                            }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="USD">USD ($)</SelectItem>
                              <SelectItem value="EUR">EUR (€)</SelectItem>
                              <SelectItem value="GBP">GBP (£)</SelectItem>
                              <SelectItem value="CAD">CAD ($)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground mb-2 block">Default Hourly Rate</label>
                          <Input
                            type="number"
                            value={settings.metrics.cost.hourlyRate}
                            onChange={(e) => setSettings(prev => ({
                              ...prev,
                              metrics: { ...prev.metrics, cost: { ...prev.metrics.cost, hourlyRate: parseInt(e.target.value) } },
                            }))}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">Include Overhead</p>
                          <p className="text-xs text-muted-foreground">Add overhead costs to estimates</p>
                        </div>
                        <Switch
                          checked={settings.metrics.cost.includeOverhead}
                          onCheckedChange={(checked) => setSettings(prev => ({
                            ...prev,
                            metrics: { ...prev.metrics, cost: { ...prev.metrics.cost, includeOverhead: checked } },
                          }))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Impact Settings */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      <span className="font-medium text-foreground">Impact Scoring</span>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/30 space-y-4">
                      <div>
                        <label className="text-sm text-muted-foreground mb-2 block">Impact Categories</label>
                        <div className="flex flex-wrap gap-2">
                          {settings.metrics.impact.categories.map((cat, i) => (
                            <span key={i} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
                              {cat}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">Require Justification</p>
                          <p className="text-xs text-muted-foreground">Users must explain impact scores</p>
                        </div>
                        <Switch
                          checked={settings.metrics.impact.requireJustification}
                          onCheckedChange={(checked) => setSettings(prev => ({
                            ...prev,
                            metrics: { ...prev.metrics, impact: { ...prev.metrics.impact, requireJustification: checked } },
                          }))}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Permissions */}
            <div className="fusion-card overflow-hidden">
              <SectionHeader 
                id="permissions" 
                icon={Shield} 
                title="Permissions & Security" 
                description="Access control and security settings"
              />
              {expandedSection === 'permissions' && (
                <div className="p-6 border-t border-border bg-muted/10">
                  <div className="space-y-4">
                    {[
                      { 
                        key: 'allowGuestAccess', 
                        label: 'Allow Guest Access', 
                        description: 'Let external users view shared content without an account',
                        warning: true,
                      },
                      { 
                        key: 'requireApprovalForProjects', 
                        label: 'Require Project Approval', 
                        description: 'New projects need admin approval before starting',
                      },
                      { 
                        key: 'allowSelfSignup', 
                        label: 'Allow Self-Signup', 
                        description: 'Anyone with your company email domain can create an account',
                      },
                      { 
                        key: 'enforceSSO', 
                        label: 'Enforce SSO', 
                        description: 'Require single sign-on for all users',
                      },
                    ].map((perm) => (
                      <div key={perm.key} className="flex items-center justify-between p-4 rounded-lg hover:bg-muted/30 transition-colors">
                        <div className="flex items-start gap-3">
                          {perm.warning && (
                            <HelpCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                          )}
                          <div>
                            <p className="text-sm font-medium text-foreground">{perm.label}</p>
                            <p className="text-xs text-muted-foreground">{perm.description}</p>
                          </div>
                        </div>
                        <Switch
                          checked={settings.permissions[perm.key as keyof typeof settings.permissions]}
                          onCheckedChange={(checked) => setSettings(prev => ({
                            ...prev,
                            permissions: { ...prev.permissions, [perm.key]: checked },
                          }))}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}