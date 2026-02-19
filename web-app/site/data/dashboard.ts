import { GET } from '../../../api/api';
import type { IdeaRow, ProjectRow } from '../../../api/types';

export interface GaugeCardData {
  title: string;
  icon: string;
  iconClass: string;
  theme: 'blue' | 'green' | 'amber';
  outer: { value: number; max: number; label: string; display: string };
  inner: { value: number; max: number; label: string; display: string };
}

export interface QuickAction {
  label: string;
  icon: string;
  href: string;
}

export async function getDashboardGauges(): Promise<GaugeCardData[]> {
  const projects = await GET('projects') as ProjectRow[];
  const totalEstTime = projects.reduce((s, p) => s + p.estimated_time, 0);
  const totalActTime = projects.reduce((s, p) => s + p.actual_time, 0);
  const totalEstCost = projects.reduce((s, p) => s + p.estimated_cost, 0);
  const totalActCost = projects.reduce((s, p) => s + p.actual_cost, 0);
  const avgEstImpact = projects.length ? Math.round(projects.reduce((s, p) => s + p.estimated_impact, 0) / projects.length) : 0;
  const avgActImpact = projects.length ? Math.round(projects.filter(p => p.actual_impact > 0).reduce((s, p) => s + p.actual_impact, 0) / Math.max(1, projects.filter(p => p.actual_impact > 0).length)) : 0;

  return [
    {
      title: 'Time Tracking', icon: 'clock', iconClass: 'text-success', theme: 'green',
      outer: { value: Math.round(totalActTime / 24), max: Math.round(totalEstTime / 24), label: 'Total Duration', display: `${Math.round(totalEstTime / 24)}d` },
      inner: { value: Math.round(totalActTime / 48), max: Math.round(totalEstTime / 24), label: 'Days Elapsed', display: `${Math.round(totalActTime / 48)}d` },
    },
    {
      title: 'Cost Overview', icon: 'dollarSign', iconClass: 'text-primary', theme: 'blue',
      outer: { value: totalActCost, max: totalEstCost, label: 'Budget Spent', display: `$${(totalActCost / 1000).toFixed(1)}K` },
      inner: { value: Math.round(totalActCost * 0.6), max: totalEstCost, label: 'ROI Generated', display: `$${(totalActCost * 0.6 / 1000).toFixed(0)}K` },
    },
    {
      title: 'Project Impact', icon: 'zap', iconClass: 'text-warning', theme: 'amber',
      outer: { value: avgEstImpact, max: 100, label: 'Target Score', display: `${avgEstImpact}%` },
      inner: { value: avgActImpact, max: 100, label: 'Current Score', display: `${avgActImpact}%` },
    },
  ];
}

export async function getDashboardQuickActions(): Promise<QuickAction[]> {
  return [
    { label: 'New Idea', icon: 'lightbulb', href: '../../core/idea-create/index.html' },
    { label: 'Create Project', icon: 'folderKanban', href: '../../core/projects/index.html' },
    { label: 'Invite Team', icon: 'users', href: '../../admin/team/index.html' },
    { label: 'View Reports', icon: 'trendingUp', href: '../../core/dashboard/index.html' },
  ];
}

export async function getDashboardStats(): Promise<{ label: string; value: number; trend: string }[]> {
  const [ideas, projects] = await Promise.all([
    GET('ideas') as Promise<IdeaRow[]>,
    GET('projects') as Promise<ProjectRow[]>,
  ]);
  const doneCount = projects.filter(p => p.progress >= 90).length;
  const reviewCount = ideas.filter(i => i.status === 'pending_review').length;
  return [
    { label: 'Ideas', value: ideas.length, trend: `+${Math.min(3, ideas.length)}` },
    { label: 'Projects', value: projects.length, trend: `+${Math.min(1, projects.length)}` },
    { label: 'Done', value: doneCount, trend: '' },
    { label: 'Review', value: reviewCount, trend: '' },
  ];
}
