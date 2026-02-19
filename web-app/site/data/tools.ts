import { GET } from '../../../api/api';
import type { CrunchColumnEntity, ProcessEntity } from '../../../api/types';
import { toBool } from '../../../api/types';
import { parseJson } from './helpers';

// ── Crunch ───────────────────────────────────

export interface CrunchColumn {
  id: string;
  originalName: string;
  friendlyName: string;
  dataType: string;
  description: string;
  sampleValues: string[];
  isAcronym: boolean;
  acronymExpansion: string;
}

export async function getCrunchColumns(): Promise<CrunchColumn[]> {
  const rows = await GET('crunch-columns') as CrunchColumnEntity[];
  return rows.map(r => ({
    id: r.id,
    originalName: r.original_name,
    friendlyName: r.friendly_name,
    dataType: r.data_type,
    description: r.description,
    sampleValues: parseJson<string[]>(r.sample_values),
    isAcronym: toBool(r.is_acronym),
    acronymExpansion: r.acronym_expansion,
  }));
}

// ── Flow ─────────────────────────────────────

export interface ProcessStep {
  id: string;
  title: string;
  description: string;
  owner: string;
  role: string;
  tools: string[];
  duration: string;
  order: number;
  type: 'action' | 'decision' | 'start' | 'end';
}

export interface Flow {
  processName: string;
  processDescription: string;
  processDepartment: string;
  steps: ProcessStep[];
}

export async function getFlow(): Promise<Flow> {
  const processes = await GET('processes') as ProcessEntity[];
  const process = processes[0];
  if (!process) {
    return { processName: '', processDescription: '', processDepartment: '', steps: [] };
  }

  const { getDbAdapter } = await import('../../../api/api');
  const db = getDbAdapter();
  const steps = await db.processSteps.getByProcessId(process.id);

  return {
    processName: process.name,
    processDescription: process.description,
    processDepartment: process.department,
    steps: steps.map(s => ({
      id: s.id,
      title: s.title,
      description: s.description,
      owner: s.owner,
      role: s.role,
      tools: parseJson<string[]>(s.tools),
      duration: s.duration,
      order: s.sort_order,
      type: s.type as ProcessStep['type'],
    })),
  };
}
