import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Loader2, AlertCircle, Pencil, Trash2, Tag, Star, ShieldOff } from 'lucide-react';
import {
  useLabelTemplates, useCreateLabelTemplate, useUpdateLabelTemplate, useDeleteLabelTemplate,
  parseLabelTemplateSettings,
  type LabelTemplate, type LabelTemplateType,
} from '@/features/labels/api';
import { useCustomers } from '@/features/customers/api';
import { useToast } from '@/hooks/use-toast';
import { useRole } from '@/contexts/AuthContext';
import type { LabelTemplateSettings } from '@shared/schema';

const LABEL_TYPE_LABELS: Record<LabelTemplateType, string> = {
  raw_intake: 'Raw Intake',
  finished_output: 'Finished Output',
  batch: 'Batch',
};

const DEFAULT_SETTINGS: LabelTemplateSettings = {
  showQuantity: false,
  showProductionDate: false,
  showMadeInAustralia: false,
  showExpiryDate: false,
  showBatchCode: false,
  showSupplierLot: false,
  showSource: false,
  showBarcodeText: false,
  showReceivedDate: false,
};

interface TemplateFormData {
  name: string;
  labelType: LabelTemplateType;
  customerId: string;
  isDefault: boolean;
  settings: LabelTemplateSettings;
}

const EMPTY_FORM: TemplateFormData = {
  name: '',
  labelType: 'finished_output',
  customerId: '',
  isDefault: false,
  settings: { ...DEFAULT_SETTINGS },
};

const FIELD_LABELS: { key: keyof LabelTemplateSettings; label: string; applicableTo: LabelTemplateType[] }[] = [
  { key: 'showQuantity', label: 'Quantity', applicableTo: ['raw_intake', 'finished_output', 'batch'] },
  { key: 'showBarcodeText', label: 'Barcode Number Text (below barcode)', applicableTo: ['raw_intake', 'finished_output', 'batch'] },
  { key: 'showProductionDate', label: 'Production Date', applicableTo: ['finished_output', 'batch'] },
  { key: 'showReceivedDate', label: 'Received Date', applicableTo: ['raw_intake'] },
  { key: 'showExpiryDate', label: 'Expiry / Best Before', applicableTo: ['raw_intake', 'finished_output'] },
  { key: 'showBatchCode', label: 'Batch Number', applicableTo: ['finished_output', 'batch'] },
  { key: 'showSource', label: 'Supplier / Source', applicableTo: ['raw_intake'] },
  { key: 'showSupplierLot', label: 'Supplier Lot Number', applicableTo: ['raw_intake'] },
  { key: 'showMadeInAustralia', label: 'Made in Australia', applicableTo: ['raw_intake', 'finished_output', 'batch'] },
];

export default function LabelsPage() {
  const { role } = useRole();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<LabelTemplate | null>(null);
  const [form, setForm] = useState<TemplateFormData>({ ...EMPTY_FORM });

  const { data: templates = [], isLoading, isError } = useLabelTemplates();
  const { data: customers = [] } = useCustomers();
  const createTemplate = useCreateLabelTemplate();
  const updateTemplate = useUpdateLabelTemplate();
  const deleteTemplate = useDeleteLabelTemplate();
  const { toast } = useToast();

  function resetForm() {
    setForm({ ...EMPTY_FORM, settings: { ...DEFAULT_SETTINGS } });
  }

  function openCreate() {
    resetForm();
    setIsCreateOpen(true);
  }

  function openEdit(t: LabelTemplate) {
    setSelectedTemplate(t);
    setForm({
      name: t.name,
      labelType: t.labelType,
      customerId: t.customerId ?? '',
      isDefault: t.isDefault,
      settings: parseLabelTemplateSettings(t.settings),
    });
    setIsEditOpen(true);
  }

  function setSettingFlag(key: keyof LabelTemplateSettings, value: boolean) {
    setForm(prev => ({ ...prev, settings: { ...prev.settings, [key]: value } }));
  }

  async function handleCreate() {
    if (!form.name) {
      toast({ title: "Missing name", description: "Please enter a template name", variant: "destructive" });
      return;
    }
    try {
      await createTemplate.mutateAsync({
        name: form.name,
        labelType: form.labelType,
        customerId: form.customerId || null,
        isDefault: form.isDefault,
        settings: form.settings,
      });
      toast({ title: "Template created", description: `"${form.name}" has been created` });
      setIsCreateOpen(false);
      resetForm();
    } catch {
      toast({ title: "Error", description: "Failed to create template", variant: "destructive" });
    }
  }

  async function handleUpdate() {
    if (!selectedTemplate || !form.name) return;
    try {
      await updateTemplate.mutateAsync({
        id: selectedTemplate.id,
        name: form.name,
        labelType: form.labelType,
        customerId: form.customerId || null,
        isDefault: form.isDefault,
        settings: form.settings,
      });
      toast({ title: "Template updated", description: `"${form.name}" has been saved` });
      setIsEditOpen(false);
      setSelectedTemplate(null);
    } catch {
      toast({ title: "Error", description: "Failed to update template", variant: "destructive" });
    }
  }

  async function handleDelete(t: LabelTemplate) {
    try {
      await deleteTemplate.mutateAsync(t.id);
      toast({ title: "Template deleted", description: `"${t.name}" has been removed` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete template";
      toast({ title: "Cannot delete", description: msg, variant: "destructive" });
    }
  }

  if (role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-muted-foreground">
        <ShieldOff className="h-12 w-12" />
        <p className="text-lg font-medium">Admin access required</p>
        <p className="text-sm">Label templates can only be managed by administrators.</p>
      </div>
    );
  }

  const visibleFields = FIELD_LABELS.filter(f => f.applicableTo.includes(form.labelType));

  function renderForm() {
    return (
      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <Label htmlFor="tpl-name">Template Name *</Label>
          <Input
            id="tpl-name"
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            placeholder="e.g. Customer A - Finished Output"
            data-testid="input-template-name"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="tpl-type">Label Type *</Label>
            <Select value={form.labelType} onValueChange={v => setForm(p => ({ ...p, labelType: v as LabelTemplateType }))}>
              <SelectTrigger id="tpl-type" data-testid="select-label-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="finished_output">Finished Output</SelectItem>
                <SelectItem value="raw_intake">Raw Intake</SelectItem>
                <SelectItem value="batch">Batch</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tpl-customer">Customer (optional)</Label>
            <Select
              value={form.customerId || '__none__'}
              onValueChange={v => setForm(p => ({ ...p, customerId: v === '__none__' ? '' : v }))}
            >
              <SelectTrigger id="tpl-customer" data-testid="select-template-customer">
                <SelectValue placeholder="System (no customer)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">System (no customer)</SelectItem>
                {customers.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 border rounded-md">
          <Switch
            id="tpl-default"
            checked={form.isDefault}
            onCheckedChange={v => setForm(p => ({ ...p, isDefault: v }))}
            data-testid="switch-is-default"
          />
          <div>
            <Label htmlFor="tpl-default" className="cursor-pointer font-medium">Set as default template</Label>
            <p className="text-xs text-muted-foreground">Used when no specific template is selected for this label type</p>
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Visible Fields</Label>
          <div className="border rounded-md divide-y">
            {visibleFields.map(f => (
              <div key={f.key} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-sm">{f.label}</span>
                <Switch
                  checked={form.settings[f.key] !== false}
                  onCheckedChange={v => setSettingFlag(f.key, v)}
                  data-testid={`switch-setting-${f.key}`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground">
        <AlertCircle className="h-12 w-12 mb-4" />
        <p>Failed to load label templates</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-mono font-bold" data-testid="page-title-labels">Label Templates</h1>
          <p className="text-muted-foreground mt-1">Configure field visibility and customer-specific label layouts</p>
        </div>
        <Button onClick={openCreate} data-testid="button-create-template">
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NAME</TableHead>
                <TableHead>LABEL TYPE</TableHead>
                <TableHead>CUSTOMER</TableHead>
                <TableHead>STATUS</TableHead>
                <TableHead className="w-[100px]">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No templates yet.
                  </TableCell>
                </TableRow>
              ) : templates.map(t => {
                const customer = t.customerId ? customers.find(c => c.id === t.customerId) : null;
                return (
                  <TableRow key={t.id} data-testid={`row-template-${t.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{t.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{LABEL_TYPE_LABELS[t.labelType]}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {customer ? customer.name : <span className="italic">System</span>}
                    </TableCell>
                    <TableCell>
                      {t.isDefault && (
                        <Badge className="bg-amber-100 text-amber-700 gap-1">
                          <Star className="h-3 w-3" /> Default
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(t)}
                          data-testid={`button-edit-template-${t.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {!(t.isDefault && !t.customerId) && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                data-testid={`button-delete-template-${t.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Template</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{t.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(t)} data-testid="button-confirm-delete-template">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Label Template</DialogTitle>
            <DialogDescription>Configure which fields appear on printed labels</DialogDescription>
          </DialogHeader>
          {renderForm()}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createTemplate.isPending} data-testid="button-save-template">
              {createTemplate.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Label Template</DialogTitle>
            <DialogDescription>Update which fields appear on printed labels</DialogDescription>
          </DialogHeader>
          {renderForm()}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditOpen(false); setSelectedTemplate(null); }}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateTemplate.isPending} data-testid="button-update-template">
              {updateTemplate.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
