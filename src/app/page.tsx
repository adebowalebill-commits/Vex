import Link from 'next/link'

export default function HomePage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--color-bg-primary)',
    }}>
      {/* Header */}
      <header style={{
        padding: 'var(--space-md) var(--space-xl)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid var(--color-glass-border)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-md)',
        }}>
          <div style={{
            width: 32,
            height: 32,
            background: 'var(--gradient-primary)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 'var(--text-base)',
          }}>
            V
          </div>
          <span style={{
            fontSize: 'var(--text-lg)',
            fontWeight: 700,
            background: 'var(--gradient-primary)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            VexiumVerse
          </span>
        </div>
        <nav style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
          <Link href="/login" className="btn btn-ghost btn-sm">
            Sign In
          </Link>
          <Link href="/login" className="btn btn-primary btn-sm">
            Get Started
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main style={{ flex: 1 }}>
        <section style={{
          padding: 'var(--space-3xl) var(--space-xl)',
          textAlign: 'center',
          maxWidth: '900px',
          margin: '0 auto',
        }}>
          <div style={{
            display: 'inline-block',
            padding: 'var(--space-xs) var(--space-md)',
            background: 'var(--color-accent-primary)',
            borderRadius: 'var(--radius-full)',
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
            marginBottom: 'var(--space-lg)',
            opacity: 0.9,
          }}>
            🚀 Economic Infrastructure for Communities
          </div>

          <h1 style={{
            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            fontWeight: 800,
            lineHeight: 1.1,
            marginBottom: 'var(--space-lg)',
            background: 'linear-gradient(135deg, #ffffff 0%, #a0a0b0 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Transform Your Discord
            <br />
            Into a{' '}
            <span style={{
              background: 'var(--gradient-primary)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Living Economy
            </span>
          </h1>

          <p style={{
            fontSize: 'var(--text-lg)',
            color: 'var(--color-text-secondary)',
            maxWidth: '600px',
            margin: '0 auto var(--space-xl)',
            lineHeight: 1.7,
          }}>
            VexiumVerse is a decentralized economic operating system that transforms
            online communities into autonomous, self-sustaining virtual economies
            governed by scarcity, decay, and consequence.
          </p>

          <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center' }}>
            <Link href="/login" className="btn btn-primary">
              Launch Dashboard
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
            <Link href="#features" className="btn btn-secondary">
              Learn More
            </Link>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" style={{
          padding: 'var(--space-3xl) var(--space-xl)',
          background: 'var(--color-bg-secondary)',
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h2 style={{
              fontSize: 'var(--text-3xl)',
              fontWeight: 700,
              textAlign: 'center',
              marginBottom: 'var(--space-2xl)',
            }}>
              Core Economic Principles
            </h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 'var(--space-lg)',
            }}>
              {[
                {
                  icon: '⏳',
                  title: 'Needs Decay',
                  description: 'Citizens must maintain food, water, and sleep. Neglect leads to reduced productivity and restrictions.',
                },
                {
                  icon: '💎',
                  title: 'Scarcity',
                  description: 'Resources are finite. Extraction is rate-limited. No infinite abundance.',
                },
                {
                  icon: '🔗',
                  title: 'Production Chains',
                  description: 'Raw materials flow through refineries, manufacturers, and retailers. Interdependence creates trade.',
                },
                {
                  icon: '⚡',
                  title: 'Inactivity Penalties',
                  description: 'Dormant assets are auctioned. Abandoned permits are revoked. Active participation is rewarded.',
                },
                {
                  icon: '⚖️',
                  title: 'Self-Balancing Markets',
                  description: 'Prices emerge from supply and demand. No artificial intervention.',
                },
                {
                  icon: '🏛️',
                  title: 'Governance',
                  description: 'World owners set policy. Mayors manage regions. Citizens vote with their feet and wallets.',
                },
              ].map((feature, index) => (
                <div
                  key={index}
                  style={{
                    padding: 'var(--space-xl)',
                    background: 'var(--color-glass)',
                    border: '1px solid var(--color-glass-border)',
                    borderRadius: 'var(--radius-xl)',
                    transition: 'all var(--transition-base)',
                  }}
                  className="card"
                >
                  <div style={{
                    fontSize: '2rem',
                    marginBottom: 'var(--space-md)',
                  }}>
                    {feature.icon}
                  </div>
                  <h3 style={{
                    fontSize: 'var(--text-lg)',
                    fontWeight: 600,
                    marginBottom: 'var(--space-sm)',
                  }}>
                    {feature.title}
                  </h3>
                  <p style={{
                    color: 'var(--color-text-secondary)',
                    fontSize: 'var(--text-sm)',
                    lineHeight: 1.6,
                  }}>
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section style={{
          padding: 'var(--space-3xl) var(--space-xl)',
          textAlign: 'center',
        }}>
          <h2 style={{
            fontSize: 'var(--text-3xl)',
            fontWeight: 700,
            marginBottom: 'var(--space-md)',
          }}>
            Ready to Build Your Economy?
          </h2>
          <p style={{
            color: 'var(--color-text-secondary)',
            marginBottom: 'var(--space-xl)',
          }}>
            Connect your Discord and start creating.
          </p>
          <Link href="/login" className="btn btn-primary">
            Get Started Free
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer style={{
        padding: 'var(--space-xl)',
        borderTop: '1px solid var(--color-glass-border)',
        textAlign: 'center',
        color: 'var(--color-text-muted)',
        fontSize: 'var(--text-sm)',
      }}>
        <p>© 2024 VexiumVerse. Economic infrastructure for online communities.</p>
      </footer>
    </div>
  )
}
