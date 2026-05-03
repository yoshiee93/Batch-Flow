import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Construction, Type, Tag as TagIcon, Barcode as BarcodeIcon, QrCode, Minus, Square, Trash2, Save, RotateCcw, Printer, Loader2 } from "lucide-react";
import {
  useLabelTemplates,
  useUpdateLabelTemplate,
  parseLabelTemplateSettings,
  type LabelTemplate,
  type LabelTemplateType,
} from "@/features/labels/api";
import type { LabelElement, LabelFieldKey, LabelLayout, LabelTextAlign, LabelRotation } from "@shared/schema";
import {
  ALL_FIELD_KEYS,
  SAMPLE_CONTEXT,
  createElement,
  defaultLayout,
  fieldLabel,
  generateBarcodeSvg,
  generateQrSvg,
  printLayoutLabel,
  resolveBarcodeSource,
  resolveField,
} from "@/lib/labelLayoutPrint";
import { useToast } from "@/hooks/use-toast";

const PX_PER_MM = 4;
const LABEL_TYPE_OPTIONS: { value: LabelTemplateType; label: string }[] = [
  { value: "finished_output", label: "Finished Output" },
  { value: "raw_intake", label: "Raw Intake" },
  { value: "batch", label: "Batch" },
];

interface DragState {
  elementId: string;
  mode: "move" | "resize";
  startX: number;
  startY: number;
  startEl: LabelElement;
}

export default function CustomLabelBuilder() {
  const { data: templates = [] } = useLabelTemplates();
  const updateTemplate = useUpdateLabelTemplate();
  const { toast } = useToast();

  const [selectedId, setSelectedId] = useState<string>("");
  const [filterType, setFilterType] = useState<LabelTemplateType>("finished_output");
  const [layout, setLayout] = useState<LabelLayout>(defaultLayout());
  const [originalLayoutJson, setOriginalLayoutJson] = useState<string>(JSON.stringify(defaultLayout()));
  const [activeElementId, setActiveElementId] = useState<string | null>(null);
  const [qrSvgs, setQrSvgs] = useState<Record<string, string>>({});

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);

  const filteredTemplates = useMemo(
    () => templates.filter(t => t.labelType === filterType),
    [templates, filterType],
  );

  const selectedTemplate: LabelTemplate | undefined = useMemo(
    () => templates.find(t => t.id === selectedId),
    [templates, selectedId],
  );

  useEffect(() => {
    if (!selectedTemplate) {
      setLayout(defaultLayout());
      setOriginalLayoutJson(JSON.stringify(defaultLayout()));
      setActiveElementId(null);
      return;
    }
    const settings = parseLabelTemplateSettings(selectedTemplate.settings);
    const next: LabelLayout = settings.layout
      ? { ...settings.layout, elements: settings.layout.elements ?? [] }
      : defaultLayout();
    setLayout(next);
    setOriginalLayoutJson(JSON.stringify(next));
    setActiveElementId(null);
  }, [selectedTemplate]);

  // Auto-select first template when filter changes
  useEffect(() => {
    if (selectedTemplate && selectedTemplate.labelType === filterType) return;
    setSelectedId(filteredTemplates[0]?.id ?? "");
  }, [filterType, filteredTemplates, selectedTemplate]);

  // Pre-render QR codes for QR elements (so the canvas preview shows them)
  useEffect(() => {
    let cancelled = false;
    const elements = layout.elements ?? [];
    const qrEls = elements.filter(e => e.type === "qr");
    if (qrEls.length === 0) {
      setQrSvgs({});
      return;
    }
    (async () => {
      const next: Record<string, string> = {};
      for (const el of qrEls) {
        if (el.type !== "qr") continue;
        const value = resolveBarcodeSource(el.source, SAMPLE_CONTEXT) || " ";
        next[el.id] = await generateQrSvg(value);
      }
      if (!cancelled) setQrSvgs(next);
    })();
    return () => { cancelled = true; };
  }, [layout.elements]);

  const isDirty = JSON.stringify(layout) !== originalLayoutJson;

  function addElement(type: LabelElement["type"]) {
    const newEl = createElement(type);
    setLayout(prev => ({ ...prev, elements: [...(prev.elements ?? []), newEl] }));
    setActiveElementId(newEl.id);
  }

  function removeElement(id: string) {
    setLayout(prev => ({ ...prev, elements: (prev.elements ?? []).filter(e => e.id !== id) }));
    if (activeElementId === id) setActiveElementId(null);
  }

  function updateElement(id: string, patch: Partial<LabelElement>) {
    setLayout(prev => ({
      ...prev,
      elements: (prev.elements ?? []).map(e => (e.id === id ? ({ ...e, ...patch } as LabelElement) : e)),
    }));
  }

  function clampElement(el: LabelElement, w: number, h: number): LabelElement {
    return {
      ...el,
      x: Math.max(0, Math.min(el.x, w - 1)),
      y: Math.max(0, Math.min(el.y, h - 1)),
      width: Math.max(2, Math.min(el.width, w - el.x)),
      height: Math.max(el.type === "line" ? 0.2 : 2, Math.min(el.height, h - el.y)),
    };
  }

  function startDrag(e: React.PointerEvent, el: LabelElement, mode: "move" | "resize") {
    e.preventDefault();
    e.stopPropagation();
    setActiveElementId(el.id);
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = {
      elementId: el.id,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      startEl: { ...el },
    };
  }

  function onPointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    const dxMm = (e.clientX - drag.startX) / PX_PER_MM;
    const dyMm = (e.clientY - drag.startY) / PX_PER_MM;
    const w = layout.width ?? 60;
    const h = layout.height ?? 40;
    if (drag.mode === "move") {
      const next: LabelElement = {
        ...drag.startEl,
        x: drag.startEl.x + dxMm,
        y: drag.startEl.y + dyMm,
      };
      updateElement(drag.elementId, clampElement(next, w, h));
    } else {
      const next: LabelElement = {
        ...drag.startEl,
        width: drag.startEl.width + dxMm,
        height: drag.startEl.height + dyMm,
      };
      updateElement(drag.elementId, clampElement(next, w, h));
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    if (dragRef.current) {
      try { (e.target as Element).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
      dragRef.current = null;
    }
  }

  async function handleSave() {
    if (!selectedTemplate) {
      toast({ title: "Select a template", description: "Pick or create a template before saving the layout.", variant: "destructive" });
      return;
    }
    const baseSettings = parseLabelTemplateSettings(selectedTemplate.settings);
    try {
      await updateTemplate.mutateAsync({
        id: selectedTemplate.id,
        settings: { ...baseSettings, layout },
      });
      setOriginalLayoutJson(JSON.stringify(layout));
      toast({ title: "Layout saved", description: `Layout for "${selectedTemplate.name}" saved.` });
    } catch {
      toast({ title: "Save failed", description: "Could not save layout.", variant: "destructive" });
    }
  }

  function handleReset() {
    try {
      setLayout(JSON.parse(originalLayoutJson) as LabelLayout);
      setActiveElementId(null);
    } catch {
      setLayout(defaultLayout());
    }
  }

  async function handleDeleteLayout() {
    if (!selectedTemplate) return;
    const baseSettings = parseLabelTemplateSettings(selectedTemplate.settings);
    const { layout: _, ...rest } = baseSettings;
    try {
      await updateTemplate.mutateAsync({ id: selectedTemplate.id, settings: rest });
      const empty = defaultLayout();
      setLayout(empty);
      setOriginalLayoutJson(JSON.stringify(empty));
      toast({ title: "Layout cleared", description: "This template will use the legacy printer." });
    } catch {
      toast({ title: "Clear failed", description: "Could not clear layout.", variant: "destructive" });
    }
  }

  async function handlePrintTest() {
    await printLayoutLabel(layout, SAMPLE_CONTEXT, selectedTemplate?.name ?? "Label preview");
  }

  const labelW = layout.width ?? 60;
  const labelH = layout.height ?? 40;
  const activeElement = (layout.elements ?? []).find(e => e.id === activeElementId) ?? null;

  return (
    <Card data-testid="card-custom-label-builder">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Construction className="h-5 w-5" />
          Custom Label Builder
        </CardTitle>
        <CardDescription>
          Pick a template, set its size in millimeters, and drag elements onto the canvas. Save to persist the layout into the template. Use the Label Templates section above to create new templates.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Label Type</Label>
            <Select value={filterType} onValueChange={v => setFilterType(v as LabelTemplateType)}>
              <SelectTrigger data-testid="select-builder-label-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LABEL_TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Template</Label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger data-testid="select-builder-template">
                <SelectValue placeholder={filteredTemplates.length === 0 ? "No templates yet" : "Select template"} />
              </SelectTrigger>
              <SelectContent>
                {filteredTemplates.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}{t.isDefault ? " (default)" : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label htmlFor="label-w-mm">Width (mm)</Label>
            <Input
              id="label-w-mm"
              type="number"
              min={10}
              max={300}
              value={labelW}
              onChange={e => setLayout(p => ({ ...p, width: Math.max(10, parseInt(e.target.value) || 10) }))}
              data-testid="input-label-width"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="label-h-mm">Height (mm)</Label>
            <Input
              id="label-h-mm"
              type="number"
              min={10}
              max={300}
              value={labelH}
              onChange={e => setLayout(p => ({ ...p, height: Math.max(10, parseInt(e.target.value) || 10) }))}
              data-testid="input-label-height"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => addElement("text")} data-testid="button-add-text"><Type className="h-4 w-4 mr-1" />Text</Button>
          <Button size="sm" variant="outline" onClick={() => addElement("field")} data-testid="button-add-field"><TagIcon className="h-4 w-4 mr-1" />Field</Button>
          <Button size="sm" variant="outline" onClick={() => addElement("barcode")} data-testid="button-add-barcode"><BarcodeIcon className="h-4 w-4 mr-1" />Barcode</Button>
          <Button size="sm" variant="outline" onClick={() => addElement("qr")} data-testid="button-add-qr"><QrCode className="h-4 w-4 mr-1" />QR</Button>
          <Button size="sm" variant="outline" onClick={() => addElement("line")} data-testid="button-add-line"><Minus className="h-4 w-4 mr-1" />Line</Button>
          <Button size="sm" variant="outline" onClick={() => addElement("box")} data-testid="button-add-box"><Square className="h-4 w-4 mr-1" />Box</Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-2">
            <div className="text-xs text-muted-foreground">Preview at {PX_PER_MM}× scale. Drag elements to move; drag the corner handle to resize.</div>
            <div
              ref={canvasRef}
              className="relative border rounded-md bg-muted/40 overflow-auto"
              style={{ padding: 16 }}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
            >
              <div
                className="relative bg-white shadow-sm"
                style={{ width: `${labelW * PX_PER_MM}px`, height: `${labelH * PX_PER_MM}px`, border: "1px dashed #aaa" }}
                onPointerDown={() => setActiveElementId(null)}
                data-testid="canvas-label"
              >
                {(layout.elements ?? []).map(el => {
                  const isActive = el.id === activeElementId;
                  const style: React.CSSProperties = {
                    position: "absolute",
                    left: `${el.x * PX_PER_MM}px`,
                    top: `${el.y * PX_PER_MM}px`,
                    width: `${el.width * PX_PER_MM}px`,
                    height: `${el.height * PX_PER_MM}px`,
                    outline: isActive ? "2px solid #2563eb" : "1px dashed rgba(0,0,0,0.25)",
                    cursor: "move",
                    userSelect: "none",
                    boxSizing: "border-box",
                  };
                  return (
                    <div
                      key={el.id}
                      style={style}
                      onPointerDown={(e) => startDrag(e, el, "move")}
                      data-testid={`canvas-element-${el.type}-${el.id}`}
                    >
                      <ElementPreview el={el} qrSvg={qrSvgs[el.id]} />
                      {isActive && (
                        <div
                          onPointerDown={(e) => startDrag(e, el, "resize")}
                          style={{
                            position: "absolute",
                            right: -6, bottom: -6,
                            width: 12, height: 12,
                            background: "#2563eb",
                            cursor: "nwse-resize",
                            borderRadius: 2,
                          }}
                          data-testid={`canvas-resize-${el.id}`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button size="sm" onClick={handleSave} disabled={!selectedTemplate || updateTemplate.isPending || !isDirty} data-testid="button-save-layout">
                {updateTemplate.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                Save Layout
              </Button>
              <Button size="sm" variant="outline" onClick={handleReset} disabled={!isDirty} data-testid="button-reset-layout">
                <RotateCcw className="h-4 w-4 mr-1" /> Reset
              </Button>
              <Button size="sm" variant="outline" onClick={handlePrintTest} data-testid="button-print-test">
                <Printer className="h-4 w-4 mr-1" /> Print Test Label
              </Button>
              {selectedTemplate && (
                <Button size="sm" variant="ghost" onClick={handleDeleteLayout} disabled={updateTemplate.isPending} data-testid="button-delete-layout">
                  <Trash2 className="h-4 w-4 mr-1" /> Delete Layout
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-medium">Properties</div>
            {!activeElement ? (
              <div className="rounded-md border border-dashed p-4 text-xs text-muted-foreground" data-testid="props-empty">
                Select an element on the canvas to edit its properties.
              </div>
            ) : (
              <ElementProperties
                element={activeElement}
                onChange={(patch) => updateElement(activeElement.id, patch)}
                onDelete={() => removeElement(activeElement.id)}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ElementPreview({ el, qrSvg }: { el: LabelElement; qrSvg?: string }) {
  const ctx = SAMPLE_CONTEXT;
  switch (el.type) {
    case "text": {
      return (
        <div style={{
          width: "100%", height: "100%",
          fontSize: `${(el.fontSize ?? 12)}px`,
          textAlign: el.align ?? "left",
          fontWeight: el.bold ? 700 : 400,
          lineHeight: 1.1, overflow: "hidden",
          transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
        }}>{el.text}</div>
      );
    }
    case "field": {
      const value = resolveField(el.fieldKey, ctx);
      return (
        <div style={{
          width: "100%", height: "100%",
          fontSize: `${(el.fontSize ?? 12)}px`,
          textAlign: el.align ?? "left",
          fontWeight: el.bold ? 700 : 400,
          lineHeight: 1.1, overflow: "hidden",
          transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
        }}>{el.prefix ?? ""}{value}</div>
      );
    }
    case "barcode": {
      const value = resolveBarcodeSource(el.source, ctx);
      const svg = generateBarcodeSvg(value || " ", !!el.showText, 60);
      return (
        <div
          style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
          dangerouslySetInnerHTML={{ __html: svg.replace(/<svg([^>]*)>/, '<svg$1 style="width:100%;height:100%;" preserveAspectRatio="none">') }}
        />
      );
    }
    case "qr": {
      if (!qrSvg) return <div className="text-[9px] text-muted-foreground text-center">QR…</div>;
      return (
        <div
          style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
          dangerouslySetInnerHTML={{ __html: qrSvg.replace(/<svg([^>]*)>/, '<svg$1 style="width:100%;height:100%;" preserveAspectRatio="xMidYMid meet">') }}
        />
      );
    }
    case "line":
      return <div style={{ width: "100%", borderTop: `${(el.stroke ?? 0.5) * PX_PER_MM}px solid #000` }} />;
    case "box":
      return <div style={{ width: "100%", height: "100%", border: `${(el.stroke ?? 0.5) * PX_PER_MM}px solid #000` }} />;
  }
}

function ElementProperties({
  element,
  onChange,
  onDelete,
}: {
  element: LabelElement;
  onChange: (patch: Partial<LabelElement>) => void;
  onDelete: () => void;
}) {
  return (
    <div className="space-y-2 rounded-md border p-3 text-sm" data-testid="props-element">
      <div className="flex items-center justify-between">
        <span className="font-medium capitalize">{element.type}</span>
        <Button size="icon" variant="ghost" onClick={onDelete} data-testid="button-delete-element">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NumField label="X (mm)" value={element.x} onChange={(v) => onChange({ x: v } as Partial<LabelElement>)} testId="input-prop-x" />
        <NumField label="Y (mm)" value={element.y} onChange={(v) => onChange({ y: v } as Partial<LabelElement>)} testId="input-prop-y" />
        <NumField label="W (mm)" value={element.width} onChange={(v) => onChange({ width: v } as Partial<LabelElement>)} testId="input-prop-w" />
        <NumField label="H (mm)" value={element.height} onChange={(v) => onChange({ height: v } as Partial<LabelElement>)} testId="input-prop-h" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Rotation</Label>
        <Select value={String(element.rotation ?? 0)} onValueChange={(v) => onChange({ rotation: Number(v) as LabelRotation } as Partial<LabelElement>)}>
          <SelectTrigger data-testid="select-prop-rotation"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[0, 90, 180, 270].map(r => <SelectItem key={r} value={String(r)}>{r}°</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {element.type === "text" && (
        <>
          <div className="space-y-1">
            <Label className="text-xs">Text</Label>
            <Input value={element.text} onChange={(e) => onChange({ text: e.target.value })} data-testid="input-prop-text" />
          </div>
          <TextStyleProps element={element} onChange={onChange} />
        </>
      )}
      {element.type === "field" && (
        <>
          <div className="space-y-1">
            <Label className="text-xs">Field</Label>
            <Select value={element.fieldKey} onValueChange={(v) => onChange({ fieldKey: v as LabelFieldKey } as Partial<LabelElement>)}>
              <SelectTrigger data-testid="select-prop-field"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ALL_FIELD_KEYS.map(k => <SelectItem key={k} value={k}>{fieldLabel(k)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Prefix (optional)</Label>
            <Input value={element.prefix ?? ""} onChange={(e) => onChange({ prefix: e.target.value } as Partial<LabelElement>)} placeholder="e.g. 'Lot: '" data-testid="input-prop-prefix" />
          </div>
          <TextStyleProps element={element} onChange={onChange} />
        </>
      )}
      {(element.type === "barcode" || element.type === "qr") && (
        <div className="space-y-1">
          <Label className="text-xs">Value Source</Label>
          <Select value={element.source} onValueChange={(v) => onChange({ source: v as "barcodeValue" | "lotNumber" | "batchCode" } as Partial<LabelElement>)}>
            <SelectTrigger data-testid="select-prop-source"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="barcodeValue">Barcode Value</SelectItem>
              <SelectItem value="lotNumber">Lot Number</SelectItem>
              <SelectItem value="batchCode">Batch Code</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      {element.type === "barcode" && (
        <div className="flex items-center justify-between pt-1">
          <Label className="text-xs">Show text under barcode</Label>
          <Switch checked={!!element.showText} onCheckedChange={(v) => onChange({ showText: v } as Partial<LabelElement>)} data-testid="switch-prop-show-text" />
        </div>
      )}
      {(element.type === "line" || element.type === "box") && (
        <NumField label="Stroke (mm)" value={element.stroke ?? 0.5} step={0.1} onChange={(v) => onChange({ stroke: v } as Partial<LabelElement>)} testId="input-prop-stroke" />
      )}
    </div>
  );
}

function TextStyleProps({ element, onChange }: { element: LabelElement; onChange: (patch: Partial<LabelElement>) => void }) {
  if (element.type !== "text" && element.type !== "field") return null;
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <NumField label="Font (px)" value={element.fontSize ?? 12} onChange={(v) => onChange({ fontSize: v } as Partial<LabelElement>)} testId="input-prop-fontsize" />
        <div className="space-y-1">
          <Label className="text-xs">Align</Label>
          <Select value={element.align ?? "left"} onValueChange={(v) => onChange({ align: v as LabelTextAlign } as Partial<LabelElement>)}>
            <SelectTrigger data-testid="select-prop-align"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="right">Right</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center justify-between pt-1">
        <Label className="text-xs">Bold</Label>
        <Switch checked={!!element.bold} onCheckedChange={(v) => onChange({ bold: v } as Partial<LabelElement>)} data-testid="switch-prop-bold" />
      </div>
    </>
  );
}

function NumField({ label, value, onChange, step, testId }: { label: string; value: number; onChange: (v: number) => void; step?: number; testId?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        step={step ?? 1}
        value={Number.isFinite(value) ? Math.round(value * 100) / 100 : 0}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        data-testid={testId}
      />
    </div>
  );
}
