'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Icons as simple SVG components
const icons = {
    dashboard: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
    ),
    economy: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
    ),
    region: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
        </svg>
    ),
    business: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
    ),
    citizen: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    ),
    treasury: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3h18v18H3V3z" />
            <path d="M3 9h18" />
            <path d="M9 21V9" />
        </svg>
    ),
    transactions: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="17 1 21 5 17 9" />
            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
            <polyline points="7 23 3 19 7 15" />
            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
        </svg>
    ),
    settings: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
    ),
    world: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
    ),
}

interface NavItem {
    label: string
    href: string
    icon: keyof typeof icons
}

interface NavSection {
    title: string
    items: NavItem[]
}

const navigation: NavSection[] = [
    {
        title: 'Overview',
        items: [
            { label: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
        ],
    },
    {
        title: 'Economy',
        items: [
            { label: 'Economy', href: '/dashboard/economy', icon: 'economy' },
            { label: 'Regions', href: '/dashboard/region', icon: 'region' },
            { label: 'Treasury', href: '/dashboard/treasury', icon: 'treasury' },
        ],
    },
    {
        title: 'Entities',
        items: [
            { label: 'Businesses', href: '/dashboard/business', icon: 'business' },
            { label: 'Citizens', href: '/dashboard/citizen', icon: 'citizen' },
        ],
    },
    {
        title: 'Activity',
        items: [
            { label: 'Transactions', href: '/dashboard/transactions', icon: 'transactions' },
        ],
    },
    {
        title: 'Management',
        items: [
            { label: 'Worlds', href: '/dashboard/worlds', icon: 'world' },
            { label: 'Settings', href: '/dashboard/settings', icon: 'settings' },
        ],
    },
]

export default function Sidebar() {
    const pathname = usePathname()

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <div style={{
                    width: 40,
                    height: 40,
                    background: 'var(--gradient-primary)',
                    borderRadius: 'var(--radius-lg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 'var(--text-lg)',
                }}>
                    V
                </div>
                <h1>VexiumVerse</h1>
            </div>

            <nav className="sidebar-nav">
                {navigation.map((section) => (
                    <div key={section.title} className="nav-section">
                        <div className="nav-section-title">{section.title}</div>
                        {section.items.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`nav-link ${pathname === item.href ? 'active' : ''}`}
                            >
                                {icons[item.icon]}
                                <span>{item.label}</span>
                            </Link>
                        ))}
                    </div>
                ))}
            </nav>

            <div style={{
                padding: 'var(--space-md)',
                background: 'var(--color-glass)',
                borderRadius: 'var(--radius-lg)',
                marginTop: 'auto',
            }}>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                    VexiumVerse v0.1.0
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                    Economic Engine
                </div>
            </div>
        </aside>
    )
}
