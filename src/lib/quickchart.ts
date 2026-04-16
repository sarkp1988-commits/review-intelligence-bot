import type { QuickChartConfig } from '@/types';

const QUICKCHART_BASE = 'https://quickchart.io/chart';
const DEFAULT_WIDTH = 600;
const DEFAULT_HEIGHT = 300;

// Encode a Chart.js config into a QuickChart URL that returns a PNG.
// The URL can be passed directly to bot.api.sendPhoto().
export function buildChartUrl(
  config: QuickChartConfig,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT
): string {
  const encoded = encodeURIComponent(JSON.stringify(config));
  return `${QUICKCHART_BASE}?c=${encoded}&w=${width}&h=${height}`;
}

// Convenience builders for the four standard weekly report charts.

export function sentimentTrendChart(
  labels: string[],
  scores: number[]
): string {
  const config: QuickChartConfig = {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Sentiment score',
          data: scores,
          borderColor: '#4ade80',
          backgroundColor: 'rgba(74,222,128,0.1)',
        },
      ],
    },
  };
  return buildChartUrl(config);
}

export function ratingVsCompetitorsChart(
  names: string[],
  ratings: number[]
): string {
  const config: QuickChartConfig = {
    type: 'bar',
    data: {
      labels: names,
      datasets: [
        {
          label: 'Average rating',
          data: ratings,
          backgroundColor: names.map((_, i) =>
            i === 0 ? '#6366f1' : '#94a3b8'
          ),
        },
      ],
    },
  };
  return buildChartUrl(config);
}

export function topComplaintsChart(
  topics: string[],
  counts: number[]
): string {
  const config: QuickChartConfig = {
    type: 'horizontalBar',
    data: {
      labels: topics,
      datasets: [
        {
          label: 'Mentions',
          data: counts,
          backgroundColor: '#f87171',
        },
      ],
    },
  };
  return buildChartUrl(config);
}

export function responseRateChart(approved: number, other: number): string {
  const config: QuickChartConfig = {
    type: 'doughnut',
    data: {
      labels: ['Responded', 'Skipped / Pending'],
      datasets: [
        {
          label: 'Response rate',
          data: [approved, other],
          backgroundColor: ['#6366f1', '#e2e8f0'],
        },
      ],
    },
  };
  return buildChartUrl(config);
}
