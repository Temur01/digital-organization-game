import type { ButtonHTMLAttributes } from 'react';
import styles from './ui.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  autoFocusTarget?: boolean;
}

export function Button({ variant = 'primary', className, autoFocusTarget, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      data-autofocus={autoFocusTarget ? '' : undefined}
      className={[styles.button, styles[`button_${variant}`], className].filter(Boolean).join(' ')}
      {...rest}
    />
  );
}
