import Link from 'next/link'

export default function HomePage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-bg-primary)', position: 'relative', overflow: 'hidden' }}>

      {/* Ambient glow */}
      <div style={{
        position: 'absolute', top: '-200px', left: '50%', transform: 'translateX(-50%)',
        width: '800px', height: '600px',
        background: 'radial-gradient(ellipse, rgba(88,101,242,0.12) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Nav */}
      <header style={{
        padding: '0 var(--space-lg)', height: '64px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid var(--color-card-border)',
        position: 'relative', zIndex: 10,
        background: 'rgba(17,18,20,0.8)', backdropFilter: 'blur(12px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: 32, height: 32, background: 'var(--color-accent)', borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: '14px', color: 'white',
          }}>V</div>
          <span style={{ fontSize: '18px', fontWeight: 700, color: 'white', letterSpacing: '-0.02em' }}>
            VexiumVerse<span style={{ color: 'var(--color-accent)' }}>.</span>
          </span>
        </div>
        <nav style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Link href="/login" className="btn btn-primary btn-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '4px' }}>
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
            Login with Discord
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main style={{ flex: 1, position: 'relative', zIndex: 1 }}>
        <section style={{
          padding: 'clamp(2rem, 6vw, 6rem) var(--space-lg)',
          maxWidth: '900px', margin: '0 auto',
        }}>
          <h1 style={{
            fontSize: 'var(--text-hero)', fontWeight: 900, lineHeight: 1.05,
            marginBottom: 'var(--space-lg)', letterSpacing: '-0.03em',
          }}>
            <span style={{ position: 'relative', display: 'inline' }}>
              <span style={{ color: 'var(--color-accent)' }}>BUILD</span>
              <span style={{
                position: 'absolute', bottom: '2px', left: 0, right: 0, height: '4px',
                background: 'var(--color-accent)', borderRadius: '2px',
                boxShadow: '0 0 12px rgba(88,101,242,0.5)',
              }} />
            </span>
            {' '}your
            <br />
            Discord{' '}
            <span style={{ color: 'white' }}>economy</span>
            <span style={{ color: 'var(--color-accent)' }}>.</span>
          </h1>

          <p style={{
            fontSize: 'var(--text-lg)', color: 'var(--color-text-secondary)',
            maxWidth: '560px', lineHeight: 1.7, marginBottom: 'var(--space-xl)',
          }}>
            Turn your community into a <strong style={{ color: 'white' }}>self-sustaining virtual economy</strong>.
            Citizens earn, trade, and build businesses — governed by scarcity, decay, and real consequence.
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link href="/login" className="btn btn-primary btn-lg">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
              Add VexiumVerse
            </Link>
            <Link href="/login" className="btn btn-secondary btn-lg">
              Login to Dashboard
            </Link>
          </div>
        </section>

        {/* Features Section */}
        <section style={{
          padding: 'clamp(2rem, 6vw, 6rem) var(--space-lg)',
          background: 'var(--color-bg-secondary)',
          borderTop: '1px solid var(--color-card-border)',
        }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <h2 style={{
              fontSize: 'var(--text-3xl)', fontWeight: 800,
              textAlign: 'center', marginBottom: 'var(--space-sm)',
              letterSpacing: '-0.02em',
            }}>
              Core Economic Principles
            </h2>
            <p style={{
              textAlign: 'center', color: 'var(--color-text-secondary)',
              marginBottom: 'var(--space-2xl)', maxWidth: '500px', margin: '0 auto var(--space-2xl)',
            }}>
              VexiumVerse isn&apos;t a game — it&apos;s an economic engine.
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))',
              gap: 'var(--space-lg)',
            }}>
              {[
                { icon: '⏳', title: 'Needs Decay', desc: 'Citizens must maintain food, water, and sleep. Neglect leads to reduced productivity and restrictions.' },
                { icon: '💎', title: 'Scarcity', desc: 'Resources are finite. Extraction is rate-limited. No infinite abundance — real economics.' },
                { icon: '🔗', title: 'Production Chains', desc: 'Raw materials flow through refineries, manufacturers, and retailers. Interdependence creates trade.' },
                { icon: '⚡', title: 'Inactivity Penalties', desc: 'Dormant assets are auctioned. Abandoned permits are revoked. Active participation is rewarded.' },
                { icon: '⚖️', title: 'Market Forces', desc: 'Prices emerge from supply and demand. No artificial intervention — the invisible hand governs.' },
                { icon: '🏛️', title: 'Governance', desc: 'World owners set policy. Mayors manage regions. Citizens vote with their feet and wallets.' },
              ].map((f, i) => (
                <div key={i} className="glass-card glow-border" style={{ padding: 'var(--space-xl)' }}>
                  <div style={{ fontSize: '1.75rem', marginBottom: 'var(--space-md)' }}>{f.icon}</div>
                  <h3 style={{
                    fontSize: 'var(--text-lg)', fontWeight: 700,
                    marginBottom: 'var(--space-sm)', letterSpacing: '-0.01em',
                  }}>{f.title}</h3>
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 13 Essential Businesses */}
        <section style={{
          padding: 'clamp(2rem, 6vw, 6rem) var(--space-lg)',
          borderTop: '1px solid var(--color-card-border)',
        }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{
              fontSize: 'var(--text-3xl)', fontWeight: 800,
              marginBottom: 'var(--space-sm)', letterSpacing: '-0.02em',
            }}>
              <span style={{ color: 'var(--color-data)' }}>13</span> Essential Industries
            </h2>
            <p style={{
              color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2xl)',
              maxWidth: '500px', margin: '0 auto var(--space-2xl)',
            }}>
              Every world starts in Training. Fill all 13 slots to graduate your economy.
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(150px, 100%), 1fr))',
              gap: '10px',
            }}>
              {[
                '💧 Water Purification', '⛏️ Mining', '🌲 Forestry', '🌾 Farm',
                '🏪 Grocery Store', '🛢️ Oil Drilling', '🏭 Oil Refinery', '⛽ Gas Station',
                '⚙️ Machinery', '🚗 Vehicle Dealership', '🚛 Trucking', '🏗️ Business Construction',
                '🏘️ Real Estate',
              ].map((biz, i) => (
                <div key={i} style={{
                  padding: '14px 16px', background: 'var(--color-card)',
                  border: '1px solid var(--color-card-border)',
                  borderRadius: 'var(--radius-xl)',
                  fontSize: 'var(--text-sm)', fontWeight: 500,
                  transition: 'all 200ms ease',
                  cursor: 'default',
                }}>
                  {biz}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section style={{
          padding: 'clamp(2rem, 6vw, 6rem) var(--space-lg)',
          textAlign: 'center',
          background: 'var(--color-bg-secondary)',
          borderTop: '1px solid var(--color-card-border)',
        }}>
          <h2 style={{
            fontSize: 'var(--text-3xl)', fontWeight: 800,
            marginBottom: 'var(--space-md)', letterSpacing: '-0.02em',
          }}>
            Ready to build?
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-xl)' }}>
            Connect your Discord and launch your economy in minutes.
          </p>
          <Link href="/login" className="btn btn-primary btn-lg">
            Get Started Free →
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer style={{
        padding: 'var(--space-xl)', borderTop: '1px solid var(--color-card-border)',
        textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)',
        position: 'relative', zIndex: 1,
      }}>
        <p>© 2026 VexiumVerse. Economic infrastructure for online communities.</p>
      </footer>
    </div>
  )
}
