import { GET } from '../../../api/api';
import type { UserEntity } from '../../../api/types';
import { userName, parseJson } from './helpers';

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  availability: number;
  performanceScore: number;
  projectsCompleted: number;
  currentProjects: number;
  strengths: string[];
  teamDimensions: Record<string, number>;
  status: string;
}

export async function getTeamMembers(): Promise<TeamMember[]> {
  const rows = await GET('users') as UserEntity[];
  return rows
    .filter(u => u.id !== 'current' && u.department !== '' && u.performance_score > 0)
    .slice(0, 6)
    .map(u => ({
      id: u.id,
      name: userName(u),
      role: u.role,
      department: u.department,
      email: u.email,
      availability: u.availability,
      performanceScore: u.performance_score,
      projectsCompleted: u.projects_completed,
      currentProjects: u.current_projects,
      strengths: parseJson<string[]>(u.strengths),
      teamDimensions: parseJson<Record<string, number>>(u.team_dimensions),
      status: u.status,
    }));
}

// ── Manage Users ────────────────────────────

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'member' | 'viewer';
  department: string;
  status: 'active' | 'pending' | 'deactivated';
  lastActive: string;
}

export async function getManagedUsers(): Promise<ManagedUser[]> {
  const rows = await GET('users') as UserEntity[];
  return rows
    .filter(u => u.id !== 'current')
    .map(u => ({
      id: u.id,
      name: userName(u),
      email: u.email,
      role: u.role as ManagedUser['role'],
      department: u.department,
      status: u.status as ManagedUser['status'],
      lastActive: u.last_active,
    }));
}
