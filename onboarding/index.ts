import { navigate, iconSparkles, iconArrowRight } from '../site/script';

export function render(): string {
  return `
    <div class="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div class="text-center" style="max-width:28rem">
        <div class="gradient-hero rounded-xl flex items-center justify-center mx-auto mb-6" style="width:4rem;height:4rem;box-shadow:var(--shadow-lg)">
          ${iconSparkles(32, 'text-primary-foreground')}
        </div>
        <h1 class="text-3xl font-display font-bold text-foreground mb-3">
          Welcome to Fusion AI
        </h1>
        <p class="text-muted mb-8">
          Your workspace is ready. Start exploring ideas, managing projects, and collaborating with your team.
        </p>
        <button class="btn btn-primary btn-lg gap-2" id="go-dashboard">
          Go to Dashboard ${iconArrowRight(16)}
        </button>
      </div>
    </div>`;
}

export function init(): void {
  document.getElementById('go-dashboard')?.addEventListener('click', () => navigate('/dashboard'));
}
