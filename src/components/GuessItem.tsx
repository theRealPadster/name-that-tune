import React from 'react';

const GuessItem = (props: {guess: string, answer: string}) => {
  const correct = props.guess === props.answer;
  return (
    <li>{correct ? '✔' : 'x'} {props.guess}</li>
  );
};

export default GuessItem;
