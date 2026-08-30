import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="page-shell">
      <section className="screen-panel" style={{ minHeight: '100vh', placeContent: 'center' }}>
        <div className="screen-hero" style={{ maxWidth: '42rem', margin: '0 auto', width: '100%' }}>
          <div>
            <span className="eyebrow">404</span>
            <h2>Page not found</h2>
            <p>This item or screen is not in the archive yet, but the library is still here.</p>
          </div>
          <Link href="/" className="primary-btn" style={{ textDecoration: 'none' }}>
            Back home
          </Link>
        </div>
      </section>
    </main>
  );
}
