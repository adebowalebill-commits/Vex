'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'

interface ProductionChain {
    businessId: string
    businessName: string
    type: string
    isOperating: boolean
    operatingCost: number
    inputs: { resource: string; quantity: number }[]
    outputs: { resource: string; quantity: number }[]
    employeeCount: number
}

interface World {
    id: string
    name: string
}

function ProductionContent() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const searchParams = useSearchParams()
    const worldIdParam = searchParams.get('world')

    const [worlds, setWorlds] = useState<World[]>([])
    const [selectedWorld, setSelectedWorld] = useState<string>('')
    const [chains, setChains] = useState<ProductionChain[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login')
    }, [status, router])

    useEffect(() => {
        if (session?.user) fetchWorlds()
    }, [session])

    useEffect(() => {
        if (selectedWorld) fetchProduction()
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

    async function fetchProduction() {
        try {
            const res = await fetch(`/api/worlds/${selectedWorld}/production`)
            const data = await res.json()
            if (data.success) setChains(data.data)
        } catch (error) {
            console.error('Failed to fetch production:', error)
        }
    }

    const operating = chains.filter(c => c.isOperating)
    const idle = chains.filter(c => !c.isOperating)
    const totalCost = operating.reduce((s, c) => s + c.operatingCost, 0)

    if (status === 'loading' || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
                <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full"></div>
            </div>
        )
    }

    if (worlds.length === 0) {
        return (
            <DashboardLayout title="Production">
                <div className="glass-card p-8 text-center">
                    <div className="text-6xl mb-4">⚙️</div>
                    <h3 className="text-xl font-medium text-white mb-2">No Worlds Yet</h3>
                    <p className="text-gray-400 mb-6">Create a world first to view production.</p>
                    <a href="/dashboard/worlds" className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg text-white font-medium">
                        Go to Worlds
                    </a>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout title="Production">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
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
                    <div className="text-gray-400 text-sm">Total Businesses</div>
                    <div className="text-2xl font-bold text-white mt-1">{chains.length}</div>
                </div>
                <div className="glass-card p-4">
                    <div className="text-gray-400 text-sm">Operating</div>
                    <div className="text-2xl font-bold text-green-400 mt-1">{operating.length}</div>
                </div>
                <div className="glass-card p-4">
                    <div className="text-gray-400 text-sm">Idle</div>
                    <div className="text-2xl font-bold text-yellow-400 mt-1">{idle.length}</div>
                </div>
                <div className="glass-card p-4">
                    <div className="text-gray-400 text-sm">Total Operating Cost</div>
                    <div className="text-2xl font-bold text-red-400 mt-1">{totalCost.toLocaleString()}/cycle</div>
                </div>
            </div>

            {/* Production Chains */}
            {chains.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {chains.map(chain => (
                        <div key={chain.businessId} className="glass-card p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-white">{chain.businessName}</h3>
                                    <p className="text-sm text-gray-400">{chain.type.replace(/_/g, ' ')}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded-full text-xs ${chain.isOperating
                                            ? 'bg-green-500/20 text-green-400'
                                            : 'bg-yellow-500/20 text-yellow-400'
                                        }`}>
                                        {chain.isOperating ? '🟢 Operating' : '🟡 Idle'}
                                    </span>
                                </div>
                            </div>

                            {/* Production Flow */}
                            <div className="flex items-center gap-3 mb-4">
                                {/* Inputs */}
                                <div className="flex-1 glass-card p-3">
                                    <div className="text-xs text-gray-400 mb-2">INPUTS</div>
                                    {chain.inputs.length > 0 ? chain.inputs.map((inp, i) => (
                                        <div key={i} className="text-sm text-white flex justify-between">
                                            <span>{inp.resource}</span>
                                            <span className="text-red-400">-{inp.quantity}</span>
                                        </div>
                                    )) : (
                                        <div className="text-sm text-gray-500">No inputs</div>
                                    )}
                                </div>

                                {/* Arrow */}
                                <div className="text-2xl text-purple-400">→</div>

                                {/* Outputs */}
                                <div className="flex-1 glass-card p-3">
                                    <div className="text-xs text-gray-400 mb-2">OUTPUTS</div>
                                    {chain.outputs.length > 0 ? chain.outputs.map((out, i) => (
                                        <div key={i} className="text-sm text-white flex justify-between">
                                            <span>{out.resource}</span>
                                            <span className="text-green-400">+{out.quantity}</span>
                                        </div>
                                    )) : (
                                        <div className="text-sm text-gray-500">No outputs</div>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-4 text-sm text-gray-400">
                                <span>👥 {chain.employeeCount} employees</span>
                                <span>💰 {chain.operatingCost}/cycle cost</span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="glass-card p-8 text-center">
                    <div className="text-6xl mb-4">⚙️</div>
                    <h3 className="text-xl font-medium text-white mb-2">No Production</h3>
                    <p className="text-gray-400">Businesses and their production chains will appear here.</p>
                </div>
            )}
        </DashboardLayout>
    )
}

export default function ProductionPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
                <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full"></div>
            </div>
        }>
            <ProductionContent />
        </Suspense>
    )
}
