import { ui } from '../content/uz/ui';
import { Button } from './Button';
import { Modal } from './Modal';
import styles from './ui.module.css';

interface ConfirmDialogProps {
  title: string;
  text: string;
  confirmLabel?: string;
  onConfirm(): void;
  onCancel(): void;
}

export function ConfirmDialog({ title, text, confirmLabel = ui.common.confirm, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Modal title={title} onEscape={onCancel} size="sm">
      <p>{text}</p>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onCancel} autoFocusTarget>
          {ui.common.cancel}
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
