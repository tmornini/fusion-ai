import { GET } from '../../../api/api';
import type { UserRow } from '../../../api/types';

export function userName(u: UserRow): string {
  return `${u.first_name} ${u.last_name}`.trim();
}

export async function getUserMap(): Promise<Map<string, UserRow>> {
  const users = await GET('users') as UserRow[];
  return new Map(users.map(u => [u.id, u]));
}

export function parseJson<T>(val: string | T): T {
  if (typeof val === 'string') {
    try { return JSON.parse(val) as T; }
    catch { return val as unknown as T; }
  }
  return val;
}
