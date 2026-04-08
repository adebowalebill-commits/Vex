'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import Link from 'next/link'

interface Business {
    id: string; name: string; type: string; ownerName: string
    walletBalance: number; bankBalance: number; employeeCount: number
    isOperating: boolean; createdAt: string
}
interface World { id: string; name: string }

function BusinessContent() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const searchParams = useSearchParams()
    const worldIdParam = searchParams.get('world')
    const [worlds, setWorlds] = useState<World[]>([])
    const [selectedWorld, setSelectedWorld] = useState<string>('')
    const [businesses, setBusinesses] = useState<Business[]>([])
    const [currencySymbol, setCurrencySymbol] = useState('©')
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({ total: 0, operating: 0, totalBalance: 0 })

    useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status, router])
    useEffect(() => { if (session?.user) fetchWorlds() }, [session])
    useEffect(() => { if (selectedWorld) fetchBusinesses() }, [selectedWorld])

    async function fetchWorlds() {
        try {
            const res = await fetch('/api/worlds'); const data = await res.json()
            if (data.success) {
                const allWorlds = [...data.data.owned, ...data.data.member]; setWorlds(allWorlds)
                if (worldIdParam) setSelectedWorld(worldIdParam)
                else if (allWorlds.length > 0) setSelectedWorld(allWorlds[0].id)
            }
        } catch (error) { console.error('Failed to fetch worlds:', error) }
        finally { setLoading(false) }
    }

    async function fetchBusinesses() {
        try {
            const res = await fetch(`/api/worlds/${selectedWorld}/businesses`); const data = await res.json()
            if (data.success) { setBusinesses(data.data.businesses); setCurrencySymbol(data.data.currencySymbol); setStats(data.data.stats) }
        } catch (error) { console.error('Failed to fetch businesses:', error) }
    }

    if (status === 'loading' || loading) {
        return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-primary)' }}><div className="loading-spinner" /></div>
    }

    if (worlds.length === 0) {
        return (
            <DashboardLayout title="Businesses">
                <div className="glass-card p-8" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🏢</div>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No Worlds Yet</h3>
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>Create a world first to manage businesses.</p>
                    <a href="/dashboard/worlds" className="btn btn-primary">Go to Worlds</a>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout title="Businesses">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="glass-card p-5">
                    <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 500, marginBottom: '6px' }}>Select World</div>
                    <select value={selectedWorld} onChange={e => setSelectedWorld(e.target.value)} className="form-select" style={{ width: '100%' }}>
                        {worlds.map(w => <option key={w.id} value={w.id} style={{ background: 'var(--color-bg-elevated)' }}>{w.name}</option>)}
                    </select>
                </div>
                {[
                    { label: 'Total Businesses', value: stats.total },
                    { label: 'Operating', value: stats.operating },
                    { label: 'Total Balance', value: `${currencySymbol}${stats.totalBalance.toLocaleString()}` },
                ].map((s, i) => (
                    <div key={i} className="glass-card p-5">
                        <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 500, marginBottom: '4px' }}>{s.label}</div>
                        <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-data)' }}>{s.value}</div>
                    </div>
                ))}
            </div>

            <div className="table-container">
                {businesses.length > 0 ? (
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Business</th>
                                <th>Type</th>
                                <th style={{ textAlign: 'right' }}>Balance</th>
                                <th style={{ textAlign: 'center' }}>Employees</th>
                                <th style={{ textAlign: 'center' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {businesses.map(biz => (
                                <tr key={biz.id}>
                                    <td>
                                        <Link href={`/dashboard/business/${biz.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                            <div style={{ fontWeight: 600, color: 'var(--color-accent)' }}>{biz.name}</div>
                                            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Owner: {biz.ownerName}</div>
                                        </Link>
                                    </td>
                                    <td style={{ color: 'var(--color-text-secondary)' }}>{biz.type}</td>
                                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                                        {currencySymbol}{(biz.walletBalance + biz.bankBalance).toLocaleString()}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>{biz.employeeCount}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span className={biz.isOperating ? 'badge badge-success' : 'badge badge-warning'}>
                                            {biz.isOperating ? 'Operating' : 'Paused'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div style={{ textAlign: 'center', padding: '64px 24px' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🏢</div>
                        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No Businesses Yet</h3>
                        <p style={{ color: 'var(--color-text-secondary)', maxWidth: '400px', margin: '0 auto' }}>
                            Businesses will appear here once citizens create them via the Discord bot.
                        </p>
                    </div>
                )}
            </div>
        </DashboardLayout>
    )
}

export default function BusinessPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-primary)' }}><div className="loading-spinner" /></div>}>
            <BusinessContent />
        </Suspense>
    )
}
