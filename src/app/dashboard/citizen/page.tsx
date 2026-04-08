'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import Link from 'next/link'

interface Citizen {
    id: string; displayName: string; discordId: string | null; image: string | null
    walletBalance: number; bankBalance: number; totalBalance: number
    businessCount: number; isActive: boolean; createdAt: string
}
interface World { id: string; name: string }

function CitizenContent() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const searchParams = useSearchParams()
    const worldIdParam = searchParams.get('world')
    const [worlds, setWorlds] = useState<World[]>([])
    const [selectedWorld, setSelectedWorld] = useState<string>('')
    const [citizens, setCitizens] = useState<Citizen[]>([])
    const [currencySymbol, setCurrencySymbol] = useState('©')
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 })

    useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status, router])
    useEffect(() => { if (session?.user) fetchWorlds() }, [session])
    useEffect(() => { if (selectedWorld) fetchCitizens() }, [selectedWorld, search, pagination.page])

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

    async function fetchCitizens() {
        try {
            const params = new URLSearchParams({ page: pagination.page.toString(), limit: '20', ...(search && { search }) })
            const res = await fetch(`/api/worlds/${selectedWorld}/citizens?${params}`); const data = await res.json()
            if (data.success) {
                setCitizens(data.data.citizens); setCurrencySymbol(data.data.currencySymbol)
                setPagination(prev => ({ ...prev, total: data.data.pagination.total, totalPages: data.data.pagination.totalPages }))
            }
        } catch (error) { console.error('Failed to fetch citizens:', error) }
    }

    if (status === 'loading' || loading) {
        return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-primary)' }}><div className="loading-spinner" /></div>
    }

    if (worlds.length === 0) {
        return (
            <DashboardLayout title="Citizens">
                <div className="glass-card p-8" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '16px' }}>👥</div>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No Worlds Yet</h3>
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>Create a world first to manage citizens.</p>
                    <a href="/dashboard/worlds" className="btn btn-primary">Go to Worlds</a>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout title="Citizens">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="glass-card p-5">
                    <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 500, marginBottom: '6px' }}>Select World</div>
                    <select value={selectedWorld} onChange={e => { setSelectedWorld(e.target.value); setPagination(prev => ({ ...prev, page: 1 })) }} className="form-select" style={{ width: '100%' }}>
                        {worlds.map(w => <option key={w.id} value={w.id} style={{ background: 'var(--color-bg-elevated)' }}>{w.name}</option>)}
                    </select>
                </div>
                {[
                    { label: 'Total Citizens', value: pagination.total },
                    { label: 'Active', value: citizens.filter(c => c.isActive).length },
                    { label: 'Avg Balance', value: `${currencySymbol}${citizens.length > 0 ? Math.round(citizens.reduce((sum, c) => sum + c.totalBalance, 0) / citizens.length).toLocaleString() : '0'}` },
                ].map((s, i) => (
                    <div key={i} className="glass-card p-5">
                        <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 500, marginBottom: '4px' }}>{s.label}</div>
                        <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-data)' }}>{s.value}</div>
                    </div>
                ))}
            </div>

            {/* Search */}
            <div style={{ marginBottom: '24px' }}>
                <input
                    type="text" placeholder="Search citizens by name or Discord ID..."
                    value={search} onChange={e => { setSearch(e.target.value); setPagination(prev => ({ ...prev, page: 1 })) }}
                    className="form-input" style={{ maxWidth: '400px' }}
                />
            </div>

            <div className="table-container">
                {citizens.length > 0 ? (
                    <>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Citizen</th>
                                    <th style={{ textAlign: 'right' }}>Wallet</th>
                                    <th style={{ textAlign: 'right' }}>Bank</th>
                                    <th style={{ textAlign: 'right' }}>Total</th>
                                    <th style={{ textAlign: 'center' }}>Businesses</th>
                                    <th style={{ textAlign: 'center' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {citizens.map(citizen => (
                                    <tr key={citizen.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                {citizen.image ? (
                                                    <img src={citizen.image} alt="" style={{ width: 32, height: 32, borderRadius: '50%' }} />
                                                ) : (
                                                    <div className="avatar avatar-sm">{citizen.displayName[0]}</div>
                                                )}
                                            <div>
                                                    <Link href={`/dashboard/citizen/${citizen.id}`} style={{ textDecoration: 'none', color: 'var(--color-accent)', fontWeight: 600 }}>{citizen.displayName}</Link>
                                                    {citizen.discordId && <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{citizen.discordId}</div>}
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{currencySymbol}{citizen.walletBalance.toLocaleString()}</td>
                                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{currencySymbol}{citizen.bankBalance.toLocaleString()}</td>
                                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{currencySymbol}{citizen.totalBalance.toLocaleString()}</td>
                                        <td style={{ textAlign: 'center' }}>{citizen.businessCount}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className={citizen.isActive ? 'badge badge-success' : 'badge badge-warning'}>{citizen.isActive ? 'Active' : 'Inactive'}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {pagination.totalPages > 1 && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderTop: '1px solid var(--color-card-border)' }}>
                                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Showing {citizens.length} of {pagination.total} citizens</div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))} disabled={pagination.page === 1} className="btn btn-ghost btn-sm" style={{ opacity: pagination.page === 1 ? 0.4 : 1 }}>Previous</button>
                                    <span style={{ display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>Page {pagination.page} of {pagination.totalPages}</span>
                                    <button onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))} disabled={pagination.page >= pagination.totalPages} className="btn btn-ghost btn-sm" style={{ opacity: pagination.page >= pagination.totalPages ? 0.4 : 1 }}>Next</button>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div style={{ textAlign: 'center', padding: '64px 24px' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>👥</div>
                        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No Citizens Found</h3>
                        <p style={{ color: 'var(--color-text-secondary)', maxWidth: '400px', margin: '0 auto' }}>
                            {search ? 'No citizens match your search criteria.' : 'Citizens will appear here once they register via the Discord bot.'}
                        </p>
                    </div>
                )}
            </div>
        </DashboardLayout>
    )
}

export default function CitizenPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-primary)' }}><div className="loading-spinner" /></div>}>
            <CitizenContent />
        </Suspense>
    )
}
