'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'

interface Transaction { id: string; amount: number; type: string; description: string | null; senderName: string; receiverName: string; createdAt: string }
interface World { id: string; name: string }

function TransactionsContent() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const searchParams = useSearchParams()
    const worldIdParam = searchParams.get('world')
    const [worlds, setWorlds] = useState<World[]>([])
    const [selectedWorld, setSelectedWorld] = useState<string>('')
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [currencySymbol, setCurrencySymbol] = useState('©')
    const [loading, setLoading] = useState(true)
    const [typeFilter, setTypeFilter] = useState('all')
    const [periodFilter, setPeriodFilter] = useState('7d')
    const [stats, setStats] = useState({ totalVolume: 0, transactionCount: 0 })
    const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 })

    useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status, router])
    useEffect(() => { if (session?.user) fetchWorlds() }, [session])
    useEffect(() => { if (selectedWorld) fetchTransactions() }, [selectedWorld, typeFilter, periodFilter, pagination.page])

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

    async function fetchTransactions() {
        try {
            const params = new URLSearchParams({ page: pagination.page.toString(), limit: '20', type: typeFilter, period: periodFilter })
            const res = await fetch(`/api/worlds/${selectedWorld}/transactions?${params}`); const data = await res.json()
            if (data.success) {
                setTransactions(data.data.transactions); setCurrencySymbol(data.data.currencySymbol); setStats(data.data.stats)
                setPagination(prev => ({ ...prev, total: data.data.pagination.total, totalPages: data.data.pagination.totalPages }))
            }
        } catch (error) { console.error('Failed to fetch transactions:', error) }
    }

    function getTypeBadge(type: string) {
        switch (type) {
            case 'PAYMENT': return 'badge badge-info'
            case 'SALARY': return 'badge badge-success'
            case 'TAX': return 'badge badge-warning'
            case 'SUBSIDY': return 'badge badge-error'
            default: return 'badge'
        }
    }

    if (status === 'loading' || loading) {
        return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-primary)' }}><div className="loading-spinner" /></div>
    }

    if (worlds.length === 0) {
        return (
            <DashboardLayout title="Transactions">
                <div className="glass-card p-8" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '16px' }}>💸</div>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No Worlds Yet</h3>
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>Create a world first to view transactions.</p>
                    <a href="/dashboard/worlds" className="btn btn-primary">Go to Worlds</a>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout title="Transactions">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="glass-card p-5">
                    <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 500, marginBottom: '6px' }}>Select World</div>
                    <select value={selectedWorld} onChange={e => { setSelectedWorld(e.target.value); setPagination(prev => ({ ...prev, page: 1 })) }} className="form-select" style={{ width: '100%' }}>
                        {worlds.map(w => <option key={w.id} value={w.id} style={{ background: 'var(--color-bg-elevated)' }}>{w.name}</option>)}
                    </select>
                </div>
                <div className="glass-card p-5">
                    <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 500, marginBottom: '4px' }}>Total Volume</div>
                    <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-data)' }}>{currencySymbol}{stats.totalVolume.toLocaleString()}</div>
                </div>
                <div className="glass-card p-5">
                    <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 500, marginBottom: '4px' }}>Transaction Count</div>
                    <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-data)' }}>{stats.transactionCount}</div>
                </div>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
                <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPagination(prev => ({ ...prev, page: 1 })) }} className="form-select" style={{ maxWidth: '180px' }}>
                    <option value="all" style={{ background: 'var(--color-bg-elevated)' }}>All Types</option>
                    <option value="payment" style={{ background: 'var(--color-bg-elevated)' }}>Payments</option>
                    <option value="salary" style={{ background: 'var(--color-bg-elevated)' }}>Salaries</option>
                    <option value="tax" style={{ background: 'var(--color-bg-elevated)' }}>Tax</option>
                    <option value="subsidy" style={{ background: 'var(--color-bg-elevated)' }}>Subsidies</option>
                </select>
                <select value={periodFilter} onChange={e => { setPeriodFilter(e.target.value); setPagination(prev => ({ ...prev, page: 1 })) }} className="form-select" style={{ maxWidth: '180px' }}>
                    <option value="24h" style={{ background: 'var(--color-bg-elevated)' }}>Last 24 hours</option>
                    <option value="7d" style={{ background: 'var(--color-bg-elevated)' }}>Last 7 days</option>
                    <option value="30d" style={{ background: 'var(--color-bg-elevated)' }}>Last 30 days</option>
                    <option value="all" style={{ background: 'var(--color-bg-elevated)' }}>All time</option>
                </select>
            </div>

            <div className="table-container">
                {transactions.length > 0 ? (
                    <>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Type</th><th>From</th><th>To</th>
                                    <th style={{ textAlign: 'right' }}>Amount</th>
                                    <th>Description</th>
                                    <th style={{ textAlign: 'right' }}>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map(tx => (
                                    <tr key={tx.id}>
                                        <td><span className={getTypeBadge(tx.type)}>{tx.type}</span></td>
                                        <td>{tx.senderName}</td>
                                        <td>{tx.receiverName}</td>
                                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{currencySymbol}{tx.amount.toLocaleString()}</td>
                                        <td style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>{tx.description || '-'}</td>
                                        <td style={{ textAlign: 'right', color: 'var(--color-text-muted)', fontSize: '13px' }}>{new Date(tx.createdAt).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {pagination.totalPages > 1 && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderTop: '1px solid var(--color-card-border)' }}>
                                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Showing {transactions.length} of {pagination.total}</div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))} disabled={pagination.page === 1} className="btn btn-ghost btn-sm" style={{ opacity: pagination.page === 1 ? 0.4 : 1 }}>Previous</button>
                                    <span style={{ display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: '13px' }}>Page {pagination.page}/{pagination.totalPages}</span>
                                    <button onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))} disabled={pagination.page >= pagination.totalPages} className="btn btn-ghost btn-sm" style={{ opacity: pagination.page >= pagination.totalPages ? 0.4 : 1 }}>Next</button>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div style={{ textAlign: 'center', padding: '64px 24px' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>💸</div>
                        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No Transactions Yet</h3>
                        <p style={{ color: 'var(--color-text-secondary)', maxWidth: '400px', margin: '0 auto' }}>Transactions will appear as citizens make payments, receive salaries, and conduct business.</p>
                    </div>
                )}
            </div>
        </DashboardLayout>
    )
}

export default function TransactionsPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-primary)' }}><div className="loading-spinner" /></div>}>
            <TransactionsContent />
        </Suspense>
    )
}
