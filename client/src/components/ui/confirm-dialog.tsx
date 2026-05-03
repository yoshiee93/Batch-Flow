import * as React from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ConfirmDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "destructive" | "overwrite";
  pending?: boolean;
  onConfirm: () => void | Promise<void>;
  testId?: string;
}

export function ConfirmDialog({
  trigger, open, onOpenChange,
  title, description,
  confirmLabel = "Confirm", cancelLabel = "Cancel",
  variant = "destructive", pending = false,
  onConfirm, testId,
}: ConfirmDialogProps) {
  const handleConfirm = async (e: React.MouseEvent) => {
    e.preventDefault();
    await onConfirm();
  };
  const actionClasses = variant === "destructive"
    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
    : "bg-amber-600 text-white hover:bg-amber-700";
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger> : null}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle data-testid={testId ? `${testId}-title` : undefined}>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending} data-testid={testId ? `${testId}-cancel` : undefined}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={handleConfirm}
            className={cn(actionClasses)}
            data-testid={testId ? `${testId}-confirm` : undefined}
          >
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
