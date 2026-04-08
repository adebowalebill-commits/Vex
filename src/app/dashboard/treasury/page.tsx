'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import IssueSubsidyModal from '@/components/modals/IssueSubsidyModal'
import AdjustTaxRatesModal from '@/components/modals/AdjustTaxRatesModal'

interface TreasuryData {
    balance: number; taxRevenue: number; subsidiesPaid: number
    salesTaxRate: number; incomeTaxRate: number; propertyTaxRate: number
    currencySymbol: string; isOwner: boolean
    passportRequired: boolean; passportPrice: number
    businessCreationFee: number; maxBusinessesPerCitizen: number
    recentTaxes: Array<{ id: string; amount: number; senderName: string; createdAt: string }>
}
interface World { id: string; name: string }

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
    const [savingControls, setSavingControls] = useState(false)
    const [controlsMsg, setControlsMsg] = useState('')

    useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status, router])
    useEffect(() => { if (session?.user) fetchWorlds() }, [session])
    useEffect(() => { if (selectedWorld) fetchTreasury(selectedWorld) }, [selectedWorld])

    async function fetchWorlds() {
        try {
            const res = await fetch('/api/worlds'); const data = await res.json()
            if (data.success) {
                const allWorlds = [...data.data.owned, ...data.data.member]; setWorlds(allWorlds)
                if (worldIdParam) setSelectedWorld(worldIdParam)
                else if (data.data.owned.length > 0) setSelectedWorld(data.data.owned[0].id)
                else if (allWorlds.length > 0) setSelectedWorld(allWorlds[0].id)
            }
        } catch (error) { console.error('Failed to fetch worlds:', error) }
        finally { setLoading(false) }
    }

    async function fetchTreasury(worldId: string) {
        try {
            const res = await fetch(`/api/worlds/${worldId}/treasury`); const data = await res.json()
            if (data.success) setTreasury(data.data)
        } catch (error) { console.error('Failed to fetch treasury:', error) }
    }

    if (status === 'loading' || loading) {
        return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-primary)' }}><div className="loading-spinner" /></div>
    }

    if (worlds.length === 0) {
        return (
            <DashboardLayout title="Treasury">
                <div className="glass-card p-8" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🏦</div>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No Worlds Yet</h3>
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>Create a world first to access its treasury.</p>
                    <a href="/dashboard/worlds" className="btn btn-primary">Go to Worlds</a>
                </div>
            </DashboardLayout>
        )
    }

    const symbol = treasury?.currencySymbol || '©'

    return (
        <DashboardLayout title="Treasury">
            <div style={{ marginBottom: '24px' }}>
                <select value={selectedWorld} onChange={e => setSelectedWorld(e.target.value)} className="form-select" style={{ maxWidth: '280px' }}>
                    {worlds.map(w => <option key={w.id} value={w.id} style={{ background: 'var(--color-bg-elevated)' }}>{w.name}</option>)}
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[
                    { icon: '🏦', label: 'Balance', value: `${symbol}${treasury?.balance?.toLocaleString() || '0'}`, sub: 'Treasury funds' },
                    { icon: '💰', label: 'Tax Revenue', value: `${symbol}${treasury?.taxRevenue?.toLocaleString() || '0'}`, sub: 'Total collected' },
                    { icon: '📤', label: 'Subsidies Paid', value: `${symbol}${treasury?.subsidiesPaid?.toLocaleString() || '0'}`, sub: 'Total distributed' },
                    { icon: '📊', label: 'Sales Tax Rate', value: `${treasury?.salesTaxRate || 0}%`, sub: 'Current rate' },
                ].map((s, i) => (
                    <div key={i} className="glass-card p-6">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>{s.label}</span>
                            <span style={{ fontSize: '1.25rem' }}>{s.icon}</span>
                        </div>
                        <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-data)', letterSpacing: '-0.02em' }}>{s.value}</div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '6px' }}>{s.sub}</div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-card p-6">
                    <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Recent Tax Collections</h2>
                    {treasury?.recentTaxes && treasury.recentTaxes.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {treasury.recentTaxes.map(tax => (
                                <div key={tax.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--color-card-border)' }}>
                                    <div>
                                        <div style={{ fontWeight: 500 }}>{tax.senderName}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{new Date(tax.createdAt).toLocaleDateString()}</div>
                                    </div>
                                    <div style={{ color: 'var(--color-success)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>+{symbol}{tax.amount.toLocaleString()}</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-muted)' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '12px' }}>📭</div>
                            <p>No tax transactions yet</p>
                        </div>
                    )}
                </div>

                <div className="glass-card p-6">
                    <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Treasury Actions</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <button onClick={() => setShowSubsidyModal(true)} disabled={!treasury?.isOwner} className="glow-border" style={{
                            width: '100%', padding: '14px', background: 'var(--color-accent-light)', borderRadius: 'var(--radius-xl)',
                            textAlign: 'left', opacity: treasury?.isOwner ? 1 : 0.4, cursor: treasury?.isOwner ? 'pointer' : 'not-allowed',
                        }}>
                            <div style={{ fontWeight: 600 }}>💸 Issue Subsidy</div>
                            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>Send funds from treasury to citizens</div>
                        </button>
                        <button onClick={() => setShowTaxModal(true)} disabled={!treasury?.isOwner} className="glow-border" style={{
                            width: '100%', padding: '14px', background: 'var(--color-success-bg)', borderRadius: 'var(--radius-xl)',
                            textAlign: 'left', opacity: treasury?.isOwner ? 1 : 0.4, cursor: treasury?.isOwner ? 'pointer' : 'not-allowed',
                        }}>
                            <div style={{ fontWeight: 600 }}>📈 Adjust Tax Rates</div>
                            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>Modify sales, income, or property tax rates</div>
                        </button>
                        <a href={`/dashboard/transactions?world=${selectedWorld}`} className="glow-border" style={{
                            display: 'block', padding: '14px', background: 'var(--color-warning-bg)', borderRadius: 'var(--radius-xl)',
                            textDecoration: 'none', color: 'inherit',
                        }}>
                            <div style={{ fontWeight: 600 }}>📋 View All Transactions</div>
                            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>See complete transaction history</div>
                        </a>
                    </div>
                    {!treasury?.isOwner && <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginTop: '12px' }}>* Only the world owner can manage the treasury</p>}
                </div>
            </div>

            {/* Economy Controls Section — only visible to world owner */}
            {treasury?.isOwner && (
                <div className="glass-card p-6" style={{ marginTop: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 600 }}>🎛️ Economy Controls</h2>
                        {controlsMsg && <span style={{ fontSize: '13px', color: 'var(--color-success)' }}>{controlsMsg}</span>}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Passport Settings */}
                        <div style={{ padding: '16px', background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-lg)' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '14px' }}>🛂 Passport Settings</h3>
                            
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <div>
                                    <div style={{ fontWeight: 500, fontSize: '14px' }}>Require Passport</div>
                                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Citizens must purchase a passport to participate</div>
                                </div>
                                <button
                                    onClick={() => setTreasury(prev => prev ? { ...prev, passportRequired: !prev.passportRequired } : null)}
                                    style={{
                                        width: '48px', height: '26px', borderRadius: '13px', border: 'none', cursor: 'pointer',
                                        background: treasury.passportRequired ? 'var(--color-accent)' : 'var(--color-card-border)',
                                        position: 'relative', transition: 'background 0.2s',
                                    }}
                                >
                                    <div style={{
                                        width: '20px', height: '20px', borderRadius: '50%', background: 'white',
                                        position: 'absolute', top: '3px',
                                        left: treasury.passportRequired ? '25px' : '3px',
                                        transition: 'left 0.2s',
                                    }} />
                                </button>
                            </div>

                            {treasury.passportRequired && (
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                                        Passport Price ({symbol})
                                    </label>
                                    <input
                                        type="number" min="0" step="1"
                                        value={treasury.passportPrice}
                                        onChange={e => setTreasury(prev => prev ? { ...prev, passportPrice: Number(e.target.value) } : null)}
                                        style={{
                                            width: '100%', padding: '10px 12px', minHeight: '44px',
                                            background: 'var(--color-bg-primary)', border: '1px solid var(--color-card-border)',
                                            borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)',
                                            fontSize: '16px', outline: 'none',
                                        }}
                                    />
                                    <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>Set to 0 for free passports</p>
                                </div>
                            )}
                        </div>

                        {/* Business Permit Settings */}
                        <div style={{ padding: '16px', background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-lg)' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '14px' }}>📋 Business Permits</h3>
                            
                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                                    Permit Price ({symbol})
                                </label>
                                <input
                                    type="number" min="0" step="1"
                                    value={treasury.businessCreationFee}
                                    onChange={e => setTreasury(prev => prev ? { ...prev, businessCreationFee: Number(e.target.value) } : null)}
                                    style={{
                                        width: '100%', padding: '10px 12px', minHeight: '44px',
                                        background: 'var(--color-bg-primary)', border: '1px solid var(--color-card-border)',
                                        borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)',
                                        fontSize: '16px', outline: 'none',
                                    }}
                                />
                                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>Fee to create or expand businesses</p>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                                    Max Businesses (free)
                                </label>
                                <input
                                    type="number" min="1" max="20" step="1"
                                    value={treasury.maxBusinessesPerCitizen}
                                    onChange={e => setTreasury(prev => prev ? { ...prev, maxBusinessesPerCitizen: Number(e.target.value) } : null)}
                                    style={{
                                        width: '100%', padding: '10px 12px', minHeight: '44px',
                                        background: 'var(--color-bg-primary)', border: '1px solid var(--color-card-border)',
                                        borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)',
                                        fontSize: '16px', outline: 'none',
                                    }}
                                />
                                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>Businesses allowed before needing a permit</p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={async () => {
                            setSavingControls(true); setControlsMsg('')
                            try {
                                const res = await fetch(`/api/worlds/${selectedWorld}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        passportRequired: treasury.passportRequired,
                                        passportPrice: treasury.passportPrice,
                                        businessCreationFee: treasury.businessCreationFee,
                                        maxBusinessesPerCitizen: treasury.maxBusinessesPerCitizen,
                                    }),
                                })
                                const data = await res.json()
                                if (data.success) setControlsMsg('✓ Saved!')
                                else setControlsMsg('Failed to save')
                            } catch { setControlsMsg('Error saving') }
                            finally { setSavingControls(false); setTimeout(() => setControlsMsg(''), 3000) }
                        }}
                        disabled={savingControls}
                        className="btn btn-primary"
                        style={{ marginTop: '20px', padding: '12px 32px', opacity: savingControls ? 0.5 : 1 }}
                    >
                        {savingControls ? 'Saving...' : 'Save Economy Settings'}
                    </button>
                </div>
            )}

            {showTaxModal && treasury && (
                <AdjustTaxRatesModal
                    worldId={selectedWorld}
                    currentRates={{ salesTaxRate: treasury.salesTaxRate, incomeTaxRate: treasury.incomeTaxRate, propertyTaxRate: treasury.propertyTaxRate }}
                    onClose={() => setShowTaxModal(false)}
                    onSuccess={(newRates) => { setShowTaxModal(false); setTreasury(prev => prev ? { ...prev, ...newRates } : null) }}
                />
            )}
            {showSubsidyModal && (
                <IssueSubsidyModal worldId={selectedWorld} currencySymbol={symbol} onClose={() => setShowSubsidyModal(false)}
                    onSuccess={() => { setShowSubsidyModal(false); fetchTreasury(selectedWorld) }} />
            )}
        </DashboardLayout>
    )
}

export default function TreasuryPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-primary)' }}><div className="loading-spinner" /></div>}>
            <TreasuryContent />
        </Suspense>
    )
}
