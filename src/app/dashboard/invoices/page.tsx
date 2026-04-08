'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'

interface Invoice {
    id: string; amount: number; description: string
    status: 'PENDING' | 'PAID' | 'CANCELLED' | 'OVERDUE'
    dueDate: string | null; createdAt: string; paidAt: string | null
    senderCitizen?: { displayName: string }; senderBusiness?: { name: string }
    receiverCitizen?: { displayName: string }; receiverBusiness?: { name: string }
}
interface World { id: string; name: string }

function InvoiceContent() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const searchParams = useSearchParams()
    const worldIdParam = searchParams.get('world')
    const [worlds, setWorlds] = useState<World[]>([])
    const [selectedWorld, setSelectedWorld] = useState<string>('')
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'all' | 'PENDING' | 'PAID' | 'CANCELLED' | 'OVERDUE'>('all')

    useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status, router])
    useEffect(() => { if (session?.user) fetchWorlds() }, [session])
    useEffect(() => { if (selectedWorld) fetchInvoices() }, [selectedWorld])

    async function fetchWorlds() {
        try {
            const res = await fetch('/api/worlds'); const data = await res.json()
            if (data.success) {
                const all = [...data.data.owned, ...data.data.member]; setWorlds(all)
                if (worldIdParam) setSelectedWorld(worldIdParam)
                else if (all.length > 0) setSelectedWorld(all[0].id)
            }
        } catch (error) { console.error('Failed to fetch worlds:', error) }
        finally { setLoading(false) }
    }

    async function fetchInvoices() {
        try {
            const res = await fetch(`/api/worlds/${selectedWorld}/invoices`); const data = await res.json()
            if (data.success) setInvoices(data.data)
        } catch (error) { console.error('Failed to fetch invoices:', error) }
    }

    const filtered = filter === 'all' ? invoices : invoices.filter(i => i.status === filter)
    const stats = {
        total: invoices.length,
        pending: invoices.filter(i => i.status === 'PENDING').length,
        paid: invoices.filter(i => i.status === 'PAID').length,
        overdue: invoices.filter(i => i.status === 'OVERDUE').length,
        totalValue: invoices.filter(i => i.status === 'PENDING').reduce((s, i) => s + i.amount, 0),
    }

    function getStatusBadge(invStatus: string) {
        switch (invStatus) {
            case 'PAID': return 'badge badge-success'
            case 'PENDING': return 'badge badge-warning'
            case 'OVERDUE': return 'badge badge-error'
            case 'CANCELLED': return 'badge'
            default: return 'badge'
        }
    }

    function getSenderName(inv: Invoice) { return inv.senderCitizen?.displayName || inv.senderBusiness?.name || 'Unknown' }
    function getReceiverName(inv: Invoice) { return inv.receiverCitizen?.displayName || inv.receiverBusiness?.name || 'Unknown' }

    if (status === 'loading' || loading) {
        return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-primary)' }}><div className="loading-spinner" /></div>
    }

    if (worlds.length === 0) {
        return (
            <DashboardLayout title="Invoices">
                <div className="glass-card p-8" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🧾</div>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No Worlds Yet</h3>
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>Create a world first to view invoices.</p>
                    <a href="/dashboard/worlds" className="btn btn-primary">Go to Worlds</a>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout title="Invoices">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-6">
                <div className="glass-card p-5">
                    <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 500, marginBottom: '6px' }}>Select World</div>
                    <select value={selectedWorld} onChange={e => setSelectedWorld(e.target.value)} className="form-select" style={{ width: '100%' }}>
                        {worlds.map(w => <option key={w.id} value={w.id} style={{ background: 'var(--color-bg-elevated)' }}>{w.name}</option>)}
                    </select>
                </div>
                <div className="glass-card p-5">
                    <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 500, marginBottom: '6px' }}>Status</div>
                    <select value={filter} onChange={e => setFilter(e.target.value as typeof filter)} className="form-select" style={{ width: '100%' }}>
                        <option value="all" style={{ background: 'var(--color-bg-elevated)' }}>All</option>
                        <option value="PENDING" style={{ background: 'var(--color-bg-elevated)' }}>Pending</option>
                        <option value="PAID" style={{ background: 'var(--color-bg-elevated)' }}>Paid</option>
                        <option value="OVERDUE" style={{ background: 'var(--color-bg-elevated)' }}>Overdue</option>
                        <option value="CANCELLED" style={{ background: 'var(--color-bg-elevated)' }}>Cancelled</option>
                    </select>
                </div>
                {[
                    { label: 'Total', value: stats.total },
                    { label: 'Pending', value: stats.pending },
                    { label: 'Overdue', value: stats.overdue },
                    { label: 'Outstanding', value: stats.totalValue.toLocaleString() },
                ].map((s, i) => (
                    <div key={i} className="glass-card p-5">
                        <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 500, marginBottom: '4px' }}>{s.label}</div>
                        <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-data)' }}>{s.value}</div>
                    </div>
                ))}
            </div>

            {filtered.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {filtered.map(inv => (
                        <div key={inv.id} className="glass-card p-5">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span className={getStatusBadge(inv.status)}>{inv.status}</span>
                                    <span style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-data)' }}>{inv.amount.toLocaleString()}</span>
                                </div>
                                <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{new Date(inv.createdAt).toLocaleDateString()}</div>
                            </div>
                            <div style={{ color: 'var(--color-text-secondary)', marginBottom: '8px' }}>{inv.description}</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                                <span>From: <span style={{ color: 'var(--color-text-primary)' }}>{getSenderName(inv)}</span></span>
                                <span>To: <span style={{ color: 'var(--color-text-primary)' }}>{getReceiverName(inv)}</span></span>
                                {inv.dueDate && <span>Due: <span style={{ color: 'var(--color-text-primary)' }}>{new Date(inv.dueDate).toLocaleDateString()}</span></span>}
                                {inv.paidAt && <span>Paid: <span style={{ color: 'var(--color-success)' }}>{new Date(inv.paidAt).toLocaleDateString()}</span></span>}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="glass-card p-8" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🧾</div>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No Invoices</h3>
                    <p style={{ color: 'var(--color-text-secondary)' }}>Invoices will appear here once they are created via Discord.</p>
                </div>
            )}
        </DashboardLayout>
    )
}

export default function InvoicePage() {
    return (
        <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-primary)' }}><div className="loading-spinner" /></div>}>
            <InvoiceContent />
        </Suspense>
    )
}
