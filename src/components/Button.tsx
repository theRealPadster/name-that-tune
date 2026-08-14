import React from 'react';

import styles from '../css/name-that-tune-button.module.scss';

// Round is the default style
// Circle is used by the install/remove button
type ButtonType = 'round' | 'circle';

// Visual weight, so that controls with different stakes do not all shout at the
// same volume. 'neutral' is the original filled pill and stays the default.
type ButtonVariant = 'neutral' | 'primary' | 'secondary' | 'tertiary';

const Button = (props: {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  classes?: string[];
  label?: string;
  type?: ButtonType;
  variant?: ButtonVariant;
  children: React.ReactNode;
  disabled?: boolean;
}) => {
  const buttonType = props.type || 'round';
  const variant = props.variant || 'neutral';

  const classList = [styles.button];
  if (buttonType === 'circle') {
    classList.push(styles.circle);
  }
  if (variant === 'primary') {
    classList.push(styles.primary);
  } else if (variant === 'secondary') {
    classList.push(styles.secondary);
  } else if (variant === 'tertiary') {
    classList.push(styles.tertiary);
  }
  if (props.classes) {
    classList.push(...props.classes);
  }

  return (
    <button className={classList.join(' ')} onClick={props.onClick} aria-label={props.label} disabled={props.disabled}>
      {props.children}
    </button>
  );
};

export default Button;
