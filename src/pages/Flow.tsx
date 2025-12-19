import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { 
  GitBranch,
  Plus,
  Trash2,
  ArrowRight,
  ArrowDown,
  Check,
  Loader2,
  Zap,
  Users,
  Wrench,
  Clock,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Share2,
  Download,
  Eye,
  Edit3,
  AlertCircle,
  Sparkles,
  FileText,
  Mail,
  Database,
  Globe,
  Phone,
  MessageSquare,
  FolderOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const navItems = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Ideas', href: '/ideas' },
  { label: 'Projects', href: '/projects' },
  { label: 'Team', href: '/team' },
  { label: 'Crunch', href: '/crunch' },
  { label: 'Flow', href: '/flow', active: true },
];

interface ProcessStep {
  id: string;
  title: string;
  description: string;
  owner: string;
  role: string;
  tools: string[];
  duration: string;
  order: number;
  type: 'action' | 'decision' | 'start' | 'end';
}

interface Process {
  id: string;
  name: string;
  description: string;
  department: string;
  steps: ProcessStep[];
  createdAt: string;
  lastUpdated: string;
  sharedWith: string[];
}

const toolIcons: Record<string, typeof Mail> = {
  'Email': Mail,
  'Database': Database,
  'Website': Globe,
  'Phone': Phone,
  'Chat': MessageSquare,
  'Files': FolderOpen,
  'Document': FileText,
};

const mockProcess: Process = {
  id: '1',
  name: 'Customer Onboarding',
  description: 'End-to-end process for onboarding new enterprise customers',
  department: 'Customer Success',
  createdAt: '2024-02-15',
  lastUpdated: '2024-02-28',
  sharedWith: ['Engineering', 'Sales'],
  steps: [
    {
      id: '1',
      title: 'Receive signed contract',
      description: 'Sales team sends signed contract to customer success inbox',
      owner: 'Sales Team',
      role: 'Account Executive',
      tools: ['Email', 'Document'],
      duration: 'Immediate',
      order: 1,
      type: 'start',
    },
    {
      id: '2',
      title: 'Create customer record',
      description: 'Enter customer details in CRM and create project folder',
      owner: 'Customer Success',
      role: 'CS Manager',
      tools: ['Database', 'Files'],
      duration: '15 minutes',
      order: 2,
      type: 'action',
    },
    {
      id: '3',
      title: 'Schedule kickoff call',
      description: 'Reach out to customer to schedule implementation kickoff',
      owner: 'Customer Success',
      role: 'Implementation Specialist',
      tools: ['Email', 'Phone'],
      duration: '1 day',
      order: 3,
      type: 'action',
    },
    {
      id: '4',
      title: 'Conduct kickoff meeting',
      description: 'Review goals, timeline, and assign customer contacts',
      owner: 'Customer Success',
      role: 'Implementation Specialist',
      tools: ['Chat', 'Document'],
      duration: '1 hour',
      order: 4,
      type: 'action',
    },
    {
      id: '5',
      title: 'Technical setup complete',
      description: 'Engineering confirms environment is ready for customer use',
      owner: 'Engineering',
      role: 'Solutions Engineer',
      tools: ['Database', 'Website'],
      duration: '2 days',
      order: 5,
      type: 'action',
    },
  ],
};

export default function Flow() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [process, setProcess] = useState<Process>(mockProcess);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [isAddingStep, setIsAddingStep] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  const addStep = () => {
    const newStep: ProcessStep = {
      id: Date.now().toString(),
      title: '',
      description: '',
      owner: '',
      role: '',
      tools: [],
      duration: '',
      order: process.steps.length + 1,
      type: 'action',
    };
    setProcess(prev => ({
      ...prev,
      steps: [...prev.steps, newStep],
    }));
    setExpandedStep(newStep.id);
  };

  const updateStep = (stepId: string, updates: Partial<ProcessStep>) => {
    setProcess(prev => ({
      ...prev,
      steps: prev.steps.map(step =>
        step.id === stepId ? { ...step, ...updates } : step
      ),
    }));
  };

  const removeStep = (stepId: string) => {
    setProcess(prev => ({
      ...prev,
      steps: prev.steps.filter(step => step.id !== stepId),
    }));
  };

  const moveStep = (stepId: string, direction: 'up' | 'down') => {
    const currentIndex = process.steps.findIndex(s => s.id === stepId);
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === process.steps.length - 1)
    ) return;

    const newSteps = [...process.steps];
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    [newSteps[currentIndex], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[currentIndex]];
    
    setProcess(prev => ({ ...prev, steps: newSteps }));
  };

  const toggleTool = (stepId: string, tool: string) => {
    const step = process.steps.find(s => s.id === stepId);
    if (!step) return;

    const tools = step.tools.includes(tool)
      ? step.tools.filter(t => t !== tool)
      : [...step.tools, tool];
    
    updateStep(stepId, { tools });
  };

  const getStepTypeColor = (type: string) => {
    switch (type) {
      case 'start':
        return 'bg-green-100 border-green-300 text-green-700';
      case 'end':
        return 'bg-red-100 border-red-300 text-red-700';
      case 'decision':
        return 'bg-amber-100 border-amber-300 text-amber-700';
      default:
        return 'bg-blue-100 border-blue-300 text-blue-700';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/60 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="font-display font-bold text-foreground">ProjectIQ</span>
              </div>
              <nav className="hidden md:flex items-center gap-1">
                {navItems.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => navigate(item.href)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      item.active
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
            <Button variant="outline" size="sm" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <GitBranch className="w-4 h-4" />
              Process Documentation
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">Flow</h1>
            <p className="text-muted-foreground max-w-xl">
              Document your business processes step by step. We'll help you create clear workflows 
              that everyone can understand and follow.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant={viewMode === 'edit' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setViewMode('edit')}
              className="gap-2"
            >
              <Edit3 className="w-4 h-4" />
              Edit
            </Button>
            <Button 
              variant={viewMode === 'preview' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setViewMode('preview')}
              className="gap-2"
            >
              <Eye className="w-4 h-4" />
              Preview
            </Button>
          </div>
        </div>

        {/* Process Info */}
        <div className="fusion-card p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Process Name</label>
              <Input
                value={process.name}
                onChange={(e) => setProcess(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Customer Onboarding"
                className="text-lg font-medium"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Department</label>
              <Select
                value={process.department}
                onValueChange={(value) => setProcess(prev => ({ ...prev, department: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sales">Sales</SelectItem>
                  <SelectItem value="Customer Success">Customer Success</SelectItem>
                  <SelectItem value="Engineering">Engineering</SelectItem>
                  <SelectItem value="Operations">Operations</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
                  <SelectItem value="HR">HR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-foreground mb-2 block">Description</label>
              <Textarea
                value={process.description}
                onChange={(e) => setProcess(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Briefly describe what this process accomplishes..."
                className="resize-none"
              />
            </div>
          </div>
        </div>

        {/* Edit Mode */}
        {viewMode === 'edit' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-semibold text-foreground">Process Steps</h2>
              <span className="text-sm text-muted-foreground">{process.steps.length} steps</span>
            </div>

            {/* Steps */}
            <div className="space-y-3">
              {process.steps.map((step, index) => {
                const isExpanded = expandedStep === step.id;
                
                return (
                  <div key={step.id} className="relative">
                    {/* Connector Line */}
                    {index < process.steps.length - 1 && (
                      <div className="absolute left-6 top-full w-0.5 h-3 bg-border z-0" />
                    )}
                    
                    <div className={`fusion-card overflow-hidden ${isExpanded ? 'ring-2 ring-primary' : ''}`}>
                      {/* Step Header */}
                      <div
                        className="p-4 cursor-pointer"
                        onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="cursor-grab text-muted-foreground hover:text-foreground">
                            <GripVertical className="w-4 h-4" />
                          </div>
                          
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center border-2 ${getStepTypeColor(step.type)}`}>
                            <span className="text-sm font-bold">{index + 1}</span>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-foreground">
                                {step.title || 'Untitled Step'}
                              </span>
                              {!step.title && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                                  Needs info
                                </span>
                              )}
                            </div>
                            {step.owner && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Users className="w-3.5 h-3.5" />
                                <span>{step.owner}</span>
                                {step.duration && (
                                  <>
                                    <span>•</span>
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>{step.duration}</span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => { e.stopPropagation(); moveStep(step.id, 'up'); }}
                              disabled={index === 0}
                            >
                              <ChevronUp className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => { e.stopPropagation(); moveStep(step.id, 'down'); }}
                              disabled={index === process.steps.length - 1}
                            >
                              <ChevronDown className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => { e.stopPropagation(); removeStep(step.id); }}
                              className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            {isExpanded ? (
                              <ChevronDown className="w-5 h-5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Form */}
                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-border pt-4 bg-muted/20">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                              <label className="text-sm font-medium text-foreground mb-2 block">
                                What happens in this step?
                              </label>
                              <Input
                                placeholder="e.g., Review and approve customer application"
                                value={step.title}
                                onChange={(e) => updateStep(step.id, { title: e.target.value })}
                              />
                            </div>
                            
                            <div className="col-span-2">
                              <label className="text-sm font-medium text-foreground mb-2 block">
                                Describe this step in detail
                              </label>
                              <Textarea
                                placeholder="Explain what actions are taken, what inputs are needed, and what the output is..."
                                value={step.description}
                                onChange={(e) => updateStep(step.id, { description: e.target.value })}
                                className="min-h-[80px] resize-none"
                              />
                            </div>

                            <div>
                              <label className="text-sm font-medium text-foreground mb-2 block">
                                Who is responsible?
                              </label>
                              <Input
                                placeholder="e.g., Customer Success Team"
                                value={step.owner}
                                onChange={(e) => updateStep(step.id, { owner: e.target.value })}
                              />
                            </div>

                            <div>
                              <label className="text-sm font-medium text-foreground mb-2 block">
                                Specific role
                              </label>
                              <Input
                                placeholder="e.g., Account Manager"
                                value={step.role}
                                onChange={(e) => updateStep(step.id, { role: e.target.value })}
                              />
                            </div>

                            <div>
                              <label className="text-sm font-medium text-foreground mb-2 block">
                                How long does this take?
                              </label>
                              <Input
                                placeholder="e.g., 30 minutes, 1 day"
                                value={step.duration}
                                onChange={(e) => updateStep(step.id, { duration: e.target.value })}
                              />
                            </div>

                            <div>
                              <label className="text-sm font-medium text-foreground mb-2 block">
                                Step type
                              </label>
                              <Select
                                value={step.type}
                                onValueChange={(value: 'action' | 'decision' | 'start' | 'end') => 
                                  updateStep(step.id, { type: value })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="start">Start Point</SelectItem>
                                  <SelectItem value="action">Action</SelectItem>
                                  <SelectItem value="decision">Decision</SelectItem>
                                  <SelectItem value="end">End Point</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="col-span-2">
                              <label className="text-sm font-medium text-foreground mb-2 block">
                                What tools are used?
                              </label>
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(toolIcons).map(([tool, Icon]) => (
                                  <button
                                    key={tool}
                                    onClick={() => toggleTool(step.id, tool)}
                                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                                      step.tools.includes(tool)
                                        ? 'bg-primary/10 border-primary text-primary'
                                        : 'bg-muted/30 border-border text-muted-foreground hover:border-primary/50'
                                    }`}
                                  >
                                    <Icon className="w-4 h-4" />
                                    <span className="text-sm">{tool}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add Step */}
            <button
              onClick={addStep}
              className="w-full p-4 border-2 border-dashed border-border rounded-xl text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">Add Step</span>
            </button>
          </div>
        )}

        {/* Preview Mode - Workflow Diagram */}
        {viewMode === 'preview' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-semibold text-foreground">Workflow Diagram</h2>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="w-4 h-4" />
                  Export
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>
              </div>
            </div>

            {/* Visual Workflow */}
            <div className="fusion-card p-8 overflow-x-auto">
              <div className="flex flex-col items-center gap-4 min-w-[600px]">
                {process.steps.map((step, index) => (
                  <div key={step.id} className="flex flex-col items-center">
                    {/* Step Box */}
                    <div className={`relative p-6 rounded-xl border-2 min-w-[400px] ${
                      step.type === 'start' 
                        ? 'bg-green-50 border-green-300' 
                        : step.type === 'end'
                          ? 'bg-red-50 border-red-300'
                          : step.type === 'decision'
                            ? 'bg-amber-50 border-amber-300 transform rotate-0'
                            : 'bg-card border-border'
                    }`}>
                      {/* Step Number Badge */}
                      <div className={`absolute -top-3 -left-3 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        step.type === 'start' 
                          ? 'bg-green-500 text-white' 
                          : step.type === 'end'
                            ? 'bg-red-500 text-white'
                            : 'bg-primary text-primary-foreground'
                      }`}>
                        {index + 1}
                      </div>

                      <h3 className="font-semibold text-foreground mb-2">{step.title || 'Untitled Step'}</h3>
                      {step.description && (
                        <p className="text-sm text-muted-foreground mb-3">{step.description}</p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs">
                        {step.owner && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Users className="w-3.5 h-3.5" />
                            <span>{step.owner}</span>
                          </div>
                        )}
                        {step.duration && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{step.duration}</span>
                          </div>
                        )}
                      </div>

                      {step.tools.length > 0 && (
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                          <Wrench className="w-3.5 h-3.5 text-muted-foreground" />
                          <div className="flex flex-wrap gap-1">
                            {step.tools.map(tool => {
                              const Icon = toolIcons[tool] || Wrench;
                              return (
                                <span key={tool} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted text-xs text-muted-foreground">
                                  <Icon className="w-3 h-3" />
                                  {tool}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Arrow */}
                    {index < process.steps.length - 1 && (
                      <div className="flex flex-col items-center py-2">
                        <div className="w-0.5 h-6 bg-border" />
                        <ArrowDown className="w-5 h-5 text-muted-foreground -mt-1" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Sharing Info */}
            <div className="fusion-card p-4 bg-blue-50/50 border-blue-200">
              <div className="flex items-start gap-3">
                <Share2 className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Shared with teams</p>
                  <p className="text-sm text-blue-700">
                    This process is shared with: {process.sharedWith.join(', ')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Suggestion */}
        <div className="fusion-card p-4 bg-primary/5 border-primary/20 mt-6">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">AI Analysis</p>
              <p className="text-sm text-muted-foreground">
                This process has {process.steps.length} steps with an estimated total duration of 3+ days. 
                Consider adding decision points to handle edge cases like missing customer information or contract disputes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
