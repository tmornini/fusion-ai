import { GET } from '../../../api/api';
import type { UserEntity } from '../../../api/types';

export function userName(user: UserEntity): string {
  return `${user.first_name} ${user.last_name}`.trim();
}

export async function getUsersById(): Promise<Map<string, UserEntity>> {
  const users = await GET('users') as UserEntity[];
  return new Map(users.map(user => [user.id, user]));
}

export function lookupUser(usersById: Map<string, UserEntity>, id: string | null | undefined, fallback = ''): string {
  if (!id) return fallback;
  const user = usersById.get(id);
  return user ? userName(user) : fallback;
}

export function parseJson<T>(value: string | T): T {
  if (typeof value === 'string') {
    try { return JSON.parse(value) as T; }
    catch { return value as unknown as T; }
  }
  return value;
}
