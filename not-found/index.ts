import { navigate, getHashPath } from '../site/script';

export function render(): string {
  const path = getHashPath();
  return `
    <div class="flex min-h-screen items-center justify-center bg-muted">
      <div class="text-center">
        <h1 class="text-4xl font-bold mb-4">404</h1>
        <p class="text-xl text-muted mb-4">Oops! Page not found</p>
        <p class="text-sm text-muted mb-6">${path}</p>
        <a href="#/" class="text-primary" style="text-decoration:underline">Return to Home</a>
      </div>
    </div>`;
}
