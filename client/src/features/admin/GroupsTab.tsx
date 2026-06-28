import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Loader2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { getGroups, createGroup, updateGroup, deleteGroup, type AdminGroup } from './api';
import { VALID_PERMISSIONS } from '@shared/permissions';

const PERMISSION_GROUPS: { label: string; keys: string[] }[] = [
  { label: 'Dashboard', keys: ['dashboard.view'] },
  { label: 'Customers', keys: ['customers.view', 'customers.create', 'customers.edit', 'customers.delete'] },
  { label: 'Orders', keys: ['orders.view', 'orders.create', 'orders.edit', 'orders.delete', 'pack_orders.view', 'pack_orders.create'] },
  { label: 'Inventory', keys: ['inventory.view', 'inventory.create', 'inventory.edit'] },
  { label: 'Production', keys: ['production.view', 'production.create', 'production.edit'] },
  { label: 'Traceability', keys: ['traceability.view'] },
  { label: 'Labels', keys: ['labels.view', 'labels.print'] },
  { label: 'Reports', keys: ['reports.view', 'reports.export'] },
  { label: 'Settings', keys: ['settings.view'] },
  { label: 'Users', keys: ['users.manage'] },
  { label: 'Operations Log', keys: ['operations_log.view', 'operations_log.edit', 'operations_log.export'] },
];

function permLabel(key: string): string {
  const parts = key.split('.');
  return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' — ');
}

function GroupForm({
  group,
  onSave,
  onCancel,
  loading,
}: {
  group?: AdminGroup | null;
  onSave: (data: { name: string; description?: string | null; permissions: Record<string, boolean> }) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [name, setName] = useState(group?.name ?? '');
  const [description, setDescription] = useState(group?.description ?? '');
  const [perms, setPerms] = useState<Record<string, boolean>>(() => {
    if (group?.permissions) return { ...group.permissions };
    return Object.fromEntries((VALID_PERMISSIONS as unknown as string[]).map(k => [k, false]));
  });

  function togglePerm(key: string) {
    setPerms(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleGroup(keys: string[], val: boolean) {
    setPerms(prev => {
      const next = { ...prev };
      keys.forEach(k => { next[k] = val; });
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({ name, description: description || null, permissions: perms });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <div className="space-y-1.5">
        <Label htmlFor="g-name">Group Name</Label>
        <Input
          id="g-name"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          disabled={group?.isSystem}
          data-testid="input-group-name"
        />
        {group?.isSystem && <p className="text-xs text-muted-foreground">System group names cannot be changed.</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="g-desc">Description</Label>
        <Input id="g-desc" value={description} onChange={e => setDescription(e.target.value)} data-testid="input-group-description" />
      </div>

      <div className="space-y-2">
        <Label>Permissions</Label>
        {group?.isSystem && group?.name === "Admin" && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Shield size={12} className="text-amber-500" />
            Admin group permissions are locked full-on and cannot be edited.
          </p>
        )}
        <Accordion type="multiple" className="space-y-1">
          {PERMISSION_GROUPS.map(grp => {
            const isAdminLocked = !!(group?.isSystem && group?.name === "Admin");
            const allOn = isAdminLocked ? true : grp.keys.every(k => perms[k]);
            const someOn = isAdminLocked ? true : grp.keys.some(k => perms[k]);
            return (
              <AccordionItem key={grp.label} value={grp.label} className="border rounded-md px-3">
                <AccordionTrigger className="py-2 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={allOn}
                      data-state={someOn && !allOn ? 'indeterminate' : allOn ? 'checked' : 'unchecked'}
                      onCheckedChange={v => !isAdminLocked && toggleGroup(grp.keys, !!v)}
                      onClick={e => e.stopPropagation()}
                      disabled={isAdminLocked}
                      data-testid={`checkbox-group-${grp.label}`}
                    />
                    <span className="text-sm font-medium">{grp.label}</span>
                    <Badge variant="secondary" className="text-xs ml-1">
                      {isAdminLocked ? `${grp.keys.length}/${grp.keys.length}` : `${grp.keys.filter(k => perms[k]).length}/${grp.keys.length}`}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-2 space-y-1.5">
                  {grp.keys.map(key => (
                    <div key={key} className="flex items-center gap-2 pl-6">
                      <Switch
                        id={`perm-${key}`}
                        checked={isAdminLocked ? true : !!perms[key]}
                        onCheckedChange={() => !isAdminLocked && togglePerm(key)}
                        disabled={isAdminLocked}
                        data-testid={`switch-perm-${key}`}
                      />
                      <Label htmlFor={`perm-${key}`} className="font-mono text-xs cursor-pointer">{permLabel(key)}</Label>
                    </div>
                  ))}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>

      <DialogFooter className="sticky bottom-0 bg-background pt-2 pb-1">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>Cancel</Button>
        <Button type="submit" disabled={loading || !name} data-testid="button-save-group">
          {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {group ? 'Save changes' : 'Create group'}
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function GroupsTab() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [editGroup, setEditGroup] = useState<AdminGroup | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminGroup | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: groups = [], isLoading } = useQuery({ queryKey: ['/api/admin/groups'], queryFn: getGroups });

  async function handleCreate(data: Parameters<typeof createGroup>[0]) {
    setSaving(true);
    try {
      await createGroup(data);
      toast({ title: 'Group created' });
      qc.invalidateQueries({ queryKey: ['/api/admin/groups'] });
      setShowCreate(false);
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to create group', variant: 'destructive' });
    } finally { setSaving(false); }
  }

  async function handleUpdate(data: Parameters<typeof updateGroup>[1]) {
    if (!editGroup) return;
    setSaving(true);
    try {
      await updateGroup(editGroup.id, data);
      toast({ title: 'Group updated', description: 'Affected users will be prompted to re-authenticate.' });
      qc.invalidateQueries({ queryKey: ['/api/admin/groups'] });
      setEditGroup(null);
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to update group', variant: 'destructive' });
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteGroup(deleteTarget.id);
      toast({ title: 'Group deleted' });
      qc.invalidateQueries({ queryKey: ['/api/admin/groups'] });
      setDeleteTarget(null);
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to delete group', variant: 'destructive' });
    }
  }

  if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Permission Groups</h3>
          <p className="text-sm text-muted-foreground">Define roles and what each group can do in the system</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)} data-testid="button-create-group">
          <Plus size={14} className="mr-1" /> Add Group
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Group</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Users</TableHead>
            <TableHead>Permissions</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map(g => (
            <TableRow key={g.id} data-testid={`row-group-${g.id}`}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-1.5">
                  {g.isSystem && <Shield size={12} className="text-muted-foreground" />}
                  {g.name}
                  {g.isSystem && <Badge variant="outline" className="text-xs ml-1">System</Badge>}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">{g.description ?? '—'}</TableCell>
              <TableCell>
                <Badge variant="secondary">{g.userCount} user{g.userCount !== 1 ? 's' : ''}</Badge>
              </TableCell>
              <TableCell>
                <span className="text-sm">
                  {Object.values(g.permissions).filter(Boolean).length} / {Object.keys(g.permissions).length}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button size="icon" variant="ghost" onClick={() => setEditGroup(g)} data-testid={`button-edit-group-${g.id}`}>
                    <Pencil size={14} />
                  </Button>
                  {!g.isSystem && (
                    <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(g)} data-testid={`button-delete-group-${g.id}`}>
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {showCreate && (
        <Dialog open onOpenChange={open => { if (!open) setShowCreate(false); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Group</DialogTitle>
              <DialogDescription>Define a new permission group for users.</DialogDescription>
            </DialogHeader>
            <GroupForm onSave={handleCreate} onCancel={() => setShowCreate(false)} loading={saving} />
          </DialogContent>
        </Dialog>
      )}

      {editGroup && (
        <Dialog open onOpenChange={open => { if (!open) setEditGroup(null); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Group: {editGroup.name}</DialogTitle>
              <DialogDescription>Changes will invalidate active sessions for users in this group.</DialogDescription>
            </DialogHeader>
            <GroupForm group={editGroup} onSave={handleUpdate} onCancel={() => setEditGroup(null)} loading={saving} />
          </DialogContent>
        </Dialog>
      )}

      {deleteTarget && (
        <ConfirmDialog
          open
          onOpenChange={open => { if (!open) setDeleteTarget(null); }}
          title="Delete group"
          description={`Are you sure you want to delete "${deleteTarget.name}"? Users in this group must be reassigned first.`}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
