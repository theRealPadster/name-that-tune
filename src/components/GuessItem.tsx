import React from 'react';

const GuessItem = (props: {value: string}) => {
  return (
    <li>{props.value}</li>
  );
};

export default GuessItem;
