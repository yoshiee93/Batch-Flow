import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface FormProps {
  payload: Record<string, unknown>;
  setPayload: (next: Record<string, unknown>) => void;
  fieldErrors: Record<string, string>;
}

function ErrorText({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return <p id={id} className="text-xs text-destructive" data-testid={id}>{error}</p>;
}

export function BatchStandardForm({ payload, setPayload, fieldErrors }: FormProps) {
  const description = (payload.description as string) ?? "";
  const defaultPlannedQuantity = payload.defaultPlannedQuantity;
  const defaultUnit = (payload.defaultUnit as string) ?? "";
  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="bs-description">Description</Label>
        <Textarea
          id="bs-description"
          value={description}
          onChange={(e) => setPayload({ ...payload, description: e.target.value })}
          placeholder="What this batch preset is used for"
          rows={2}
          data-testid="input-batch-template-description"
        />
        <ErrorText id="error-batch-description" error={fieldErrors.description} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="bs-qty">Default Planned Quantity</Label>
          <Input
            id="bs-qty"
            type="number"
            inputMode="decimal"
            step="0.001"
            value={defaultPlannedQuantity === undefined || defaultPlannedQuantity === null ? "" : String(defaultPlannedQuantity)}
            onChange={(e) => {
              const raw = e.target.value;
              const next = { ...payload };
              if (raw === "") delete next.defaultPlannedQuantity;
              else next.defaultPlannedQuantity = Number(raw);
              setPayload(next);
            }}
            placeholder="Optional"
            data-testid="input-batch-template-qty"
          />
          <ErrorText id="error-batch-qty" error={fieldErrors.defaultPlannedQuantity} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="bs-unit">Default Unit</Label>
          <Input
            id="bs-unit"
            value={defaultUnit}
            onChange={(e) => {
              const next = { ...payload };
              const v = e.target.value.trim();
              if (!v) delete next.defaultUnit;
              else next.defaultUnit = v;
              setPayload(next);
            }}
            placeholder="KG"
            maxLength={10}
            data-testid="input-batch-template-unit"
          />
          <ErrorText id="error-batch-unit" error={fieldErrors.defaultUnit} />
        </div>
      </div>
    </div>
  );
}

export function ProductSpecForm({ payload, setPayload, fieldErrors }: FormProps) {
  const description = (payload.description as string) ?? "";
  const defaultUnit = (payload.defaultUnit as string) ?? "";
  const notes = (payload.notes as string) ?? "";
  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="ps-description">Description</Label>
        <Textarea
          id="ps-description"
          value={description}
          onChange={(e) => setPayload({ ...payload, description: e.target.value })}
          placeholder="Describe the product spec"
          rows={2}
          data-testid="input-product-template-description"
        />
        <ErrorText id="error-product-description" error={fieldErrors.description} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="ps-unit">Default Unit</Label>
        <Input
          id="ps-unit"
          value={defaultUnit}
          onChange={(e) => {
            const next = { ...payload };
            const v = e.target.value.trim();
            if (!v) delete next.defaultUnit;
            else next.defaultUnit = v;
            setPayload(next);
          }}
          placeholder="KG"
          maxLength={10}
          data-testid="input-product-template-unit"
        />
        <ErrorText id="error-product-unit" error={fieldErrors.defaultUnit} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="ps-notes">Notes</Label>
        <Textarea
          id="ps-notes"
          value={notes}
          onChange={(e) => {
            const next = { ...payload };
            const v = e.target.value;
            if (!v) delete next.notes;
            else next.notes = v;
            setPayload(next);
          }}
          placeholder="Optional notes"
          rows={3}
          data-testid="input-product-template-notes"
        />
        <ErrorText id="error-product-notes" error={fieldErrors.notes} />
      </div>
    </div>
  );
}
