const items = [
  { kind: 'TV', image: '/images/family-guy-poster.jpg' },
  { kind: 'Film', image: '/images/spider-man-brand-new-day-poster.jpg' },
  { kind: 'Book', image: '/images/eragon-book-cover.jpg' },
  { kind: 'Book', image: '/images/harry-potter-sorcerers-stone-cover.jpg' },
  { kind: 'Film', image: '/images/toy-story-5-poster.jpg' },
  { kind: 'Film', image: '/images/the-odyssey-poster.jpg' },
  { kind: 'Book', image: '/images/twilight-book-cover.jpg' },
  { kind: 'Anime', image: '/images/bleach-thousand-year-blood-war-poster.jpg' },
];

const people = [
  {
    name: 'Ludovico Besana',
    role: 'Founder & maintainer',
    href: 'https://www.linkedin.com/in/ludovicobesana/',
    image: '/images/contributor/ludovico.png',
  },
  { name: '', role: '', href: 'https://github.com/ludovicobesana/open-personal-tracking/blob/main/CONTRIBUTING.md#contributing-to-open-personal-tracking', slot: true },
  { name: '', role: '', href: 'https://github.com/ludovicobesana/open-personal-tracking/blob/main/CONTRIBUTING.md#contributing-to-open-personal-tracking', slot: true },
  { name: '', role: '', href: 'https://github.com/ludovicobesana/open-personal-tracking/blob/main/CONTRIBUTING.md#contributing-to-open-personal-tracking', slot: true },
  { name: '', role: '', href: 'https://github.com/ludovicobesana/open-personal-tracking/blob/main/CONTRIBUTING.md#contributing-to-open-personal-tracking', slot: true },
  { name: '', role: '', href: 'https://github.com/ludovicobesana/open-personal-tracking/blob/main/CONTRIBUTING.md#contributing-to-open-personal-tracking', slot: true },
];

const cards = [
  {
    tag: 'Community',
    title: 'Weekly, on Discord',
    text: 'Issue triage, roadmap talk, and open floor, every week, 13:00-14:00 (Italy time). Drop in to listen, triage, or bring an idea.',
    link: 'Join the call →',
    href: 'https://discord.gg/6CjFPH55Rv',
  },
  {
    tag: 'In person',
    title: 'Build days, city by city',
    text: 'Local meetups are being planned where contributors work on the project together, in the same room. Want one where you live? Say so on Discord.',
    link: 'Propose a city →',
    href: 'https://discord.gg/6CjFPH55Rv',
  },
  {
    tag: 'Sponsorship',
    title: 'Fund the archive, not the ads',
    text: 'Sponsorship keeps this project ad-free and keeps maintainer time going toward your pull requests instead of a sales funnel. Opening soon.',
    link: 'Get in line →',
    href: 'https://github.com/sponsors/ludovicobesana',
  },
];

export default function HomePage() {
  return (
    <main className="page-shell">
      <header className="nav">
        <a className="wordmark" href="#top" aria-label="open-personal-tracking home">
          <span>open</span>
          <span className="dot">·</span>
          <span>personal</span>
          <span className="dot">·</span>
          <span>tracking</span>
        </a>

        <nav className="nav-links" aria-label="Main navigation">
          <a href="https://discord.gg/6CjFPH55Rv">Discord</a>
          <a href="https://github.com/ludovicobesana/open-personal-tracking">GitHub</a>
        </nav>
      </header>

      <section className="hero" id="top">
        <p className="eyebrow">A personal archive, not a subscription</p>
        <h1>
          This is the last time <em>you lose it.</em>
        </h1>
        <p className="lede">
          Trackers shut down. Accounts get deleted. Companies get acquired and quietly turned off.
          Every time, years of ratings, notes, and watch history disappear with them. Not here: your
          history lives on your device first, exports on demand, and needs no account to exist.
        </p>

        <div className="cta-row">
          <a className="cta cta-primary" href="/app-shell">Open the app</a>
          <a className="cta cta-ghost" href="https://github.com/ludovicobesana/open-personal-tracking">
            View the code
          </a>
        </div>
      </section>

      <div className="shelf" aria-hidden="true">
        <div className="shelf-track">
          {[...items, ...items].map((item, index) => (
            <div
              key={`${item.kind}-${index}`}
              className="cover photo"
              style={{ ['--photo' as string]: `url('${item.image}')` }}
            >
              <span className="kind">{item.kind}</span>
            </div>
          ))}
        </div>
      </div>

      <section className="copy why measure">
        <p className="eyebrow">Why this exists</p>
        <h2>Your history shouldn&apos;t need a company&apos;s permission to keep existing.</h2>
        <p>
          Every media tracker you&apos;ve loved runs on the same assumption: your watch history lives on
          their servers, behind their account system, for as long as their business decides to keep the
          lights on. When that business ends, so does your history, no matter how many years you put
          into it.
        </p>
        <blockquote>
          The application may disappear. Your history must not.
        </blockquote>
        <p className="muted">
          open-personal-tracking is local-first: no account required for the core app, full export in a
          documented format, always. Movies, TV, anime, books, manga, games, music, whatever you track,
          it&apos;s yours, on your device, before it&apos;s anyone else&apos;s.
        </p>
      </section>

      <section className="copy trust measure">
        <p className="eyebrow">A project that&apos;s actually alive</p>
        <h2>You won&apos;t be filing a PR into the void.</h2>
        <p>
          Every week, the community reviews open issues together on Discord, 13:00-14:00 (Italy time).
          Pull requests get read and get a real answer, good or bad, not silence. Decisions get written
          down in the open instead of decided in a private channel you weren&apos;t in.
        </p>
        <p className="muted">
          There&apos;s far more to build here than any one person can carry alone: providers, importers,
          storage, accessibility, design, translations, testing, docs. First contribution or hundredth,
          both matter, and there&apos;s room for whatever you want to bring to it.
        </p>
      </section>

      <section className="copy team">
        <div className="measure">
          <p className="eyebrow">Team &amp; contributors</p>
          <h2>Open source, open roster.</h2>
          <p className="muted">
            This project is built in the open, one contribution at a time, code, design, docs, testing,
            translations, whatever you bring. The roster below is still filling up, and there&apos;s a spot
            open for you.
          </p>
        </div>
      </section>

      <div className="people-grid">
        {people.map((person) => (
          <a
            key={person.name || `slot-${person.href}`}
            className={`person ${person.slot ? 'slot' : ''}`}
            href={person.href}
            target={person.slot ? undefined : '_blank'}
            rel={person.slot ? undefined : 'noopener'}
          >
            <span
              className="avatar"
              style={person.image ? { backgroundImage: `url('${person.image}')`, backgroundPosition: 'top center' } : undefined}
            >
              {person.slot ? '+' : ''}
            </span>
            <span className="person-name">{person.name || ' '}</span>
            <span className="person-role">{person.role || ' '}</span>
          </a>
        ))}
      </div>

      <section className="copy newsletter measure" id="waiting-list">
        <p className="eyebrow">Not a contributor? Still welcome</p>
        <h2>Follow along without writing a line of code.</h2>
        <p className="muted">
          Join the waiting list by email, or drop into Discord to watch it get built in real time.
        </p>

        <form className="newsletter-form" action="https://formsubmit.co/info@ludovicobesana.com" method="POST" noValidate>
          <input type="email" name="email" placeholder="you@example.com" aria-label="Email address" required />
          <input type="text" name="_honey" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
          <input type="hidden" name="_subject" value="New waiting list signup, open-personal-tracking" />
          <input type="hidden" name="_captcha" value="true" />
          <input type="hidden" name="_template" value="table" />
          <button type="submit" className="cta cta-primary">Join the waiting list</button>
        </form>

        <a className="cta cta-ghost or-discord" href="https://discord.gg/6CjFPH55Rv">
          or follow along on Discord →
        </a>
      </section>

      <div className="cards">
        {cards.map((card) => (
          <div key={card.title} className="index-card">
            <p className="tag">{card.tag}</p>
            <h3>{card.title}</h3>
            <p>{card.text}</p>
            <a className="link" href={card.href} target="_blank" rel="noopener noreferrer">
              {card.link}
            </a>
          </div>
        ))}
      </div>

      <section className="star-cta">
        <p className="eyebrow">Before you go</p>
        <h2>If this resonates, star it.</h2>
        <p>
          It takes two seconds, and it&apos;s the easiest way to help someone else looking for a tracker
          like this actually find it.
        </p>
        <a
          className="cta cta-primary"
          href="https://github.com/ludovicobesana/open-personal-tracking"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2.5l2.9 6.16 6.6.74-4.9 4.6 1.28 6.6L12 17.3l-5.88 3.3 1.28-6.6-4.9-4.6 6.6-.74z" />
          </svg>
          Star on GitHub
        </a>
      </section>

      <footer>
        <div className="fine">
          open-personal-tracking is a working name. Posters and covers shown above are for illustration only
          and remain the property of their respective owners.
        </div>
        <div className="links">
          <a href="https://discord.gg/6CjFPH55Rv">Discord</a>
          <a href="https://github.com/ludovicobesana/open-personal-tracking">GitHub</a>
          <a href="https://github.com/ludovicobesana/open-personal-tracking/blob/main/CODE_OF_CONDUCT.md">
            Code of Conduct
          </a>
        </div>
      </footer>
    </main>
  );
}
