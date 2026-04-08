'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'

interface ProductionChain {
    businessId: string; businessName: string; type: string; isOperating: boolean
    operatingCost: number; inputs: { resource: string; quantity: number }[]
    outputs: { resource: string; quantity: number }[]; employeeCount: number
}
interface World { id: string; name: string }

function ProductionContent() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const searchParams = useSearchParams()
    const worldIdParam = searchParams.get('world')
    const [worlds, setWorlds] = useState<World[]>([])
    const [selectedWorld, setSelectedWorld] = useState<string>('')
    const [chains, setChains] = useState<ProductionChain[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status, router])
    useEffect(() => { if (session?.user) fetchWorlds() }, [session])
    useEffect(() => { if (selectedWorld) fetchProduction() }, [selectedWorld])

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

    async function fetchProduction() {
        try {
            const res = await fetch(`/api/worlds/${selectedWorld}/production`); const data = await res.json()
            if (data.success) setChains(data.data)
        } catch (error) { console.error('Failed to fetch production:', error) }
    }

    const operating = chains.filter(c => c.isOperating)
    const idle = chains.filter(c => !c.isOperating)
    const totalCost = operating.reduce((s, c) => s + c.operatingCost, 0)

    if (status === 'loading' || loading) {
        return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-primary)' }}><div className="loading-spinner" /></div>
    }

    if (worlds.length === 0) {
        return (
            <DashboardLayout title="Production">
                <div className="glass-card p-8" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚙️</div>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No Worlds Yet</h3>
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>Create a world first to view production.</p>
                    <a href="/dashboard/worlds" className="btn btn-primary">Go to Worlds</a>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout title="Production">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-6">
                <div className="glass-card p-5">
                    <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 500, marginBottom: '6px' }}>Select World</div>
                    <select value={selectedWorld} onChange={e => setSelectedWorld(e.target.value)} className="form-select" style={{ width: '100%' }}>
                        {worlds.map(w => <option key={w.id} value={w.id} style={{ background: 'var(--color-bg-elevated)' }}>{w.name}</option>)}
                    </select>
                </div>
                {[
                    { label: 'Total Businesses', value: chains.length },
                    { label: 'Operating', value: operating.length },
                    { label: 'Idle', value: idle.length },
                    { label: 'Total Operating Cost', value: `${totalCost.toLocaleString()}/cycle` },
                ].map((s, i) => (
                    <div key={i} className="glass-card p-5">
                        <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 500, marginBottom: '4px' }}>{s.label}</div>
                        <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-data)' }}>{s.value}</div>
                    </div>
                ))}
            </div>

            {chains.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {chains.map(chain => (
                        <div key={chain.businessId} className="glass-card glow-border p-6">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <div>
                                    <h3 style={{ fontSize: '16px', fontWeight: 600 }}>{chain.businessName}</h3>
                                    <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{chain.type.replace(/_/g, ' ')}</p>
                                </div>
                                <span className={chain.isOperating ? 'badge badge-success' : 'badge badge-warning'}>
                                    {chain.isOperating ? '🟢 Operating' : '🟡 Idle'}
                                </span>
                            </div>

                            {/* Production Flow */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                <div style={{ flex: 1, background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-lg)', padding: '12px' }}>
                                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>INPUTS</div>
                                    {chain.inputs.length > 0 ? chain.inputs.map((inp, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                            <span>{inp.resource}</span>
                                            <span style={{ color: 'var(--color-error)', fontFamily: 'var(--font-mono)' }}>-{inp.quantity}</span>
                                        </div>
                                    )) : <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>No inputs</div>}
                                </div>

                                <div style={{ fontSize: '20px', color: 'var(--color-accent)' }}>→</div>

                                <div style={{ flex: 1, background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-lg)', padding: '12px' }}>
                                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>OUTPUTS</div>
                                    {chain.outputs.length > 0 ? chain.outputs.map((out, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                            <span>{out.resource}</span>
                                            <span style={{ color: 'var(--color-success)', fontFamily: 'var(--font-mono)' }}>+{out.quantity}</span>
                                        </div>
                                    )) : <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>No outputs</div>}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                                <span>👥 {chain.employeeCount} employees</span>
                                <span>💰 <span style={{ fontFamily: 'var(--font-mono)' }}>{chain.operatingCost}</span>/cycle cost</span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="glass-card p-8" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚙️</div>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No Production</h3>
                    <p style={{ color: 'var(--color-text-secondary)' }}>Businesses and their production chains will appear here.</p>
                </div>
            )}
        </DashboardLayout>
    )
}

export default function ProductionPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-primary)' }}><div className="loading-spinner" /></div>}>
            <ProductionContent />
        </Suspense>
    )
}
