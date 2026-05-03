import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Loader2, Pencil, Plus, Trash2, FileText, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ApiValidationError } from "@/lib/fetchApi";
import {
  useTemplates, useCreateTemplate, useUpdateTemplate, useDeleteTemplate, type Template,
} from "@/features/templates/api";
import { getTemplateKind } from "@shared/templateKinds";

export interface TemplatesPanelProps {
  kind: string;
  renderForm: (
    payload: Record<string, unknown>,
    setPayload: (next: Record<string, unknown>) => void,
    fieldErrors: Record<string, string>,
  ) => React.ReactNode;
  defaultPayload: Record<string, unknown>;
}

export default function TemplatesPanel({ kind, renderForm, defaultPayload }: TemplatesPanelProps) {
  const def = getTemplateKind(kind);
  const { data: templates = [], isLoading } = useTemplates(kind);
  const create = useCreateTemplate();
  const update = useUpdateTemplate();
  const remove = useDeleteTemplate();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [name, setName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [payload, setPayload] = useState<Record<string, unknown>>(defaultPayload);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const title = def?.displayName ?? kind;
  const description = def?.description ?? "";
  const testIdBase = useMemo(() => kind.replace(/[^a-z0-9]+/gi, "-"), [kind]);

  const reset = () => {
    setEditing(null);
    setName("");
    setIsDefault(false);
    setPayload(defaultPayload);
    setFieldErrors({});
  };

  const openCreate = () => {
    reset();
    setIsOpen(true);
  };

  const openEdit = (tpl: Template) => {
    setEditing(tpl);
    setName(tpl.name);
    setIsDefault(tpl.isDefault);
    setPayload({ ...defaultPayload, ...(tpl.payload as Record<string, unknown>) });
    setFieldErrors({});
    setIsOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: "Missing name", description: "Please enter a template name", variant: "destructive" });
      return;
    }
    setFieldErrors({});
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, name: name.trim(), isDefault, payload });
        toast({ title: "Template updated", description: `"${name.trim()}" saved` });
      } else {
        await create.mutateAsync({ kind, name: name.trim(), isDefault, payload });
        toast({ title: "Template created", description: `"${name.trim()}" added` });
      }
      setIsOpen(false);
      reset();
    } catch (err) {
      if (err instanceof ApiValidationError) {
        const mapped: Record<string, string> = {};
        for (const [k, v] of Object.entries(err.fields)) {
          const key = k.startsWith("payload.") ? k.slice("payload.".length) : k;
          mapped[key] = v;
        }
        setFieldErrors(mapped);
        toast({ title: "Validation failed", description: err.message, variant: "destructive" });
      } else {
        toast({ title: "Save failed", description: err instanceof Error ? err.message : "Could not save template", variant: "destructive" });
      }
    }
  };

  const handleDelete = async (tpl: Template) => {
    try {
      await remove.mutateAsync(tpl.id);
      toast({ title: "Template deleted", description: `"${tpl.name}" removed` });
    } catch (err) {
      toast({ title: "Delete failed", description: err instanceof Error ? err.message : "Could not delete", variant: "destructive" });
    }
  };

  const isPending = create.isPending || update.isPending;

  return (
    <Card data-testid={`card-templates-${testIdBase}`}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {title}
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        <Button onClick={openCreate} data-testid={`button-add-template-${testIdBase}`}>
          <Plus className="h-4 w-4 mr-2" />
          Add Template
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No templates yet</p>
            <p className="text-sm">Add a reusable template to speed up data entry</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[160px]">Name</TableHead>
                  <TableHead className="text-center min-w-[100px]">Default</TableHead>
                  <TableHead className="min-w-[200px]">Summary</TableHead>
                  <TableHead className="text-right min-w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((t) => {
                  const desc = (t.payload as Record<string, unknown>)?.description;
                  return (
                    <TableRow key={t.id} data-testid={`row-template-${testIdBase}-${t.id}`}>
                      <TableCell className="font-medium" data-testid={`text-template-name-${t.id}`}>{t.name}</TableCell>
                      <TableCell className="text-center">
                        {t.isDefault ? (
                          <span className="inline-flex items-center gap-1 text-primary">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-xs">Default</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate max-w-[280px]">
                        {typeof desc === "string" && desc ? desc : <span className="italic">—</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(t)} data-testid={`button-edit-template-${t.id}`}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <ConfirmDialog
                            trigger={
                              <Button variant="ghost" size="icon" data-testid={`button-delete-template-${t.id}`}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            }
                            title="Delete Template"
                            description={`Are you sure you want to delete "${t.name}"?`}
                            confirmLabel="Delete"
                            variant="destructive"
                            onConfirm={() => handleDelete(t)}
                            pending={remove.isPending}
                            testId={`confirm-delete-template-${t.id}`}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={isOpen} onOpenChange={(o) => { setIsOpen(o); if (!o) reset(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Template" : "Add Template"}</DialogTitle>
            <DialogDescription>
              {title} — reusable preset.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor={`tpl-name-${testIdBase}`}>Template Name</Label>
              <Input
                id={`tpl-name-${testIdBase}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., 25kg standard run"
                data-testid={`input-template-name-${testIdBase}`}
              />
            </div>
            {renderForm(payload, setPayload, fieldErrors)}
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <div className="space-y-0.5">
                <Label className="font-normal">Default for this type</Label>
                <p className="text-xs text-muted-foreground">When set, this template is auto-selected for new entries.</p>
              </div>
              <Switch
                checked={isDefault}
                onCheckedChange={setIsDefault}
                data-testid={`switch-template-default-${testIdBase}`}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsOpen(false); reset(); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={isPending} data-testid={`button-save-template-${testIdBase}`}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
