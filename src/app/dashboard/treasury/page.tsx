'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import IssueSubsidyModal from '@/components/modals/IssueSubsidyModal'

interface TreasuryData {
    balance: number
    taxRevenue: number
    subsidiesPaid: number
    salesTaxRate: number
    incomeTaxRate: number
    propertyTaxRate: number
    currencySymbol: string
    isOwner: boolean
    recentTaxes: Array<{
        id: string
        amount: number
        senderName: string
        createdAt: string
    }>
}

interface World {
    id: string
    name: string
}

function TreasuryContent() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const searchParams = useSearchParams()
    const worldIdParam = searchParams.get('world')

    const [worlds, setWorlds] = useState<World[]>([])
    const [selectedWorld, setSelectedWorld] = useState<string>('')
    const [treasury, setTreasury] = useState<TreasuryData | null>(null)
    const [loading, setLoading] = useState(true)
    const [showTaxModal, setShowTaxModal] = useState(false)
    const [showSubsidyModal, setShowSubsidyModal] = useState(false)
    const [taxRates, setTaxRates] = useState({ salesTaxRate: 5, incomeTaxRate: 10, propertyTaxRate: 2 })
    const [saving, setSaving] = useState(false)

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
            fetchTreasury(selectedWorld)
        }
    }, [selectedWorld])

    async function fetchWorlds() {
        try {
            const res = await fetch('/api/worlds')
            const data = await res.json()
            if (data.success) {
                const allWorlds = [...data.data.owned, ...data.data.member]
                setWorlds(allWorlds)
                // Set initial world from URL param or first owned world
                if (worldIdParam) {
                    setSelectedWorld(worldIdParam)
                } else if (data.data.owned.length > 0) {
                    setSelectedWorld(data.data.owned[0].id)
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

    async function fetchTreasury(worldId: string) {
        try {
            const res = await fetch(`/api/worlds/${worldId}/treasury`)
            const data = await res.json()
            if (data.success) {
                setTreasury(data.data)
                setTaxRates({
                    salesTaxRate: data.data.salesTaxRate,
                    incomeTaxRate: data.data.incomeTaxRate,
                    propertyTaxRate: data.data.propertyTaxRate
                })
            }
        } catch (error) {
            console.error('Failed to fetch treasury:', error)
        }
    }

    async function handleSaveTaxRates() {
        setSaving(true)
        try {
            const res = await fetch(`/api/worlds/${selectedWorld}/treasury`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(taxRates)
            })
            const data = await res.json()
            if (data.success) {
                setTreasury(prev => prev ? { ...prev, ...taxRates } : null)
                setShowTaxModal(false)
            }
        } catch (error) {
            console.error('Failed to update tax rates:', error)
        } finally {
            setSaving(false)
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
            <DashboardLayout title="Treasury">
                <div className="glass-card p-8 text-center">
                    <div className="text-6xl mb-4">🏦</div>
                    <h3 className="text-xl font-medium text-white mb-2">No Worlds Yet</h3>
                    <p className="text-gray-400 mb-6">Create a world first to access its treasury.</p>
                    <a href="/dashboard/worlds" className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg text-white font-medium">
                        Go to Worlds
                    </a>
                </div>
            </DashboardLayout>
        )
    }

    const symbol = treasury?.currencySymbol || '©'

    return (
        <DashboardLayout title="Treasury">
            {/* World Selector */}
            <div className="mb-6">
                <select
                    value={selectedWorld}
                    onChange={e => setSelectedWorld(e.target.value)}
                    className="p-3 bg-white/10 border border-white/20 rounded-lg text-white min-w-[200px]"
                >
                    {worlds.map(w => (
                        <option key={w.id} value={w.id} className="bg-gray-900">{w.name}</option>
                    ))}
                </select>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-gray-400">Balance</span>
                        <span className="text-2xl">🏦</span>
                    </div>
                    <div className="text-3xl font-bold text-white">
                        {symbol}{treasury?.balance?.toLocaleString() || '0'}
                    </div>
                    <div className="text-green-400 text-sm mt-2">Treasury funds</div>
                </div>

                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-gray-400">Tax Revenue</span>
                        <span className="text-2xl">💰</span>
                    </div>
                    <div className="text-3xl font-bold text-white">
                        {symbol}{treasury?.taxRevenue?.toLocaleString() || '0'}
                    </div>
                    <div className="text-gray-400 text-sm mt-2">Total collected</div>
                </div>

                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-gray-400">Subsidies Paid</span>
                        <span className="text-2xl">📤</span>
                    </div>
                    <div className="text-3xl font-bold text-white">
                        {symbol}{treasury?.subsidiesPaid?.toLocaleString() || '0'}
                    </div>
                    <div className="text-gray-400 text-sm mt-2">Total distributed</div>
                </div>

                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-gray-400">Sales Tax Rate</span>
                        <span className="text-2xl">📊</span>
                    </div>
                    <div className="text-3xl font-bold text-white">{treasury?.salesTaxRate || 0}%</div>
                    <div className="text-gray-400 text-sm mt-2">Current rate</div>
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Tax Collections */}
                <div className="glass-card p-6">
                    <h2 className="text-xl font-semibold text-white mb-4">Recent Tax Collections</h2>
                    {treasury?.recentTaxes && treasury.recentTaxes.length > 0 ? (
                        <div className="space-y-3">
                            {treasury.recentTaxes.map(tax => (
                                <div key={tax.id} className="flex items-center justify-between py-2 border-b border-white/10">
                                    <div>
                                        <div className="text-white">{tax.senderName}</div>
                                        <div className="text-gray-400 text-sm">
                                            {new Date(tax.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div className="text-green-400 font-medium">
                                        +{symbol}{tax.amount.toLocaleString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-400">
                            <div className="text-4xl mb-4">📭</div>
                            <p>No tax transactions yet</p>
                        </div>
                    )}
                </div>

                {/* Treasury Actions */}
                <div className="glass-card p-6">
                    <h2 className="text-xl font-semibold text-white mb-4">Treasury Actions</h2>

                    <div className="space-y-4">
                        <button
                            onClick={() => setShowSubsidyModal(true)}
                            disabled={!treasury?.isOwner}
                            className="w-full p-4 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-lg text-left hover:border-purple-500/50 transition disabled:opacity-50"
                        >
                            <div className="font-medium text-white">💸 Issue Subsidy</div>
                            <div className="text-sm text-gray-400 mt-1">Send funds from treasury to citizens</div>
                        </button>

                        <button
                            onClick={() => setShowTaxModal(true)}
                            disabled={!treasury?.isOwner}
                            className="w-full p-4 bg-gradient-to-r from-green-500/20 to-teal-500/20 border border-green-500/30 rounded-lg text-left hover:border-green-500/50 transition disabled:opacity-50"
                        >
                            <div className="font-medium text-white">📈 Adjust Tax Rates</div>
                            <div className="text-sm text-gray-400 mt-1">Modify sales, income, or property tax rates</div>
                        </button>

                        <a
                            href={`/dashboard/transactions?world=${selectedWorld}`}
                            className="block w-full p-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-lg text-left hover:border-yellow-500/50 transition"
                        >
                            <div className="font-medium text-white">📋 View All Transactions</div>
                            <div className="text-sm text-gray-400 mt-1">See complete transaction history</div>
                        </a>
                    </div>

                    {!treasury?.isOwner && (
                        <p className="text-gray-500 text-sm mt-4">
                            * Only the world owner can manage the treasury
                        </p>
                    )}
                </div>
            </div>

            {/* Tax Modal */}
            {showTaxModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowTaxModal(false)} />
                    <div className="relative glass-card p-6 w-full max-w-md">
                        <h2 className="text-xl font-semibold text-white mb-4">Adjust Tax Rates</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Sales Tax (%)</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={taxRates.salesTaxRate}
                                    onChange={e => setTaxRates(prev => ({ ...prev, salesTaxRate: Number(e.target.value) }))}
                                    className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Income Tax (%)</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={taxRates.incomeTaxRate}
                                    onChange={e => setTaxRates(prev => ({ ...prev, incomeTaxRate: Number(e.target.value) }))}
                                    className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Property Tax (%)</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={taxRates.propertyTaxRate}
                                    onChange={e => setTaxRates(prev => ({ ...prev, propertyTaxRate: Number(e.target.value) }))}
                                    className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowTaxModal(false)} className="flex-1 py-3 bg-white/10 rounded-lg text-white">
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveTaxRates}
                                disabled={saving}
                                className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg text-white font-medium disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showSubsidyModal && (
                <IssueSubsidyModal
                    worldId={selectedWorld}
                    currencySymbol={symbol}
                    onClose={() => setShowSubsidyModal(false)}
                    onSuccess={() => {
                        setShowSubsidyModal(false)
                        fetchTreasury(selectedWorld)
                    }}
                />
            )}
        </DashboardLayout>
    )
}

export default function TreasuryPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
                <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full"></div>
            </div>
        }>
            <TreasuryContent />
        </Suspense>
    )
}
