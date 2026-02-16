// ============================================
// FUSION AI — Mock Data
// All functions are async to match future API signatures.
// ============================================

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  company: string;
  avatar?: string;
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  time: string;
  unread: boolean;
}

export async function getCurrentUser(): Promise<User> {
  return {
    id: '1',
    name: 'Demo User',
    email: 'demo@example.com',
    role: 'Admin',
    company: 'Demo Company',
  };
}

export async function getNotifications(): Promise<Notification[]> {
  return [
    { id: 1, title: 'New idea submitted', message: 'Marketing team submitted "AI Chatbot Integration"', time: '5 min ago', unread: true },
    { id: 2, title: 'Project approved', message: 'Your project "Mobile App Redesign" was approved', time: '1 hour ago', unread: true },
    { id: 3, title: 'Comment on idea', message: 'John commented on "Customer Portal"', time: '2 hours ago', unread: false },
    { id: 4, title: 'Review requested', message: 'Sarah requested your review on "API Gateway"', time: '1 day ago', unread: false },
  ];
}
