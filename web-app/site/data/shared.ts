import { GET } from '../../../api/api';
import type { UserEntity, NotificationEntity } from '../../../api/types';
import { toBool } from '../../../api/types';
import { userName } from './helpers';

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
  const row = await GET('current-user') as UserEntity | null;
  if (!row) return { id: 'current', name: 'Demo User', email: 'demo@example.com', role: 'Admin', company: 'Demo Company' };
  return {
    id: row.id,
    name: userName(row),
    email: row.email,
    role: row.role,
    company: 'Demo Company',
  };
}

export async function getNotifications(): Promise<Notification[]> {
  const rows = await GET('notifications') as NotificationEntity[];
  return rows.map(r => ({
    id: Number(r.id),
    title: r.title,
    message: r.message,
    time: r.time,
    unread: toBool(r.unread),
  }));
}
