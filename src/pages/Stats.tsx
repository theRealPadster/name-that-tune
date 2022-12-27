import React from 'react';
import { TFunction } from 'i18next';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';

import { getLocalStorageDataFromKey } from '../Utils';
import { stageToTime } from '../logic';
import { STATS_KEY } from '../constants';
import Button from '../components/Button';

import { SavedStats } from '../types/name-that-tune';

import styles from '../css/app.module.scss';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Legend,
  ChartDataLabels,
);

// ChartJS.defaults.color = '#fff';
// ChartJS.defaults.backgroundColor = '#fff';
// ChartJS.defaults.borderColor = '#fff';

class Stats extends React.Component<{ t: TFunction }> {
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
    const { t } = this.props;
    // const labels = ['1s', '2s', '4s', '7s', '11s', '16s', '>16s', 'gave up'];
    const savedStats = getLocalStorageDataFromKey(STATS_KEY, {}) as SavedStats;
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
      }, {} as { [key: string]: number });

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
        // title: {
        //   display: true,
        //   text: 'Chart.js Bar Chart',
        // },
        legend: {
          display: false,
          position: 'top' as const,
        },
        datalabels: {
          color: '#fff',
          anchor: 'end',
          align: 'start',
          offset: 8,
          clip: true,
          formatter: (value) => {
            return t('stats.songWithCount', { count: value });
          },
        },
      },
      scale: {
        ticks: {
          precision: 0,
        },
      },
      // animation: false,
      animation: {
        duration: 1000,
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
          <h1 className={styles.title}>{t('title')}</h1>
          <h2>{t('stats.title')}</h2>
          <p>{t('stats.winPercentage', { percentage: (winPercentage * 100).toFixed(2) })}</p>
          <table>
            <thead>
              <tr>
                <th>{t('stats.time')}</th>
                <th>{t('stats.songs')}</th>
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
