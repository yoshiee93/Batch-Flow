import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Unlock, Key, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  getUsers, createUser, updateUser, unlockUser, deleteUser, changePassword, getGroups,
  type AdminUser, type AdminGroup,
} from './api';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'production', label: 'Production' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'readonly', label: 'View Only' },
];

function UserForm({
  user,
  groups,
  onSave,
  onCancel,
  loading,
}: {
  user?: AdminUser | null;
  groups: AdminGroup[];
  onSave: (data: Record<string, unknown>) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(user?.role ?? 'readonly');
  const [groupId, setGroupId] = useState<string>(user?.groupId ?? '__none__');
  const [active, setActive] = useState(user?.active ?? true);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      ...(user ? {} : { username, password }),
      fullName,
      email: email || null,
      role,
      groupId: groupId === '__none__' ? null : groupId,
      active,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!user && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="u-username">Username</Label>
            <Input id="u-username" value={username} onChange={e => setUsername(e.target.value)} required data-testid="input-user-username" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="u-password">Password</Label>
            <Input id="u-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} data-testid="input-user-password" />
          </div>
        </>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="u-fullName">Full Name</Label>
        <Input id="u-fullName" value={fullName} onChange={e => setFullName(e.target.value)} required data-testid="input-user-fullname" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="u-email">Email</Label>
        <Input id="u-email" type="email" value={email} onChange={e => setEmail(e.target.value)} data-testid="input-user-email" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="u-role">Base Role</Label>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger id="u-role" data-testid="select-user-role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="u-group">Permission Group</Label>
        <Select value={groupId} onValueChange={setGroupId}>
          <SelectTrigger id="u-group" data-testid="select-user-group">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— No group —</SelectItem>
            {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="u-active" checked={active} onCheckedChange={setActive} data-testid="switch-user-active" />
        <Label htmlFor="u-active">Active</Label>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>Cancel</Button>
        <Button type="submit" disabled={loading} data-testid="button-save-user">
          {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {user ? 'Save changes' : 'Create user'}
        </Button>
      </DialogFooter>
    </form>
  );
}

function PasswordDialog({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await changePassword(userId, password);
      toast({ title: 'Password changed', description: 'The user password has been updated.' });
      onClose();
    } catch {
      toast({ title: 'Error', description: 'Failed to change password.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Change Password</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-password">New Password</Label>
            <Input id="new-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} data-testid="input-new-password" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading || password.length < 6} data-testid="button-change-password">
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Change Password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function UsersTab() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: users = [], isLoading: usersLoading } = useQuery({ queryKey: ['/api/admin/users'], queryFn: getUsers });
  const { data: groups = [] } = useQuery({ queryKey: ['/api/admin/groups'], queryFn: getGroups });

  async function handleCreate(data: Record<string, unknown>) {
    setSaving(true);
    try {
      await createUser(data as Parameters<typeof createUser>[0]);
      toast({ title: 'User created' });
      qc.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setShowCreate(false);
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to create user', variant: 'destructive' });
    } finally { setSaving(false); }
  }

  async function handleUpdate(data: Record<string, unknown>) {
    if (!editUser) return;
    setSaving(true);
    try {
      await updateUser(editUser.id, data as Parameters<typeof updateUser>[1]);
      toast({ title: 'User updated' });
      qc.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setEditUser(null);
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to update user', variant: 'destructive' });
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteUser(deleteTarget.id);
      toast({ title: 'User deleted' });
      qc.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setDeleteTarget(null);
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to delete user', variant: 'destructive' });
    }
  }

  async function handleUnlock(user: AdminUser) {
    try {
      await unlockUser(user.id);
      toast({ title: 'Account unlocked', description: `${user.fullName} can now log in.` });
      qc.invalidateQueries({ queryKey: ['/api/admin/users'] });
    } catch {
      toast({ title: 'Error', description: 'Failed to unlock account.', variant: 'destructive' });
    }
  }

  if (usersLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">System Users</h3>
          <p className="text-sm text-muted-foreground">Manage user accounts and group assignments</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)} data-testid="button-create-user">
          <Plus size={14} className="mr-1" /> Add User
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Username</TableHead>
            <TableHead>Group</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map(user => (
            <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
              <TableCell className="font-medium">{user.fullName}</TableCell>
              <TableCell className="text-muted-foreground font-mono text-sm">{user.username}</TableCell>
              <TableCell>
                {user.groupName
                  ? <Badge variant="secondary">{user.groupName}</Badge>
                  : <span className="text-muted-foreground text-xs">No group</span>}
              </TableCell>
              <TableCell className="capitalize text-sm">{user.role}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5">
                  <Badge variant={user.active ? 'default' : 'outline'}>
                    {user.active ? 'Active' : 'Inactive'}
                  </Badge>
                  {user.isLocked && (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <Lock size={10} /> Locked
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  {user.isLocked && (
                    <Button size="icon" variant="ghost" title="Unlock account" onClick={() => handleUnlock(user)} data-testid={`button-unlock-user-${user.id}`}>
                      <Unlock size={14} />
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" title="Change password" onClick={() => setPasswordTarget(user.id)} data-testid={`button-password-user-${user.id}`}>
                    <Key size={14} />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setEditUser(user)} data-testid={`button-edit-user-${user.id}`}>
                    <Pencil size={14} />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(user)} data-testid={`button-delete-user-${user.id}`}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {showCreate && (
        <Dialog open onOpenChange={open => { if (!open) setShowCreate(false); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add User</DialogTitle></DialogHeader>
            <UserForm groups={groups} onSave={handleCreate} onCancel={() => setShowCreate(false)} loading={saving} />
          </DialogContent>
        </Dialog>
      )}

      {editUser && (
        <Dialog open onOpenChange={open => { if (!open) setEditUser(null); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
            <UserForm user={editUser} groups={groups} onSave={handleUpdate} onCancel={() => setEditUser(null)} loading={saving} />
          </DialogContent>
        </Dialog>
      )}

      {deleteTarget && (
        <ConfirmDialog
          open
          onOpenChange={open => { if (!open) setDeleteTarget(null); }}
          title="Delete user"
          description={`Are you sure you want to delete "${deleteTarget.fullName}"? This cannot be undone.`}
          onConfirm={handleDelete}
        />
      )}

      {passwordTarget && (
        <PasswordDialog userId={passwordTarget} onClose={() => setPasswordTarget(null)} />
      )}
    </div>
  );
}
