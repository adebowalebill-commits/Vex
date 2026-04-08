'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'

interface DashboardStats {
    totalBalance: number
    worldsOwned: number
    citizenships: number
    recentTransactions: number
}

export default function DashboardPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login')
    }, [status, router])

    useEffect(() => {
        if (session?.user) fetchStats()
    }, [session])

    async function fetchStats() {
        try {
            const res = await fetch('/api/dashboard/stats', { cache: 'no-cache' })
            const data = await res.json()
            if (data.success) setStats(data.data)
        } catch (error) {
            console.error('Failed to fetch stats:', error)
        } finally {
            setLoading(false)
        }
    }

    if (status === 'loading' || loading) {
        return (
            <div style={{
                minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--color-bg-primary)',
            }}>
                <div className="loading-spinner" />
            </div>
        )
    }

    if (!session) return null

    return (
        <DashboardLayout title="Dashboard">
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="glass-card p-6">
                    <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 500, marginBottom: '4px' }}>
                        Total Balance
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-data)', letterSpacing: '-0.02em' }}>
                        ©{stats?.totalBalance?.toLocaleString() || '0'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-success)', marginTop: '6px', fontWeight: 500 }}>
                        Across all worlds
                    </div>
                </div>

                <div className="glass-card p-6">
                    <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 500, marginBottom: '4px' }}>
                        Worlds Owned
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-data)', letterSpacing: '-0.02em' }}>
                        {stats?.worldsOwned || 0}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
                        {stats?.worldsOwned === 0 ? 'Create your first world!' : 'Active economies'}
                    </div>
                </div>

                <div className="glass-card p-6">
                    <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 500, marginBottom: '4px' }}>
                        Citizenships
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-data)', letterSpacing: '-0.02em' }}>
                        {stats?.citizenships || 0}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
                        World memberships
                    </div>
                </div>

                <div className="glass-card p-6">
                    <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 500, marginBottom: '4px' }}>
                        Transactions (24h)
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-data)', letterSpacing: '-0.02em' }}>
                        {stats?.recentTransactions || 0}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
                        Recent activity
                    </div>
                </div>
            </div>

            {/* Welcome Card */}
            <div className="glass-card p-8" style={{ textAlign: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '12px', letterSpacing: '-0.02em' }}>
                    Welcome, {session.user?.name}! 👋
                </h2>
                <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px', maxWidth: '560px', margin: '0 auto 24px', lineHeight: 1.6 }}>
                    VexiumVerse is your economic operating system for Discord communities.
                    Create worlds, manage citizens, run businesses, and build thriving virtual economies.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px' }}>
                    <a href="/dashboard/worlds" className="btn btn-primary">
                        {stats?.worldsOwned === 0 ? '+ Create a World' : 'Manage Worlds'}
                    </a>
                    <a href="/dashboard/economy" className="btn btn-secondary">
                        View Economy
                    </a>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <a href="/dashboard/worlds" className="glass-card glow-border p-6" style={{ cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '12px' }}>🌍</div>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>Worlds</h3>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', lineHeight: 1.5 }}>
                        Create and manage your Discord server economies
                    </p>
                </a>

                <a href="/dashboard/business" className="glass-card glow-border p-6" style={{ cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '12px' }}>🏢</div>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>Businesses</h3>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', lineHeight: 1.5 }}>
                        Start businesses and manage production chains
                    </p>
                </a>

                <a href="/dashboard/treasury" className="glass-card glow-border p-6" style={{ cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '12px' }}>💰</div>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>Treasury</h3>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', lineHeight: 1.5 }}>
                        Manage taxes, subsidies, and world funds
                    </p>
                </a>
            </div>
        </DashboardLayout>
    )
}
