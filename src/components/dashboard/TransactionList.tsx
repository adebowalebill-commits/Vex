import { formatCurrency, formatRelativeTime } from '@/lib/utils'

interface Transaction {
    id: string
    type: string
    amount: number
    description?: string
    createdAt: Date
    sender?: string
    receiver?: string
}

interface TransactionListProps {
    transactions: Transaction[]
    currencySymbol?: string
    emptyMessage?: string
}

export default function TransactionList({
    transactions,
    currencySymbol = '©',
    emptyMessage = 'No transactions yet'
}: TransactionListProps) {
    if (transactions.length === 0) {
        return (
            <div className="empty-state">
                <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <polyline points="17 1 21 5 17 9" />
                    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                    <polyline points="7 23 3 19 7 15" />
                    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
                <p className="empty-state-description">{emptyMessage}</p>
            </div>
        )
    }

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'TRANSFER':
            case 'PAYMENT':
                return 'var(--color-info)'
            case 'TAX':
                return 'var(--color-warning)'
            case 'SALARY':
                return 'var(--color-success)'
            case 'LOAN_DISBURSEMENT':
            case 'LOAN_REPAYMENT':
                return 'var(--color-accent-secondary)'
            default:
                return 'var(--color-text-secondary)'
        }
    }

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'TRANSFER':
                return (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="17 1 21 5 17 9" />
                        <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                        <polyline points="7 23 3 19 7 15" />
                        <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                    </svg>
                )
            case 'PAYMENT':
                return (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="1" y="4" width="22" height="16" rx="2" />
                        <line x1="1" y1="10" x2="23" y2="10" />
                    </svg>
                )
            case 'TAX':
                return (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 3h18v18H3V3z" />
                        <path d="M3 9h18" />
                        <path d="M9 21V9" />
                    </svg>
                )
            case 'SALARY':
                return (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="1" x2="12" y2="23" />
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                )
            default:
                return (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                )
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {transactions.map((tx) => (
                <div
                    key={tx.id}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-md)',
                        padding: 'var(--space-md)',
                        background: 'var(--color-glass)',
                        borderRadius: 'var(--radius-lg)',
                        transition: 'background var(--transition-fast)',
                    }}
                    className="transaction-item"
                >
                    <div
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: 'var(--radius-md)',
                            background: `${getTypeColor(tx.type)}20`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: getTypeColor(tx.type),
                            flexShrink: 0,
                        }}
                    >
                        <svg width="18" height="18">
                            {getTypeIcon(tx.type)}
                        </svg>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                            fontSize: 'var(--text-sm)',
                            fontWeight: 500,
                            marginBottom: 'var(--space-xs)',
                        }}>
                            {tx.description || tx.type.replace('_', ' ')}
                        </div>
                        <div style={{
                            fontSize: 'var(--text-xs)',
                            color: 'var(--color-text-muted)',
                        }}>
                            {tx.sender && tx.receiver && `${tx.sender} → ${tx.receiver}`}
                        </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                        <div style={{
                            fontSize: 'var(--text-sm)',
                            fontWeight: 600,
                            color: tx.amount >= 0 ? 'var(--color-success)' : 'var(--color-error)',
                        }}>
                            {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount, currencySymbol)}
                        </div>
                        <div style={{
                            fontSize: 'var(--text-xs)',
                            color: 'var(--color-text-muted)',
                        }}>
                            {formatRelativeTime(new Date(tx.createdAt))}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
