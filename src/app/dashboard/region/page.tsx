'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'

interface Region {
    id: string; name: string; description: string | null; mayorName: string | null
    citizenCount: number; businessCount: number; isActive: boolean; createdAt: string
}
interface World { id: string; name: string }

function RegionContent() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const searchParams = useSearchParams()
    const worldIdParam = searchParams.get('world')
    const [worlds, setWorlds] = useState<World[]>([])
    const [selectedWorld, setSelectedWorld] = useState<string>('')
    const [regions, setRegions] = useState<Region[]>([])
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({ total: 0, active: 0, totalPopulation: 0 })

    useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status, router])
    useEffect(() => { if (session?.user) fetchWorlds() }, [session])
    useEffect(() => { if (selectedWorld) fetchRegions() }, [selectedWorld])

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

    async function fetchRegions() {
        try {
            const res = await fetch(`/api/worlds/${selectedWorld}/regions`); const data = await res.json()
            if (data.success) { setRegions(data.data.regions); setStats(data.data.stats) }
        } catch (error) { console.error('Failed to fetch regions:', error) }
    }

    if (status === 'loading' || loading) {
        return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-primary)' }}><div className="loading-spinner" /></div>
    }

    if (worlds.length === 0) {
        return (
            <DashboardLayout title="Regions">
                <div className="glass-card p-8" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🗺️</div>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No Worlds Yet</h3>
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>Create a world first to manage regions.</p>
                    <a href="/dashboard/worlds" className="btn btn-primary">Go to Worlds</a>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout title="Regions">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="glass-card p-5">
                    <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 500, marginBottom: '6px' }}>Select World</div>
                    <select value={selectedWorld} onChange={e => setSelectedWorld(e.target.value)} className="form-select" style={{ width: '100%' }}>
                        {worlds.map(w => <option key={w.id} value={w.id} style={{ background: 'var(--color-bg-elevated)' }}>{w.name}</option>)}
                    </select>
                </div>
                {[
                    { label: 'Total Regions', value: stats.total },
                    { label: 'Active Regions', value: stats.active },
                    { label: 'Total Population', value: stats.totalPopulation },
                ].map((s, i) => (
                    <div key={i} className="glass-card p-5">
                        <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 500, marginBottom: '4px' }}>{s.label}</div>
                        <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-data)' }}>{s.value}</div>
                    </div>
                ))}
            </div>

            {regions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {regions.map(region => (
                        <div key={region.id} className="glass-card glow-border p-6">
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <div>
                                    <h3 style={{ fontSize: '16px', fontWeight: 600 }}>{region.name}</h3>
                                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>
                                        {region.mayorName ? `Mayor: ${region.mayorName}` : 'No Mayor'}
                                    </p>
                                </div>
                                <span className={region.isActive ? 'badge badge-success' : 'badge badge-warning'}>{region.isActive ? 'Active' : 'Inactive'}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div style={{ background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-lg)', padding: '12px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-data)' }}>{region.citizenCount}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Citizens</div>
                                </div>
                                <div style={{ background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-lg)', padding: '12px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-data)' }}>{region.businessCount}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Businesses</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="glass-card p-8" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🗺️</div>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No Regions Yet</h3>
                    <p style={{ color: 'var(--color-text-secondary)', maxWidth: '400px', margin: '0 auto' }}>
                        Regions will appear here once they are created for this world.
                    </p>
                </div>
            )}
        </DashboardLayout>
    )
}

export default function RegionPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-primary)' }}><div className="loading-spinner" /></div>}>
            <RegionContent />
        </Suspense>
    )
}
