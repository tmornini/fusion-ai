import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  GitBranch,
  Plus,
  Trash2,
  ArrowRight,
  ArrowDown,
  Check,
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
  const navigate = useNavigate();
  const [process, setProcess] = useState<Process>(mockProcess);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

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
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>
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
                                className="resize-none"
                                rows={2}
                              />
                            </div>

                            <div>
                              <label className="text-sm font-medium text-foreground mb-2 block">
                                Who owns this step?
                              </label>
                              <Input
                                placeholder="e.g., Customer Success Team"
                                value={step.owner}
                                onChange={(e) => updateStep(step.id, { owner: e.target.value })}
                              />
                            </div>

                            <div>
                              <label className="text-sm font-medium text-foreground mb-2 block">
                                Role responsible
                              </label>
                              <Input
                                placeholder="e.g., CS Manager"
                                value={step.role}
                                onChange={(e) => updateStep(step.id, { role: e.target.value })}
                              />
                            </div>

                            <div>
                              <label className="text-sm font-medium text-foreground mb-2 block">
                                How long does this take?
                              </label>
                              <Input
                                placeholder="e.g., 30 minutes, 2 days"
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
                                onValueChange={(value: ProcessStep['type']) => updateStep(step.id, { type: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="start">Start</SelectItem>
                                  <SelectItem value="action">Action</SelectItem>
                                  <SelectItem value="decision">Decision</SelectItem>
                                  <SelectItem value="end">End</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="col-span-2">
                              <label className="text-sm font-medium text-foreground mb-2 block">
                                Tools used
                              </label>
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(toolIcons).map(([tool, Icon]) => (
                                  <button
                                    key={tool}
                                    onClick={() => toggleTool(step.id, tool)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                                      step.tools.includes(tool)
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted text-muted-foreground hover:text-foreground'
                                    }`}
                                  >
                                    <Icon className="w-3.5 h-3.5" />
                                    {tool}
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

            {/* Add Step Button */}
            <button
              onClick={addStep}
              className="w-full p-4 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-colors flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">Add Step</span>
            </button>

            {/* Share Section */}
            <div className="fusion-card p-6 mt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-foreground mb-1">Share this process</h3>
                  <p className="text-sm text-muted-foreground">
                    Share with teams to ensure everyone follows the same workflow
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="w-4 h-4" />
                    Export
                  </Button>
                  <Button size="sm" className="gap-2">
                    <Share2 className="w-4 h-4" />
                    Share
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preview Mode */}
        {viewMode === 'preview' && (
          <div className="fusion-card p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-display font-bold text-foreground mb-2">{process.name}</h2>
              <p className="text-muted-foreground">{process.description}</p>
              <div className="flex items-center justify-center gap-4 mt-4 text-sm text-muted-foreground">
                <span>Department: {process.department}</span>
                <span>•</span>
                <span>{process.steps.length} steps</span>
              </div>
            </div>

            {/* Visual Flow */}
            <div className="flex flex-col items-center gap-2">
              {process.steps.map((step, index) => (
                <div key={step.id} className="flex flex-col items-center">
                  <div className={`w-full max-w-md p-4 rounded-xl border-2 ${getStepTypeColor(step.type)}`}>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/50 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold">{index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium mb-1">{step.title || 'Untitled Step'}</h4>
                        <p className="text-sm opacity-80">{step.description}</p>
                        {(step.owner || step.duration) && (
                          <div className="flex items-center gap-3 mt-2 text-xs opacity-70">
                            {step.owner && (
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {step.owner}
                              </span>
                            )}
                            {step.duration && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {step.duration}
                              </span>
                            )}
                          </div>
                        )}
                        {step.tools.length > 0 && (
                          <div className="flex items-center gap-1 mt-2">
                            {step.tools.map(tool => {
                              const Icon = toolIcons[tool];
                              return Icon ? (
                                <div key={tool} className="w-6 h-6 rounded bg-white/30 flex items-center justify-center">
                                  <Icon className="w-3 h-3" />
                                </div>
                              ) : null;
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {index < process.steps.length - 1 && (
                    <ArrowDown className="w-6 h-6 text-muted-foreground my-1" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
