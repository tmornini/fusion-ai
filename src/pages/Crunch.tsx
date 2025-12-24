import { useState, useCallback } from 'react';
import { 
  Upload,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  Check,
  Loader2,
  ChevronRight,
  ChevronDown,
  Sparkles,
  MessageSquare,
  Table,
  Hash,
  Calendar,
  Type,
  ToggleLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DashboardLayout } from '@/components/DashboardLayout';

interface Column {
  id: string;
  originalName: string;
  friendlyName: string;
  dataType: string;
  description: string;
  sampleValues: string[];
  isAcronym: boolean;
  acronymExpansion: string;
}

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  columns: Column[];
  rowCount: number;
  uploadedAt: string;
}

const mockUploadedFile: UploadedFile = {
  id: '1',
  name: 'Q4_Sales_Report.xlsx',
  type: 'spreadsheet',
  size: 2456000,
  rowCount: 1247,
  uploadedAt: new Date().toISOString(),
  columns: [
    { id: '1', originalName: 'CUST_ID', friendlyName: '', dataType: 'text', description: '', sampleValues: ['C001', 'C002', 'C003'], isAcronym: true, acronymExpansion: '' },
    { id: '2', originalName: 'TXN_DT', friendlyName: '', dataType: 'date', description: '', sampleValues: ['2024-01-15', '2024-01-16', '2024-01-17'], isAcronym: true, acronymExpansion: '' },
    { id: '3', originalName: 'AMT', friendlyName: '', dataType: 'number', description: '', sampleValues: ['150.00', '299.99', '75.50'], isAcronym: true, acronymExpansion: '' },
    { id: '4', originalName: 'PROD_CAT', friendlyName: '', dataType: 'text', description: '', sampleValues: ['Electronics', 'Apparel', 'Home'], isAcronym: true, acronymExpansion: '' },
    { id: '5', originalName: 'REP_ID', friendlyName: '', dataType: 'text', description: '', sampleValues: ['R101', 'R102', 'R103'], isAcronym: true, acronymExpansion: '' },
    { id: '6', originalName: 'STATUS', friendlyName: '', dataType: 'text', description: '', sampleValues: ['COMP', 'PEND', 'CANC'], isAcronym: false, acronymExpansion: '' },
  ],
};

export default function Crunch() {
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [expandedColumn, setExpandedColumn] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [businessContext, setBusinessContext] = useState('');
  const [step, setStep] = useState<'upload' | 'label' | 'review'>('upload');

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setIsProcessing(true);
    setTimeout(() => {
      setUploadedFile(mockUploadedFile);
      setColumns(mockUploadedFile.columns);
      setIsProcessing(false);
      setStep('label');
    }, 2000);
  }, []);

  const handleFileSelect = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setUploadedFile(mockUploadedFile);
      setColumns(mockUploadedFile.columns);
      setIsProcessing(false);
      setStep('label');
    }, 2000);
  };

  const updateColumn = (columnId: string, updates: Partial<Column>) => {
    setColumns(prev => prev.map(col => 
      col.id === columnId ? { ...col, ...updates } : col
    ));
  };

  const getCompletionPercentage = () => {
    if (!columns.length) return 0;
    const completed = columns.filter(col => 
      col.friendlyName && col.description && (!col.isAcronym || col.acronymExpansion)
    ).length;
    return Math.round((completed / columns.length) * 100);
  };

  const getDataTypeIcon = (type: string) => {
    switch (type) {
      case 'number': return Hash;
      case 'date': return Calendar;
      case 'boolean': return ToggleLeft;
      default: return Type;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Table className="w-4 h-4" />
            Data Translation Tool
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">Crunch</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Upload your business data and help us understand it. We'll guide you through labeling columns, 
            explaining acronyms, and defining what everything means in plain language.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {[
            { key: 'upload', label: 'Upload', icon: Upload },
            { key: 'label', label: 'Label & Explain', icon: MessageSquare },
            { key: 'review', label: 'Review', icon: Check },
          ].map((s, index) => {
            const isActive = s.key === step;
            const isComplete = (step === 'label' && index === 0) || (step === 'review' && index <= 1);
            const Icon = s.icon;
            
            return (
              <div key={s.key} className="flex items-center gap-3">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                  isActive 
                    ? 'bg-primary text-primary-foreground' 
                    : isComplete 
                      ? 'bg-green-100 text-green-700 border border-green-200'
                      : 'bg-muted text-muted-foreground'
                }`}>
                  {isComplete ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                  <span className="text-sm font-medium">{s.label}</span>
                </div>
                {index < 2 && (
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            );
          })}
        </div>

        {/* Upload Step */}
        {step === 'upload' && (
          <div className="space-y-6">
            {/* Drop Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`fusion-card p-12 text-center border-2 border-dashed transition-all cursor-pointer ${
                isDragging 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50 hover:bg-muted/30'
              }`}
              onClick={handleFileSelect}
            >
              {isProcessing ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                  <p className="text-lg font-medium text-foreground mb-2">Analyzing your file...</p>
                  <p className="text-sm text-muted-foreground">We're detecting columns and data types</p>
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-lg font-medium text-foreground mb-2">
                    Drop your file here or click to browse
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Supports Excel (.xlsx, .xls), CSV, and Google Sheets exports
                  </p>
                  <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>Spreadsheets</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      <span>CSV Files</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Help Section */}
            <div className="fusion-card p-6 bg-amber-50/50 border-amber-200">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <HelpCircle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground mb-1">What happens next?</h3>
                  <p className="text-sm text-muted-foreground">
                    After upload, we'll ask you simple questions about each column in your data. 
                    You'll tell us what abbreviations mean, what the data represents, and any business rules. 
                    This helps our system understand your data like you do.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Label Step */}
        {step === 'label' && uploadedFile && (
          <div className="space-y-6">
            {/* File Info */}
            <div className="fusion-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{uploadedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(uploadedFile.size)} • {uploadedFile.rowCount.toLocaleString()} rows • {columns.length} columns
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">{getCompletionPercentage()}% complete</p>
                    <p className="text-xs text-muted-foreground">
                      {columns.filter(c => c.friendlyName && c.description).length} of {columns.length} columns labeled
                    </p>
                  </div>
                  <div className="w-24">
                    <Progress value={getCompletionPercentage()} className="h-2" />
                  </div>
                </div>
              </div>
            </div>

            {/* Business Context */}
            <div className="fusion-card p-6">
              <div className="flex items-start gap-3 mb-4">
                <Sparkles className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <h3 className="font-medium text-foreground">What is this data about?</h3>
                  <p className="text-sm text-muted-foreground">
                    Give us some context to help understand your business data better.
                  </p>
                </div>
              </div>
              <Textarea
                placeholder="Example: This is our quarterly sales report showing all transactions by customer. It includes the date, amount, product category, and which sales rep handled each sale..."
                value={businessContext}
                onChange={(e) => setBusinessContext(e.target.value)}
                className="min-h-[100px] resize-none"
              />
            </div>

            {/* Columns */}
            <div className="space-y-3">
              <h3 className="font-medium text-foreground">Help us understand each column</h3>
              
              {columns.map((column) => {
                const isExpanded = expandedColumn === column.id;
                const DataTypeIcon = getDataTypeIcon(column.dataType);
                const isComplete = column.friendlyName && column.description && (!column.isAcronym || column.acronymExpansion);
                
                return (
                  <div
                    key={column.id}
                    className={`fusion-card overflow-hidden transition-all ${
                      isComplete ? 'border-green-200 bg-green-50/30' : ''
                    }`}
                  >
                    {/* Column Header */}
                    <div
                      className="p-4 cursor-pointer"
                      onClick={() => setExpandedColumn(isExpanded ? null : column.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isComplete ? 'bg-green-100' : 'bg-muted'
                        }`}>
                          {isComplete ? (
                            <Check className="w-5 h-5 text-green-600" />
                          ) : (
                            <DataTypeIcon className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded text-foreground">
                              {column.originalName}
                            </code>
                            {column.isAcronym && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                                Acronym detected
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {column.friendlyName || 'Click to label this column'}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Sample values</p>
                            <p className="text-sm text-foreground">
                              {column.sampleValues.slice(0, 2).join(', ')}
                            </p>
                          </div>
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
                          <div>
                            <label className="text-sm font-medium text-foreground mb-2 block">
                              What would you call this column?
                            </label>
                            <Input
                              placeholder="e.g., Customer ID"
                              value={column.friendlyName}
                              onChange={(e) => updateColumn(column.id, { friendlyName: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-foreground mb-2 block">
                              Data type
                            </label>
                            <Select
                              value={column.dataType}
                              onValueChange={(value) => updateColumn(column.id, { dataType: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="text">Text</SelectItem>
                                <SelectItem value="number">Number</SelectItem>
                                <SelectItem value="date">Date</SelectItem>
                                <SelectItem value="boolean">Yes/No</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {column.isAcronym && (
                          <div className="mt-4">
                            <label className="text-sm font-medium text-foreground mb-2 block">
                              What does "{column.originalName}" stand for?
                            </label>
                            <Input
                              placeholder="e.g., Customer Identifier"
                              value={column.acronymExpansion}
                              onChange={(e) => updateColumn(column.id, { acronymExpansion: e.target.value })}
                            />
                          </div>
                        )}

                        <div className="mt-4">
                          <label className="text-sm font-medium text-foreground mb-2 block">
                            Describe what this column contains
                          </label>
                          <Textarea
                            placeholder="e.g., A unique identifier assigned to each customer in our CRM system..."
                            value={column.description}
                            onChange={(e) => updateColumn(column.id, { description: e.target.value })}
                            className="resize-none"
                            rows={2}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4">
              <Button variant="ghost" onClick={() => setStep('upload')}>
                Upload Different File
              </Button>
              <Button 
                onClick={() => setStep('review')}
                disabled={getCompletionPercentage() < 100}
              >
                Continue to Review
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Review Step */}
        {step === 'review' && (
          <div className="fusion-card p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-display font-bold text-foreground mb-3">
              Data Translation Complete
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Your data has been processed and is ready to use. All columns have been labeled and documented.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Button variant="outline" onClick={() => setStep('label')}>
                Edit Labels
              </Button>
              <Button onClick={() => navigate('/dashboard')}>
                Continue to Dashboard
              </Button>
            </div>
          </div>
        )}
        </div>
      </main>
    </div>
  );
}
