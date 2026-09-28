import React from 'react';

import styles from '../css/name-that-tune-button.module.scss';

// Round is the default shape. Kept separate from the native HTML button type
// so a visual prop can never accidentally turn into an implicit form submit.
type ButtonShape = 'round' | 'circle';

// Visual weight, so that controls with different stakes do not all shout at the
// same volume. 'neutral' is the original filled pill and stays the default.
type ButtonVariant = 'neutral' | 'primary' | 'secondary' | 'tertiary';

const Button = (props: {
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  classes?: string[];
  label?: string;
  shape?: ButtonShape;
  htmlType?: 'button' | 'submit' | 'reset';
  variant?: ButtonVariant;
  children: React.ReactNode;
  disabled?: boolean;
  buttonRef?: React.Ref<HTMLButtonElement>;
}) => {
  const buttonShape = props.shape || 'round';
  const variant = props.variant || 'neutral';

  const classList = [styles.button];
  if (buttonShape === 'circle') {
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
    <button
      ref={props.buttonRef}
      type={props.htmlType || 'button'}
      className={classList.join(' ')}
      onClick={props.onClick}
      aria-label={props.label}
      disabled={props.disabled}
    >
      {props.children}
    </button>
  );
};

export default Button;
