'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'

interface Transaction {
    id: string
    amount: number
    type: string
    description: string | null
    senderName: string
    receiverName: string
    createdAt: string
}

interface World {
    id: string
    name: string
}

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

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login')
        }
    }, [status, router])

    useEffect(() => {
        if (session?.user) {
            fetchWorlds()
        }
    }, [session])

    useEffect(() => {
        if (selectedWorld) {
            fetchTransactions()
        }
    }, [selectedWorld, typeFilter, periodFilter, pagination.page])

    async function fetchWorlds() {
        try {
            const res = await fetch('/api/worlds')
            const data = await res.json()
            if (data.success) {
                const allWorlds = [...data.data.owned, ...data.data.member]
                setWorlds(allWorlds)
                if (worldIdParam) {
                    setSelectedWorld(worldIdParam)
                } else if (allWorlds.length > 0) {
                    setSelectedWorld(allWorlds[0].id)
                }
            }
        } catch (error) {
            console.error('Failed to fetch worlds:', error)
        } finally {
            setLoading(false)
        }
    }

    async function fetchTransactions() {
        try {
            const params = new URLSearchParams({
                page: pagination.page.toString(),
                limit: '20',
                type: typeFilter,
                period: periodFilter
            })
            const res = await fetch(`/api/worlds/${selectedWorld}/transactions?${params}`)
            const data = await res.json()
            if (data.success) {
                setTransactions(data.data.transactions)
                setCurrencySymbol(data.data.currencySymbol)
                setStats(data.data.stats)
                setPagination(prev => ({
                    ...prev,
                    total: data.data.pagination.total,
                    totalPages: data.data.pagination.totalPages
                }))
            }
        } catch (error) {
            console.error('Failed to fetch transactions:', error)
        }
    }

    function getTypeColor(type: string) {
        switch (type) {
            case 'PAYMENT': return 'bg-blue-500/20 text-blue-400'
            case 'SALARY': return 'bg-green-500/20 text-green-400'
            case 'TAX': return 'bg-yellow-500/20 text-yellow-400'
            case 'SUBSIDY': return 'bg-purple-500/20 text-purple-400'
            default: return 'bg-gray-500/20 text-gray-400'
        }
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
            <DashboardLayout title="Transactions">
                <div className="glass-card p-8 text-center">
                    <div className="text-6xl mb-4">💸</div>
                    <h3 className="text-xl font-medium text-white mb-2">No Worlds Yet</h3>
                    <p className="text-gray-400 mb-6">Create a world first to view transactions.</p>
                    <a href="/dashboard/worlds" className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg text-white font-medium">
                        Go to Worlds
                    </a>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout title="Transactions">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="glass-card p-4">
                    <label className="block text-sm text-gray-400 mb-2">Select World</label>
                    <select
                        value={selectedWorld}
                        onChange={e => {
                            setSelectedWorld(e.target.value)
                            setPagination(prev => ({ ...prev, page: 1 }))
                        }}
                        className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    >
                        {worlds.map(w => (
                            <option key={w.id} value={w.id} className="bg-gray-900">{w.name}</option>
                        ))}
                    </select>
                </div>
                <div className="glass-card p-4">
                    <div className="text-gray-400 text-sm">Total Volume</div>
                    <div className="text-2xl font-bold text-white mt-1">
                        {currencySymbol}{stats.totalVolume.toLocaleString()}
                    </div>
                </div>
                <div className="glass-card p-4">
                    <div className="text-gray-400 text-sm">Transaction Count</div>
                    <div className="text-2xl font-bold text-white mt-1">{stats.transactionCount}</div>
                </div>
            </div>

            {/* Filters */}
            <div className="glass-card p-4 mb-6">
                <div className="flex flex-wrap gap-4">
                    <select
                        value={typeFilter}
                        onChange={e => {
                            setTypeFilter(e.target.value)
                            setPagination(prev => ({ ...prev, page: 1 }))
                        }}
                        className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"
                    >
                        <option value="all" className="bg-gray-900">All Types</option>
                        <option value="payment" className="bg-gray-900">Payments</option>
                        <option value="salary" className="bg-gray-900">Salaries</option>
                        <option value="tax" className="bg-gray-900">Tax</option>
                        <option value="subsidy" className="bg-gray-900">Subsidies</option>
                    </select>
                    <select
                        value={periodFilter}
                        onChange={e => {
                            setPeriodFilter(e.target.value)
                            setPagination(prev => ({ ...prev, page: 1 }))
                        }}
                        className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"
                    >
                        <option value="24h" className="bg-gray-900">Last 24 hours</option>
                        <option value="7d" className="bg-gray-900">Last 7 days</option>
                        <option value="30d" className="bg-gray-900">Last 30 days</option>
                        <option value="all" className="bg-gray-900">All time</option>
                    </select>
                </div>
            </div>

            {/* Transactions List */}
            <div className="glass-card p-6">
                {transactions.length > 0 ? (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Type</th>
                                        <th className="text-left py-3 px-4 text-gray-400 font-medium">From</th>
                                        <th className="text-left py-3 px-4 text-gray-400 font-medium">To</th>
                                        <th className="text-right py-3 px-4 text-gray-400 font-medium">Amount</th>
                                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Description</th>
                                        <th className="text-right py-3 px-4 text-gray-400 font-medium">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map(tx => (
                                        <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5">
                                            <td className="py-3 px-4">
                                                <span className={`px-2 py-1 rounded-full text-xs ${getTypeColor(tx.type)}`}>
                                                    {tx.type}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-white">{tx.senderName}</td>
                                            <td className="py-3 px-4 text-white">{tx.receiverName}</td>
                                            <td className="py-3 px-4 text-right text-white font-medium">
                                                {currencySymbol}{tx.amount.toLocaleString()}
                                            </td>
                                            <td className="py-3 px-4 text-gray-400 text-sm">
                                                {tx.description || '-'}
                                            </td>
                                            <td className="py-3 px-4 text-right text-gray-400 text-sm">
                                                {new Date(tx.createdAt).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {pagination.totalPages > 1 && (
                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                                <div className="text-gray-400 text-sm">
                                    Showing {transactions.length} of {pagination.total} transactions
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                        disabled={pagination.page === 1}
                                        className="px-3 py-1 bg-white/10 rounded text-white disabled:opacity-50"
                                    >
                                        Previous
                                    </button>
                                    <span className="px-3 py-1 text-white">
                                        Page {pagination.page} of {pagination.totalPages}
                                    </span>
                                    <button
                                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                        disabled={pagination.page >= pagination.totalPages}
                                        className="px-3 py-1 bg-white/10 rounded text-white disabled:opacity-50"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-16 text-gray-400">
                        <div className="text-6xl mb-4">💸</div>
                        <h3 className="text-xl font-medium text-white mb-2">No Transactions Yet</h3>
                        <p className="text-gray-400 max-w-md mx-auto">
                            Transactions will appear here as citizens make payments,
                            receive salaries, and conduct business.
                        </p>
                    </div>
                )}
            </div>
        </DashboardLayout>
    )
}

export default function TransactionsPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
                <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full"></div>
            </div>
        }>
            <TransactionsContent />
        </Suspense>
    )
}
