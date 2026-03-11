'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'

interface Invoice {
    id: string
    amount: number
    description: string
    status: 'PENDING' | 'PAID' | 'CANCELLED' | 'OVERDUE'
    dueDate: string | null
    createdAt: string
    paidAt: string | null
    senderCitizen?: { displayName: string }
    senderBusiness?: { name: string }
    receiverCitizen?: { displayName: string }
    receiverBusiness?: { name: string }
}

interface World {
    id: string
    name: string
}

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

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login')
    }, [status, router])

    useEffect(() => {
        if (session?.user) fetchWorlds()
    }, [session])

    useEffect(() => {
        if (selectedWorld) fetchInvoices()
    }, [selectedWorld])

    async function fetchWorlds() {
        try {
            const res = await fetch('/api/worlds')
            const data = await res.json()
            if (data.success) {
                const all = [...data.data.owned, ...data.data.member]
                setWorlds(all)
                if (worldIdParam) setSelectedWorld(worldIdParam)
                else if (all.length > 0) setSelectedWorld(all[0].id)
            }
        } catch (error) {
            console.error('Failed to fetch worlds:', error)
        } finally {
            setLoading(false)
        }
    }

    async function fetchInvoices() {
        try {
            const res = await fetch(`/api/worlds/${selectedWorld}/invoices`)
            const data = await res.json()
            if (data.success) setInvoices(data.data)
        } catch (error) {
            console.error('Failed to fetch invoices:', error)
        }
    }

    const filtered = filter === 'all' ? invoices : invoices.filter(i => i.status === filter)

    const stats = {
        total: invoices.length,
        pending: invoices.filter(i => i.status === 'PENDING').length,
        paid: invoices.filter(i => i.status === 'PAID').length,
        overdue: invoices.filter(i => i.status === 'OVERDUE').length,
        totalValue: invoices.filter(i => i.status === 'PENDING').reduce((s, i) => s + i.amount, 0),
    }

    function getStatusColor(status: string) {
        switch (status) {
            case 'PAID': return 'bg-green-500/20 text-green-400'
            case 'PENDING': return 'bg-yellow-500/20 text-yellow-400'
            case 'OVERDUE': return 'bg-red-500/20 text-red-400'
            case 'CANCELLED': return 'bg-gray-500/20 text-gray-400'
            default: return 'bg-gray-500/20 text-gray-400'
        }
    }

    function getSenderName(inv: Invoice) {
        return inv.senderCitizen?.displayName || inv.senderBusiness?.name || 'Unknown'
    }

    function getReceiverName(inv: Invoice) {
        return inv.receiverCitizen?.displayName || inv.receiverBusiness?.name || 'Unknown'
    }

    if (status === 'loading' || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
                <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full"></div>
            </div>
        )
    }

    if (worlds.length === 0) {
        return (
            <DashboardLayout title="Invoices">
                <div className="glass-card p-8 text-center">
                    <div className="text-6xl mb-4">🧾</div>
                    <h3 className="text-xl font-medium text-white mb-2">No Worlds Yet</h3>
                    <p className="text-gray-400 mb-6">Create a world first to view invoices.</p>
                    <a href="/dashboard/worlds" className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg text-white font-medium">
                        Go to Worlds
                    </a>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout title="Invoices">
            {/* Controls & Stats */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-6">
                <div className="glass-card p-4">
                    <label className="block text-sm text-gray-400 mb-2">Select World</label>
                    <select
                        value={selectedWorld}
                        onChange={e => setSelectedWorld(e.target.value)}
                        className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    >
                        {worlds.map(w => (
                            <option key={w.id} value={w.id} className="bg-gray-900">{w.name}</option>
                        ))}
                    </select>
                </div>
                <div className="glass-card p-4">
                    <label className="block text-sm text-gray-400 mb-2">Status</label>
                    <select
                        value={filter}
                        onChange={e => setFilter(e.target.value as typeof filter)}
                        className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    >
                        <option value="all" className="bg-gray-900">All</option>
                        <option value="PENDING" className="bg-gray-900">Pending</option>
                        <option value="PAID" className="bg-gray-900">Paid</option>
                        <option value="OVERDUE" className="bg-gray-900">Overdue</option>
                        <option value="CANCELLED" className="bg-gray-900">Cancelled</option>
                    </select>
                </div>
                <div className="glass-card p-4">
                    <div className="text-gray-400 text-sm">Total</div>
                    <div className="text-2xl font-bold text-white mt-1">{stats.total}</div>
                </div>
                <div className="glass-card p-4">
                    <div className="text-gray-400 text-sm">Pending</div>
                    <div className="text-2xl font-bold text-yellow-400 mt-1">{stats.pending}</div>
                </div>
                <div className="glass-card p-4">
                    <div className="text-gray-400 text-sm">Overdue</div>
                    <div className="text-2xl font-bold text-red-400 mt-1">{stats.overdue}</div>
                </div>
                <div className="glass-card p-4">
                    <div className="text-gray-400 text-sm">Outstanding</div>
                    <div className="text-2xl font-bold text-green-400 mt-1">{stats.totalValue.toLocaleString()}</div>
                </div>
            </div>

            {/* Invoice List */}
            {filtered.length > 0 ? (
                <div className="space-y-4">
                    {filtered.map(inv => (
                        <div key={inv.id} className="glass-card p-5">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(inv.status)}`}>
                                        {inv.status}
                                    </span>
                                    <span className="text-2xl font-bold text-white">{inv.amount.toLocaleString()}</span>
                                </div>
                                <div className="text-sm text-gray-400">
                                    {new Date(inv.createdAt).toLocaleDateString()}
                                </div>
                            </div>
                            <div className="text-gray-300 mb-2">{inv.description}</div>
                            <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                                <span>From: <span className="text-white">{getSenderName(inv)}</span></span>
                                <span>To: <span className="text-white">{getReceiverName(inv)}</span></span>
                                {inv.dueDate && (
                                    <span>Due: <span className="text-white">{new Date(inv.dueDate).toLocaleDateString()}</span></span>
                                )}
                                {inv.paidAt && (
                                    <span>Paid: <span className="text-green-400">{new Date(inv.paidAt).toLocaleDateString()}</span></span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="glass-card p-8 text-center">
                    <div className="text-6xl mb-4">🧾</div>
                    <h3 className="text-xl font-medium text-white mb-2">No Invoices</h3>
                    <p className="text-gray-400">Invoices will appear here once they are created via Discord.</p>
                </div>
            )}
        </DashboardLayout>
    )
}

export default function InvoicePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
                <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full"></div>
            </div>
        }>
            <InvoiceContent />
        </Suspense>
    )
}
