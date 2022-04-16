import React from 'react';

const GuessItem = (props: {
  guesses: string[],
  won: boolean,
  index: number,
}) => {
  const correct = props.won && (props.index === props.guesses.length - 1);
  console.log('GuessItem props:', props);
  return (
    <li>{correct ? '✔' : 'x'} {props.guesses[props.index] || 'SKIPPED'}</li>
  );
};

export default GuessItem;
