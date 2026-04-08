'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

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
    inventory: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
    ),
    invoice: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
    ),
    production: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
        </svg>
    ),
}

interface NavItem { label: string; href: string; icon: keyof typeof icons }
interface NavSection { title: string; items: NavItem[] }

const navigation: NavSection[] = [
    {
        title: 'Overview',
        items: [{ label: 'Dashboard', href: '/dashboard', icon: 'dashboard' }],
    },
    {
        title: 'Economy',
        items: [
            { label: 'Economy', href: '/dashboard/economy', icon: 'economy' },
            { label: 'Regions', href: '/dashboard/region', icon: 'region' },
            { label: 'Treasury', href: '/dashboard/treasury', icon: 'treasury' },
            { label: 'Production', href: '/dashboard/production', icon: 'production' },
            { label: 'Inventory', href: '/dashboard/inventory', icon: 'inventory' },
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
            { label: 'Invoices', href: '/dashboard/invoices', icon: 'invoice' },
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

interface SidebarProps { isOpen?: boolean; onClose?: () => void }

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname()

    return (
        <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
            <div className="sidebar-logo">
                <div style={{
                    width: 36, height: 36, background: 'var(--color-accent)',
                    borderRadius: 'var(--radius-lg)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: '15px', color: 'white',
                }}>V</div>
                <h1>VexiumVerse</h1>
                <button className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">✕</button>
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
                                onClick={onClose}
                            >
                                {icons[item.icon]}
                                <span>{item.label}</span>
                            </Link>
                        ))}
                    </div>
                ))}
            </nav>

            <div style={{
                padding: '12px', background: 'var(--color-bg-elevated)',
                borderRadius: 'var(--radius-xl)', marginTop: 'auto',
            }}>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                    VexiumVerse v0.2.0
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                    Economic Engine
                </div>
            </div>
        </aside>
    )
}
