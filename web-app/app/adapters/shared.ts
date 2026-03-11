import { GET } from '../../../api/api';
import type { UserEntity, NotificationEntity, CompanySettingsEntity } from '../../../api/types';
import { toBool, User } from '../../../api/types';
export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: string;
  company: string;
  avatar?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  isUnread: boolean;
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const [row, settings] = await Promise.all([
    GET('current-user') as Promise<UserEntity>,
    GET('company-settings') as Promise<CompanySettingsEntity>,
  ]);
  return {
    id: row.id,
    name: new User(row).fullName(),
    email: row.email,
    role: row.role,
    company: settings.name,
  };
}

export async function getNotifications(): Promise<Notification[]> {
  const rows = await GET('notifications') as NotificationEntity[];
  return rows.map(row => ({
    id: row.id,
    title: row.title,
    message: row.message,
    time: row.time,
    isUnread: toBool(row.is_unread),
  }));
}
