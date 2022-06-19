import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import faker from 'faker';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

const options = {
  responsive: true,
  plugins: {
    legend: {
      display: false,
      position: 'top' as const,
    },
    // title: {
    //   display: true,
    //   text: 'Chart.js Bar Chart',
    // },
    tooltip: {
      // enabled: false,
      callbacks: {
        label: function(context) {
          // let label = context.dataset.label || '';
          // if (label) label += ': ';
          let label = '';
          if (context.parsed.y !== null) {
            // label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.y);
            label += context.parsed.y + ' songs';
          }
          return label;
        },
      },
    },
  },
};

// TODO: can I dynamically make this as long as I have data for, or just cap at >16s?
const labels = ['1s', '2s', '4s', '7s', '11s', '16s', '>16s'];

const data = {
  labels,
  datasets: [
    {
      label: 'Dataset 1',
      data: labels.map(() => faker.datatype.number({ min: 0, max: 1000 })),
      backgroundColor: 'rgba(255, 99, 132, 0.5)',
    },
  ],
};

import styles from '../css/app.module.scss';

import Button from '../components/Button';

class Stats extends React.Component {
  state = {
    // // What guess you're on
    // stage: 0,
    // // The current guess
    // guess: '',
    // // Past guesses
    // guesses: [],
    // gameState: GameState.Playing,
  };

  constructor(props: any) {
    super(props);
  }

  render() {
    return (
      <>
        <div className={styles.container}>
          <h1 className={styles.title}>{'🎵 Name That Tune'}</h1>
          <h2>Stats</h2>
          <Bar options={options} data={data} />
        </div>
      </>
    );
  }
}

export default Stats;
