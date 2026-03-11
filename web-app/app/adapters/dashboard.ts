import { GET } from '../../../api/api';
import type { IdeaEntity, ProjectEntity } from '../../../api/types';
import { durationInDays, formatCompactCurrency } from '../format';

export interface GaugeCard {
  title: string;
  icon: string;
  iconCssClass: string;
  theme: 'blue' | 'green' | 'amber';
  baseline: { value: number; display: string };
  current: { value: number; display: string };
  hasOverrunWarning: boolean;
}

export async function getDashboardGauges(prefetchedProjects?: ProjectEntity[]): Promise<GaugeCard[]> {
  const allProjects = prefetchedProjects ?? await GET('projects') as ProjectEntity[];
  const projects = allProjects.filter(p => p.status === 'approved');

  const sumEstimatedDuration = projects.reduce((sum, p) => sum + p.estimated_duration, 0);
  const sumActualDuration = projects.reduce((sum, p) => sum + p.actual_duration, 0);
  const sumEstimatedCost = projects.reduce((sum, p) => sum + p.estimated_cost, 0);
  const sumActualCost = projects.reduce((sum, p) => sum + p.actual_cost, 0);
  const sumEstimatedImpact = projects.reduce((sum, p) => sum + p.estimated_impact, 0);
  const sumActualImpact = projects.reduce((sum, p) => sum + p.actual_impact, 0);

  const baselineDurationDays = durationInDays(sumEstimatedDuration);
  const currentDurationDays = durationInDays(sumActualDuration);

  return [
    {
      title: 'Time', icon: 'clock', iconCssClass: 'text-success', theme: 'green',
      baseline: { value: baselineDurationDays, display: `${baselineDurationDays}d` },
      current: { value: currentDurationDays, display: `${currentDurationDays}d` },
      hasOverrunWarning: true,
    },
    {
      title: 'Cost', icon: 'dollarSign', iconCssClass: 'text-primary', theme: 'blue',
      baseline: { value: Math.ceil(sumEstimatedCost), display: formatCompactCurrency(Math.ceil(sumEstimatedCost)) },
      current: { value: Math.ceil(sumActualCost), display: formatCompactCurrency(Math.ceil(sumActualCost)) },
      hasOverrunWarning: true,
    },
    {
      title: 'Impact', icon: 'zap', iconCssClass: 'text-warning', theme: 'amber',
      baseline: { value: sumEstimatedImpact, display: `${sumEstimatedImpact}` },
      current: { value: sumActualImpact, display: `${sumActualImpact}` },
      hasOverrunWarning: false,
    },
  ];
}

export async function getDashboardStats(prefetchedIdeas?: IdeaEntity[], prefetchedProjects?: ProjectEntity[]): Promise<{ label: string; value: number; trend: string }[]> {
  const [ideas, projects] = prefetchedIdeas && prefetchedProjects
    ? [prefetchedIdeas, prefetchedProjects]
    : await Promise.all([
        GET('ideas') as Promise<IdeaEntity[]>,
        GET('projects') as Promise<ProjectEntity[]>,
      ]);
  const doneCount = projects.filter(project => project.progress >= 90).length;
  const reviewCount = ideas.filter(idea => idea.status === 'pending_review').length;
  return [
    { label: 'Ideas', value: ideas.length, trend: '' },
    { label: 'Projects', value: projects.length, trend: '' },
    { label: 'Done', value: doneCount, trend: '' },
    { label: 'Review', value: reviewCount, trend: '' },
  ];
}
