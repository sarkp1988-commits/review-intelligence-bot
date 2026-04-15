import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  throw new Error('Missing env var: RESEND_API_KEY');
}

const resend = new Resend(process.env.RESEND_API_KEY);

export interface WeeklyReportEmailParams {
  to: string;
  restaurantName: string;
  weekEnding: string;
  summaryHtml: string;
  chartUrls: {
    sentimentTrend: string;
    ratingVsCompetitors: string;
    topComplaints: string;
    responseRate: string;
  };
}

// Send the weekly HTML digest to the restaurant owner's email.
export async function sendWeeklyReportEmail(
  params: WeeklyReportEmailParams
): Promise<void> {
  const { to, restaurantName, weekEnding, summaryHtml, chartUrls } = params;

  const from = process.env.RESEND_FROM_EMAIL ?? 'reports@yourdomain.com';

  const html = `
    <h1>${restaurantName} — Weekly Review Report</h1>
    <p><em>Week ending ${weekEnding}</em></p>
    ${summaryHtml}
    <h2>Charts</h2>
    <img src="${chartUrls.sentimentTrend}" alt="Sentiment trend" width="600" />
    <img src="${chartUrls.ratingVsCompetitors}" alt="Rating vs competitors" width="600" />
    <img src="${chartUrls.topComplaints}" alt="Top complaints" width="600" />
    <img src="${chartUrls.responseRate}" alt="Response rate" width="600" />
  `;

  const { error } = await resend.emails.send({
    from,
    to,
    subject: `${restaurantName} — Weekly Report (${weekEnding})`,
    html,
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}
