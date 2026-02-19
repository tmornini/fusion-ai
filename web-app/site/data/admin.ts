import { GET } from '../../../api/api';
import type {
  UserEntity, AccountEntity, CompanySettingsEntity, ActivityEntity,
  NotificationCategoryEntity, NotificationPrefEntity,
} from '../../../api/types';
import { toBool } from '../../../api/types';
import { getUsersById, lookupUser } from './helpers';

// ── Account ─────────────────────────────────

export interface Account {
  company: {
    name: string;
    plan: string;
    planStatus: string;
    nextBilling: string;
    seats: number;
    usedSeats: number;
  };
  usage: {
    projects: { current: number; limit: number };
    ideas: { current: number; limit: number };
    storage: { current: number; limit: number };
    aiCredits: { current: number; limit: number };
  };
  health: { score: number; status: string; lastActivity: string; activeUsers: number };
  recentActivity: { type: string; description: string; time: string }[];
}

export async function getAccount(): Promise<Account> {
  const [account, settings, activities] = await Promise.all([
    GET('account') as Promise<AccountEntity>,
    GET('company-settings') as Promise<CompanySettingsEntity>,
    GET('activities') as Promise<ActivityEntity[]>,
  ]);

  const usersById = await getUsersById();

  return {
    company: {
      name: settings.name,
      plan: account.plan,
      planStatus: account.plan_status,
      nextBilling: account.next_billing,
      seats: account.seats,
      usedSeats: account.used_seats,
    },
    usage: {
      projects: { current: account.projects_current, limit: account.projects_limit },
      ideas: { current: account.ideas_current, limit: account.ideas_limit },
      storage: { current: account.storage_current, limit: account.storage_limit },
      aiCredits: { current: account.ai_credits_current, limit: account.ai_credits_limit },
    },
    health: { score: account.health_score, status: account.health_status, lastActivity: account.last_activity, activeUsers: account.active_users },
    recentActivity: activities.slice(0, 3).map(a => ({
      type: a.type,
      description: `${lookupUser(usersById, a.actor_id, 'Unknown')} ${a.action} ${a.target}`,
      time: a.timestamp,
    })),
  };
}

// ── Profile ─────────────────────────────────

export interface Profile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  bio: string;
}

export const allStrengths = ['Strategic Planning', 'Data Analysis', 'Stakeholder Management', 'Agile Methods', 'Team Leadership', 'Risk Management', 'Budget Planning', 'Technical Writing', 'User Research', 'Prototyping'];

export async function getProfile(): Promise<Profile> {
  const user = await GET('current-user') as UserEntity | null;
  if (!user) return { firstName: 'Alex', lastName: 'Thompson', email: 'alex.thompson@company.com', phone: '+1 (555) 123-4567', role: 'Product Manager', department: 'Product', bio: 'Passionate about building products that solve real problems.' };
  return {
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    department: user.department,
    bio: user.bio,
  };
}

// ── Company Settings ────────────────────────

export interface CompanySettingsData {
  name: string;
  domain: string;
  industry: string;
  size: string;
  timezone: string;
  language: string;
  enforceSSO: boolean;
  twoFactor: boolean;
  ipWhitelist: boolean;
  dataRetention: string;
}

export async function getCompanySettings(): Promise<CompanySettingsData> {
  const row = await GET('company-settings') as CompanySettingsEntity;
  return {
    name: row.name,
    domain: row.domain,
    industry: row.industry,
    size: row.size,
    timezone: row.timezone,
    language: row.language,
    enforceSSO: toBool(row.enforce_sso),
    twoFactor: toBool(row.two_factor),
    ipWhitelist: toBool(row.ip_whitelist),
    dataRetention: row.data_retention,
  };
}

// ── Activity Feed ───────────────────────────

export interface Activity {
  id: string;
  type: string;
  actor: string;
  action: string;
  target: string;
  timestamp: string;
  score?: number;
  status?: string;
  comment?: string;
}

export async function getActivityFeed(): Promise<Activity[]> {
  const [activities, usersById] = await Promise.all([
    GET('activities') as Promise<ActivityEntity[]>,
    getUsersById(),
  ]);
  return activities.map(a => ({
    id: a.id,
    type: a.type,
    actor: lookupUser(usersById, a.actor_id, 'Unknown'),
    action: a.action,
    target: a.target,
    timestamp: a.timestamp,
    ...(a.score != null ? { score: a.score } : {}),
    ...(a.status != null ? { status: a.status } : {}),
    ...(a.comment != null ? { comment: a.comment } : {}),
  }));
}

// ── Notification Settings ───────────────────

export interface NotificationPref {
  id: string;
  label: string;
  description: string;
  email: boolean;
  push: boolean;
}

export interface NotificationCategory {
  id: string;
  label: string;
  icon: string;
  prefs: NotificationPref[];
}

export async function getNotificationCategories(): Promise<NotificationCategory[]> {
  const [categories, prefs] = await Promise.all([
    GET('notification-categories') as Promise<NotificationCategoryEntity[]>,
    GET('notification-prefs') as Promise<NotificationPrefEntity[]>,
  ]);

  const prefsByCategory = new Map<string, NotificationPrefEntity[]>();
  for (const p of prefs) {
    const list = prefsByCategory.get(p.category_id) || [];
    list.push(p);
    prefsByCategory.set(p.category_id, list);
  }

  return categories.map(c => ({
    id: c.id,
    label: c.label,
    icon: c.icon,
    prefs: (prefsByCategory.get(c.id) || []).map(p => ({
      id: p.id,
      label: p.label,
      description: p.description,
      email: toBool(p.email),
      push: toBool(p.push),
    })),
  }));
}
