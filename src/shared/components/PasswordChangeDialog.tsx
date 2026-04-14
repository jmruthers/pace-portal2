import { useUnifiedAuthContext } from '@solvera/pace-core';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogPortal,
  PasswordChangeForm,
} from '@solvera/pace-core/components';

export interface PasswordChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PasswordChangeDialog({ open, onOpenChange }: PasswordChangeDialogProps) {
  const { updatePassword } = useUnifiedAuthContext();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogContent>
          <DialogBody>
            <PasswordChangeForm
              onSubmit={async ({ newPassword }) => updatePassword(newPassword)}
              onSuccess={() => onOpenChange(false)}
              onCancel={() => onOpenChange(false)}
            />
          </DialogBody>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
