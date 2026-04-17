const proofPoints = [
  { value: "4-6 hrs", label: "saved weekly on review management" },
  { value: "< 90 sec", label: "from onboarding to first insight report" },
  { value: "70%+", label: "draft approval target by week four" },
];

const steps = [
  {
    title: "Google reviews are collected daily",
    text: "The bot watches each new review, flags urgency, and understands tone before the owner even opens Telegram.",
  },
  {
    title: "A tailored response draft arrives instantly",
    text: "Each suggestion reflects the restaurant's voice, handles negatives carefully, and keeps public replies concise and professional.",
  },
  {
    title: "Approve, edit, or skip in one tap",
    text: "No dashboard. No training. Owners handle reputation management in the same messaging flow they already use every day.",
  },
];

const features = [
  {
    eyebrow: "Telegram-native",
    title: "Operate from the owner's phone, not another login.",
    text: "Every important action happens inside a clean Telegram thread with quick approvals, edit prompts, and weekly summaries.",
  },
  {
    eyebrow: "Brand voice learning",
    title: "The drafts improve as the owner edits.",
    text: "The system learns tone preferences from approvals and edits so responses feel more personal and less machine-written over time.",
  },
  {
    eyebrow: "Competitive intelligence",
    title: "Weekly reports show what nearby restaurants are doing better.",
    text: "Spot shifts in sentiment, category-specific complaints, and competitor strengths before reputation damage starts affecting covers.",
  },
];

const weeklyItems = [
  "Sentiment movement across the week",
  "Top praise themes and repeat complaints",
  "Competitor benchmark highlights",
  "Suggested actions for service recovery",
];

const testimonials = [
  {
    quote:
      "It feels like having a reputation manager in my pocket, but without another salary line.",
    name: "Independent Bistro Owner",
  },
  {
    quote:
      "The draft replies already sound closer to how I speak than the canned tools I tried before.",
    name: "Neighborhood Cafe Founder",
  },
];

function ProductFlow() {
  return (
    <div className="device-shell">
      <div className="device-header">
        <span className="device-dot" />
        <p>Review Intelligence Bot</p>
        <span className="device-pill">Live daily</span>
      </div>
      <div className="device-screen">
        <div className="story-frame story-frame-a">
          <div className="message incoming">
            <span className="message-label">New Google review</span>
            <p>&ldquo;Great food, but our table waited 25 minutes after ordering.&rdquo;</p>
            <small>Sentiment: mixed | Priority: respond today</small>
          </div>
          <div className="signal-card">
            <strong>AI summary</strong>
            <p>Guest loved the meal, but the wait time hurt the overall experience.</p>
          </div>
        </div>

        <div className="story-frame story-frame-b">
          <div className="message outgoing">
            <span className="message-label">Drafted response</span>
            <p>
              Thanks for the kind words about the food, and for calling out the
              delay. We are tightening ticket pacing this week and would love to
              welcome you back for a smoother service.
            </p>
          </div>
          <div className="action-row">
            <button>Approve</button>
            <button>Edit</button>
            <button className="ghost">Skip</button>
          </div>
        </div>

        <div className="story-frame story-frame-c">
          <div className="report-card">
            <span className="message-label">Weekly intelligence</span>
            <h4>Service speed improved</h4>
            <ul>
              <li>Positive review share up 18%</li>
              <li>Wait-time complaints down from 5 to 2</li>
              <li>Competitor avg. rating: 4.2 | Yours: 4.6</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero-section">
        <div className="hero-copy">
          <div className="eyebrow-row">
            <span className="eyebrow-pill">AI reputation management for restaurants</span>
            <span className="eyebrow-note">Telegram first. No dashboard required.</span>
          </div>
          <h1>Turn every review into retained revenue, without adding more admin to the day.</h1>
          <p className="hero-text">
            Review Intelligence Bot monitors Google reviews, writes polished
            responses in your restaurant&apos;s voice, and sends them straight to
            Telegram for one-tap approval. It feels premium, effortless, and built
            for owners who cannot spend another evening answering reviews.
          </p>
          <div className="hero-actions">
            <a className="primary-cta" href="#pricing">
              Start pilot access
            </a>
            <a className="secondary-cta" href="#how-it-works">
              See how it works
            </a>
          </div>
          <div className="proof-grid">
            {proofPoints.map((item) => (
              <article key={item.label} className="proof-card">
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </article>
            ))}
          </div>
        </div>
        <ProductFlow />
      </section>

      <section className="brand-strip">
        <p>Built for independent restaurants that care about reputation but do not want more software.</p>
      </section>

      <section className="section-grid" id="how-it-works">
        <div className="section-intro">
          <span className="section-kicker">How it works</span>
          <h2>The entire product fits into one clean operating loop.</h2>
          <p>
            No new app. No CRM complexity. Just daily review intelligence and
            owner-friendly response decisions delivered where they already pay
            attention.
          </p>
        </div>
        <div className="steps-list">
          {steps.map((step, index) => (
            <article key={step.title} className="step-card">
              <span className="step-index">0{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="feature-layout">
        <div className="feature-stack">
          {features.map((feature) => (
            <article key={feature.title} className="feature-card">
              <span className="section-kicker">{feature.eyebrow}</span>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          ))}
        </div>
        <aside className="insight-panel">
          <span className="section-kicker">Weekly report</span>
          <h3>Owners get clarity, not data exhaust.</h3>
          <p>
            The weekly digest is designed to be scanned in under two minutes while
            still surfacing what actually matters operationally.
          </p>
          <ul>
            {weeklyItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </aside>
      </section>

      <section className="testimonial-section">
        {testimonials.map((item) => (
          <blockquote key={item.name} className="testimonial-card">
            <p>&ldquo;{item.quote}&rdquo;</p>
            <footer>{item.name}</footer>
          </blockquote>
        ))}
      </section>

      <section className="pricing-section" id="pricing">
        <div className="section-intro">
          <span className="section-kicker">Early access offer</span>
          <h2>Pilot the product before paid rollout.</h2>
          <p>
            The MVP is currently free for test restaurants. The offer is positioned
            for early operators who want a competitive edge before broader release.
          </p>
        </div>
        <div className="pricing-card">
          <div>
            <span className="pricing-tier">MVP pilot</span>
            <h3>$0 during test phase</h3>
            <p>
              Includes daily review monitoring, AI drafted replies, Telegram
              approvals, and weekly intelligence digests.
            </p>
          </div>
          <ul>
            <li>Designed for 1 restaurant in the MVP</li>
            <li>Google reviews monitored daily</li>
            <li>Owner approval required before posting</li>
            <li>Future pricing planned at $20/month base</li>
          </ul>
          <a className="primary-cta" href="mailto:pilot@reviewintelligencebot.com">
            Request a pilot slot
          </a>
        </div>
      </section>
    </main>
  );
}
