import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { FormField } from '@/components/FormError';
import { 
  SystemError, 
  UploadError, 
  SaveError, 
  ConnectionError 
} from '@/components/SystemError';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ErrorStatesDemo() {
  const [isRetrying, setIsRetrying] = useState(false);
  const [formErrors, setFormErrors] = useState({
    title: 'Please enter a title for your idea',
    email: 'This doesn\'t look like a valid email address',
    description: ''
  });

  const handleRetry = () => {
    setIsRetrying(true);
    setTimeout(() => setIsRetrying(false), 2000);
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Error & System States</h1>
          <p className="text-muted-foreground mt-1">
            Clear, calm, and helpful error messaging
          </p>
        </div>

        {/* Inline Validation Errors */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Inline Validation Errors</CardTitle>
            <CardDescription>
              Form validation with helpful, non-blaming messages
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField 
              label="Idea Title" 
              error={formErrors.title}
              required
            >
              <Input placeholder="Enter a descriptive title" />
            </FormField>

            <FormField 
              label="Your Email" 
              error={formErrors.email}
              required
              hint="We'll use this to send you updates"
            >
              <Input type="email" placeholder="name@company.com" />
            </FormField>

            <FormField 
              label="Description" 
              error={formErrors.description}
              hint="Describe your idea in detail"
            >
              <Textarea placeholder="What problem does this solve?" rows={3} />
            </FormField>

            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setFormErrors({
                  title: 'Please enter a title for your idea',
                  email: 'This doesn\'t look like a valid email address',
                  description: 'Please add a brief description'
                })}
              >
                Show All Errors
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setFormErrors({ title: '', email: '', description: '' })}
              >
                Clear Errors
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Upload Error */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upload Failed</CardTitle>
            <CardDescription>
              When a file upload doesn't complete
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UploadError 
              fileName="Q4_Sales_Report.xlsx"
              onRetry={handleRetry}
              onCancel={() => {}}
              isRetrying={isRetrying}
            />
          </CardContent>
        </Card>

        {/* Save Error */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Save Failed</CardTitle>
            <CardDescription>
              When changes couldn't be saved
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SaveError 
              onRetry={handleRetry}
              onDiscard={() => {}}
              isRetrying={isRetrying}
            />
          </CardContent>
        </Card>

        {/* Connection Error */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Connection Issue</CardTitle>
            <CardDescription>
              When there's a network problem
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ConnectionError 
              onRetry={handleRetry}
              isRetrying={isRetrying}
            />
          </CardContent>
        </Card>

        {/* Inline System Error */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Inline System Error</CardTitle>
            <CardDescription>
              Compact error for inline contexts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SystemError 
              title="Couldn't load comments"
              message="We'll try again automatically"
              onRetry={handleRetry}
              isRetrying={isRetrying}
              variant="inline"
            />
          </CardContent>
        </Card>

        {/* Full Page Error */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Full Page Error</CardTitle>
            <CardDescription>
              For critical failures that block progress
            </CardDescription>
          </CardHeader>
          <CardContent className="py-8 bg-muted/30 rounded-lg">
            <SystemError 
              title="Something went wrong"
              message="We couldn't complete your request. This might be a temporary issue — please try again in a moment."
              onRetry={handleRetry}
              onGoBack={() => {}}
              onGetHelp={() => {}}
              isRetrying={isRetrying}
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
