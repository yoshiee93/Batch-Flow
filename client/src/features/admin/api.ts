import { apiRequest } from '@/lib/queryClient';

export interface AdminUser {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  role: string;
  active: boolean;
  groupId: string | null;
  groupName: string | null;
  isLocked: boolean;
  lockedUntil: string | null;
  failedLoginAttempts: number;
  createdAt: string;
}

export interface AdminGroup {
  id: string;
  name: string;
  description: string | null;
  permissions: Record<string, boolean>;
  isSystem: boolean;
  permissionsVersion: number;
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

export async function getUsers(): Promise<AdminUser[]> {
  const res = await fetch('/api/admin/users', { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to load users');
  return res.json();
}

export async function createUser(data: {
  username: string;
  password: string;
  fullName: string;
  email?: string | null;
  role: string;
  groupId?: string | null;
  active?: boolean;
}): Promise<AdminUser> {
  const res = await apiRequest('POST', '/api/admin/users', data);
  return res.json();
}

export async function updateUser(id: string, data: {
  fullName?: string;
  email?: string | null;
  role?: string;
  groupId?: string | null;
  active?: boolean;
}): Promise<AdminUser> {
  const res = await apiRequest('PATCH', `/api/admin/users/${id}`, data);
  return res.json();
}

export async function changePassword(id: string, password: string): Promise<void> {
  await apiRequest('PATCH', `/api/admin/users/${id}/password`, { password });
}

export async function unlockUser(id: string): Promise<void> {
  await apiRequest('POST', `/api/admin/users/${id}/unlock`, {});
}

export async function deleteUser(id: string): Promise<void> {
  await apiRequest('DELETE', `/api/admin/users/${id}`);
}

export async function getGroups(): Promise<AdminGroup[]> {
  const res = await fetch('/api/admin/groups', { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to load groups');
  return res.json();
}

export async function getGroup(id: string): Promise<AdminGroup> {
  const res = await fetch(`/api/admin/groups/${id}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to load group');
  return res.json();
}

export async function createGroup(data: {
  name: string;
  description?: string | null;
  permissions?: Record<string, boolean>;
}): Promise<AdminGroup> {
  const res = await apiRequest('POST', '/api/admin/groups', data);
  return res.json();
}

export async function updateGroup(id: string, data: {
  name?: string;
  description?: string | null;
  permissions?: Record<string, boolean>;
}): Promise<AdminGroup> {
  const res = await apiRequest('PATCH', `/api/admin/groups/${id}`, data);
  return res.json();
}

export async function deleteGroup(id: string): Promise<void> {
  await apiRequest('DELETE', `/api/admin/groups/${id}`);
}
