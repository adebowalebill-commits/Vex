'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'

interface EconomyStats {
    moneySupply: number
    treasuryBalance: number
    dailyVolume: number
    citizenCount: number
    businessCount: number
    employmentCount: number
    currencySymbol: string
}

interface World { id: string; name: string }

function EconomyContent() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const searchParams = useSearchParams()
    const worldIdParam = searchParams.get('world')

    const [worlds, setWorlds] = useState<World[]>([])
    const [selectedWorld, setSelectedWorld] = useState<string>('')
    const [economyStats, setEconomyStats] = useState<EconomyStats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status, router])

    useEffect(() => { if (session?.user) fetchWorlds() }, [session])

    useEffect(() => { if (selectedWorld) fetchEconomyStats() }, [selectedWorld])

    async function fetchWorlds() {
        try {
            const res = await fetch('/api/worlds')
            const data = await res.json()
            if (data.success) {
                const allWorlds = [...data.data.owned, ...data.data.member]
                setWorlds(allWorlds)
                if (worldIdParam) setSelectedWorld(worldIdParam)
                else if (allWorlds.length > 0) setSelectedWorld(allWorlds[0].id)
            }
        } catch (error) { console.error('Failed to fetch worlds:', error) }
        finally { setLoading(false) }
    }

    async function fetchEconomyStats() {
        try {
            const res = await fetch(`/api/worlds/${selectedWorld}/economy`)
            const data = await res.json()
            if (data.success) setEconomyStats(data.data)
        } catch (error) { console.error('Failed to fetch economy stats:', error) }
    }

    if (status === 'loading' || loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-primary)' }}>
                <div className="loading-spinner" />
            </div>
        )
    }

    if (worlds.length === 0) {
        return (
            <DashboardLayout title="Economy">
                <div className="glass-card p-8" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📊</div>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No Worlds Yet</h3>
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>Create a world first to view economy stats.</p>
                    <a href="/dashboard/worlds" className="btn btn-primary">Go to Worlds</a>
                </div>
            </DashboardLayout>
        )
    }

    const symbol = economyStats?.currencySymbol || '©'
    const empRate = economyStats?.citizenCount && economyStats.citizenCount > 0
        ? Math.round((economyStats.employmentCount / economyStats.citizenCount) * 100) : 0

    return (
        <DashboardLayout title="Economy">
            {/* World Selector */}
            <div style={{ marginBottom: '24px' }}>
                <select
                    value={selectedWorld}
                    onChange={e => setSelectedWorld(e.target.value)}
                    className="form-select"
                    style={{ maxWidth: '280px' }}
                >
                    {worlds.map(w => (
                        <option key={w.id} value={w.id} style={{ background: 'var(--color-bg-elevated)' }}>{w.name}</option>
                    ))}
                </select>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[
                    { label: 'Money Supply', value: `${symbol}${(economyStats?.moneySupply || 0).toLocaleString()}`, sub: 'Total currency in circulation' },
                    { label: 'Treasury Balance', value: `${symbol}${(economyStats?.treasuryBalance || 0).toLocaleString()}`, sub: 'Government funds' },
                    { label: 'Daily Volume', value: `${symbol}${(economyStats?.dailyVolume || 0).toLocaleString()}`, sub: 'Transactions today' },
                    { label: 'Citizens', value: `${economyStats?.citizenCount || 0}`, sub: 'Registered population' },
                ].map((s, i) => (
                    <div key={i} className="glass-card p-6">
                        <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 500, marginBottom: '4px' }}>{s.label}</div>
                        <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-data)', letterSpacing: '-0.02em' }}>{s.value}</div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '6px' }}>{s.sub}</div>
                    </div>
                ))}
            </div>

            {/* Economic Indicators */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-card p-6">
                    <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Population & Production</h2>
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { val: economyStats?.citizenCount || 0, label: 'Total Citizens' },
                            { val: economyStats?.businessCount || 0, label: 'Active Businesses' },
                            { val: economyStats?.employmentCount || 0, label: 'Employed Citizens' },
                            { val: `${empRate}%`, label: 'Employment Rate' },
                        ].map((item, i) => (
                            <div key={i} className="glass-card p-4" style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-data)' }}>{item.val}</div>
                                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>{item.label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="glass-card p-6">
                    <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Quick Links</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {[
                            { href: `/dashboard/treasury?world=${selectedWorld}`, icon: '🏦', title: 'Treasury', desc: 'Manage taxes and subsidies' },
                            { href: `/dashboard/transactions?world=${selectedWorld}`, icon: '💸', title: 'Transactions', desc: 'View transaction history' },
                            { href: `/dashboard/citizen?world=${selectedWorld}`, icon: '👥', title: 'Citizens', desc: 'Manage citizen records' },
                        ].map((link, i) => (
                            <a key={i} href={link.href} className="glow-border" style={{
                                display: 'block', padding: '14px', background: 'var(--color-bg-elevated)',
                                borderRadius: 'var(--radius-xl)', textDecoration: 'none', color: 'inherit',
                                transition: 'all 200ms ease',
                            }}>
                                <div style={{ fontWeight: 600 }}>{link.icon} {link.title}</div>
                                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>{link.desc}</div>
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}

export default function EconomyPage() {
    return (
        <Suspense fallback={
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-primary)' }}>
                <div className="loading-spinner" />
            </div>
        }>
            <EconomyContent />
        </Suspense>
    )
}
