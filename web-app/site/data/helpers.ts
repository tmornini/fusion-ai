import { GET } from '../../../api/api';
import type { UserEntity } from '../../../api/types';

export function userName(u: UserEntity): string {
  return `${u.first_name} ${u.last_name}`.trim();
}

export async function getUserMap(): Promise<Map<string, UserEntity>> {
  const users = await GET('users') as UserEntity[];
  return new Map(users.map(u => [u.id, u]));
}

export function lookupUser(userMap: Map<string, UserEntity>, id: string | null | undefined, fallback = ''): string {
  if (!id) return fallback;
  const u = userMap.get(id);
  return u ? userName(u) : fallback;
}

export function parseJson<T>(val: string | T): T {
  if (typeof val === 'string') {
    try { return JSON.parse(val) as T; }
    catch { return val as unknown as T; }
  }
  return val;
}
