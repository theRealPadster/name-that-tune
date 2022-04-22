import React from 'react';

const Button = (props: {
  disabled?: boolean;
  onClick: Function;
  children?: React.ReactNode;
}) => {
  return (
    <button
      className="main-buttons-button main-button-secondary"
      disabled={props.disabled}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
};

export default Button;
