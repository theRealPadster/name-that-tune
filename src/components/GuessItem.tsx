import React from 'react';

const GuessItem = (props: {
  guesses: string[],
  won: boolean,
  index: number,
}) => {
  const correct = props.won && (props.index === props.guesses.length - 1);
  return (
    <li>{correct ? '✔' : 'x'} {props.guesses[props.index]}</li>
  );
};

export default GuessItem;
