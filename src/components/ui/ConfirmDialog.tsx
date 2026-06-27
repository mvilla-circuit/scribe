import { Button } from "./Button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./Dialog";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
}

// A focused confirmation modal: title + cascade-aware description + a pair of
// actions. Enter confirms (the confirm button is autofocused), Escape cancels.
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{title}</DialogTitle>
        {description ? (
          <DialogDescription>{description}</DialogDescription>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="ghost">{cancelLabel}</Button>
          </DialogClose>
          <Button
            autoFocus
            variant={danger ? "danger" : "primary"}
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
