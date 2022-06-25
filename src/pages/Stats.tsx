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
import { getLocalStorageDataFromKey } from '../Utils';
import { stageToTime } from '../logic';
import { STATS_KEY } from '../constants';
import Button from '../components/Button';

import styles from '../css/app.module.scss';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

// ChartJS.defaults.color = '#fff';
// ChartJS.defaults.backgroundColor = '#fff';
// ChartJS.defaults.borderColor = '#fff';

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
    // const labels = ['1s', '2s', '4s', '7s', '11s', '16s', '>16s', 'gave up'];
    const savedStats = getLocalStorageDataFromKey(STATS_KEY, {});
    const parsedStats = Object.entries(savedStats)
      .reduce((accum, [key, value]) => {
        const stage = parseInt(key, 10);
        // I pass in -1 when saving if they gave up
        if (stage === -1) {
          accum['gave up'] = value;
        } else if (stage > 5) { // >16s
          const longOnes = accum['>16s'] || 0;
          accum['>16s'] = longOnes + value;
        } else { // stage is 0-5, output seconds
          const time = stageToTime(stage);
          accum[`${time}s`] = value;
        }
        return accum;
      }, {});

    const chartData = {
      labels: Object.keys(parsedStats),
      datasets: [
        {
          label: 'Dataset 1',
          data: Object.values(parsedStats),
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
        },
      ],
    };

    const chartOptions = {
      responsive: true,
      indexAxis: 'y' as const,
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
          enabled: false,
          callbacks: {
            label: (context) => {
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
      scale: {
        ticks: {
          precision: 0,
        },
      },
      hover: {
        animationDuration: 0,
      },
      animation: { // TODO: the label disappears for a second when you hover over the bar...
        duration: 1,
        onComplete: function({ chart }) {
          const chartInstance = chart;
          console.log(chart, chartInstance.config.options);
          const ctx = chartInstance.ctx;

          // ctx.font = ChartJS.helpers.fontString(ChartJS.defaults.global.defaultFontSize, ChartJS.defaults.global.defaultFontStyle, ChartJS.defaults.global.defaultFontFamily);
          // ctx.fillStyle = chartInstance.config.options.defaultFontColor;
          ctx.fillStyle = '#fff';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'bottom';

          chartData.datasets.forEach(function(dataset, i) {
            const meta = chartInstance.getDatasetMeta(i);
            meta.data.forEach(function(bar, index) {
              const data = dataset.data[index];
              ctx.fillText(data, bar.x - 30, bar.y + 5); // TODO: make this responsive based on how long the labels are
            });
          });
        },
      },
    };

    const totalGames = Object.values(savedStats).reduce((accum, value) => accum + value, 0);
    const winPercentage = 1 - (savedStats['-1'] || 0) / totalGames;

    console.log({
      chartData,
      totalGames,
      winPercentage,
    });

    return (
      <>
        <div className={styles.container}>
          <h1 className={styles.title}>{'🎵 Name That Tune'}</h1>
          <h2>Stats</h2>
          <p>Win percentage: {`${(winPercentage * 100).toFixed(2)}%`}</p>
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Songs</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(parsedStats).map(([key, value]) => (
                <tr key={key}>
                  <td>{key}</td>
                  <td>{value}</td>
                  <td>{(value / (totalGames) * 100).toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* TODO: add total games played and games won vs gave up */}
          <Bar options={chartOptions} data={chartData} />
        </div>
      </>
    );
  }
}

export default Stats;
