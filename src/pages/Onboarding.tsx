import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  Sparkles, 
  Building2, 
  User, 
  Check,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'Retail',
  'Manufacturing',
  'Consulting',
  'Other',
];

const COMPANY_SIZES = [
  '1-10 employees',
  '11-50 employees',
  '51-200 employees',
  '201-500 employees',
  '500+ employees',
];

const EXPERIENCE_LEVELS = [
  'Less than 1 year',
  '1-3 years',
  '3-5 years',
  '5-10 years',
  '10+ years',
];

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  
  // Company form
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [companySize, setCompanySize] = useState('');
  
  // User profile form
  const [role, setRole] = useState('');
  const [experience, setExperience] = useState('');
  const [responsibilities, setResponsibilities] = useState('');
  
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }

    // Check if onboarding is already completed
    const checkOnboarding = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('onboarding_completed')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (data?.onboarding_completed) {
          navigate('/dashboard');
        }
      } catch (err) {
        console.error('Error checking onboarding status:', err);
      } finally {
        setCheckingOnboarding(false);
      }
    };

    if (user) {
      checkOnboarding();
    }
  }, [user, loading, navigate]);

  const handleCompanySubmit = async () => {
    if (!companyName.trim()) {
      toast({
        title: "Company name required",
        description: "Please enter your company name to continue.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Create company
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: companyName.trim(),
          industry: industry || null,
          size: companySize || null,
        })
        .select()
        .single();
      
      if (companyError) throw companyError;
      
      // Link company to user profile
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ company_id: company.id })
        .eq('user_id', user?.id);
      
      if (updateError) throw updateError;
      
      setStep(2);
    } catch (err: any) {
      toast({
        title: "Failed to save company",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileSubmit = async () => {
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          role: role || null,
          experience: experience || null,
          responsibilities: responsibilities || null,
          onboarding_completed: true,
        })
        .eq('user_id', user?.id);
      
      if (error) throw error;
      
      toast({
        title: "Welcome to Fusion AI!",
        description: "Your profile is all set up.",
      });
      
      navigate('/dashboard');
    } catch (err: any) {
      toast({
        title: "Failed to save profile",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    setIsLoading(true);
    
    try {
      await supabase
        .from('user_profiles')
        .update({ onboarding_completed: true })
        .eq('user_id', user?.id);
      
      navigate('/dashboard');
    } catch (err) {
      navigate('/dashboard');
    }
  };

  if (loading || checkingOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-display font-bold text-foreground">Fusion AI</span>
          </div>
          <Button 
            variant="ghost" 
            onClick={handleSkip}
            className="text-muted-foreground hover:text-foreground"
          >
            Skip for now
          </Button>
        </div>
      </header>

      {/* Progress indicator */}
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                step >= 1 ? 'gradient-hero text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {step > 1 ? <Check className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
              </div>
              <div className="hidden sm:block">
                <div className="text-sm font-medium text-foreground">Company Profile</div>
                <div className="text-xs text-muted-foreground">Tell us about your company</div>
              </div>
            </div>
            
            <div className={`w-16 h-0.5 ${step >= 2 ? 'bg-primary' : 'bg-border'}`} />
            
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                step >= 2 ? 'gradient-hero text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                <User className="w-5 h-5" />
              </div>
              <div className="hidden sm:block">
                <div className="text-sm font-medium text-foreground">Your Profile</div>
                <div className="text-xs text-muted-foreground">Tell us about yourself</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          {step === 1 && (
            <div className="animate-fade-in">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl gradient-hero flex items-center justify-center mx-auto mb-6 shadow-fusion-lg">
                  <Building2 className="w-8 h-8 text-primary-foreground" />
                </div>
                <h1 className="text-3xl font-display font-bold text-foreground mb-3">
                  Set up your company
                </h1>
                <p className="text-muted-foreground">
                  This helps us personalize your Fusion AI experience
                </p>
              </div>

              <div className="fusion-card p-8 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="companyName" className="text-foreground">
                    Company name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="companyName"
                    placeholder="Enter your company name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="industry" className="text-foreground">Industry</Label>
                  <Select value={industry} onValueChange={setIndustry} disabled={isLoading}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map((ind) => (
                        <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companySize" className="text-foreground">Company size</Label>
                  <Select value={companySize} onValueChange={setCompanySize} disabled={isLoading}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select company size" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPANY_SIZES.map((size) => (
                        <SelectItem key={size} value={size}>{size}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={handleCompanySubmit} 
                  className="w-full h-12 text-base"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade-in">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl gradient-hero flex items-center justify-center mx-auto mb-6 shadow-fusion-lg">
                  <User className="w-8 h-8 text-primary-foreground" />
                </div>
                <h1 className="text-3xl font-display font-bold text-foreground mb-3">
                  Tell us about yourself
                </h1>
                <p className="text-muted-foreground">
                  Help us tailor Fusion AI to your needs
                </p>
              </div>

              <div className="fusion-card p-8 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-foreground">Your role</Label>
                  <Input
                    id="role"
                    placeholder="e.g., Product Manager, Engineer"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experience" className="text-foreground">Experience level</Label>
                  <Select value={experience} onValueChange={setExperience} disabled={isLoading}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your experience" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPERIENCE_LEVELS.map((exp) => (
                        <SelectItem key={exp} value={exp}>{exp}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="responsibilities" className="text-foreground">
                    Key responsibilities
                  </Label>
                  <Textarea
                    id="responsibilities"
                    placeholder="Tell us about your main responsibilities..."
                    value={responsibilities}
                    onChange={(e) => setResponsibilities(e.target.value)}
                    disabled={isLoading}
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <div className="flex gap-3">
                  <Button 
                    variant="outline"
                    onClick={() => setStep(1)} 
                    className="h-12"
                    disabled={isLoading}
                  >
                    <ArrowLeft className="mr-2 h-5 w-5" />
                    Back
                  </Button>
                  <Button 
                    onClick={handleProfileSubmit} 
                    className="flex-1 h-12 text-base"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        Complete setup
                        <Check className="ml-2 h-5 w-5" />
                      </>
                    )}
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
