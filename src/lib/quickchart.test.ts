import {
  buildChartUrl,
  sentimentTrendChart,
  ratingVsCompetitorsChart,
  topComplaintsChart,
  responseRateChart,
} from './quickchart';

describe('buildChartUrl', () => {
  it('returns a quickchart.io URL', () => {
    const url = buildChartUrl({ type: 'bar', data: { labels: [], datasets: [] } });
    expect(url).toMatch(/^https:\/\/quickchart\.io\/chart\?c=/);
  });

  it('encodes width and height', () => {
    const url = buildChartUrl(
      { type: 'bar', data: { labels: [], datasets: [] } },
      800,
      400
    );
    expect(url).toContain('w=800');
    expect(url).toContain('h=400');
  });
});

describe('chart convenience builders', () => {
  it('sentimentTrendChart builds a line chart URL', () => {
    const url = sentimentTrendChart(['Mon', 'Tue'], [0.8, 0.6]);
    expect(url).toContain('quickchart.io');
    expect(url).toContain('line');
  });

  it('ratingVsCompetitorsChart builds a bar chart URL', () => {
    const url = ratingVsCompetitorsChart(['Us', 'Rival'], [4.5, 4.1]);
    expect(url).toContain('bar');
  });

  it('topComplaintsChart builds a horizontalBar chart URL', () => {
    const url = topComplaintsChart(['Service', 'Price'], [5, 3]);
    expect(url).toContain('horizontalBar');
  });

  it('responseRateChart builds a doughnut chart URL', () => {
    const url = responseRateChart(10, 5);
    expect(url).toContain('doughnut');
  });
});
