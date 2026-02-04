import { type ClassValue, clsx } from 'clsx'

// Utility for conditionally joining class names
export function cn(...inputs: ClassValue[]) {
    return clsx(inputs)
}

// Format currency with symbol
export function formatCurrency(amount: number, symbol: string = '©'): string {
    return `${symbol}${amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`
}

// Format percentage
export function formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`
}

// Calculate survival status based on needs
export function getSurvivalStatus(food: number, water: number, sleep: number): {
    status: 'healthy' | 'warning' | 'critical'
    message: string
} {
    const lowest = Math.min(food, water, sleep)

    if (lowest >= 50) {
        return { status: 'healthy', message: 'All needs satisfied' }
    } else if (lowest >= 25) {
        return { status: 'warning', message: 'Needs attention soon' }
    } else {
        return { status: 'critical', message: 'Critical condition!' }
    }
}

// Calculate time until next decay
export function getTimeUntilDecay(lastDecayAt: Date, intervalHours: number): string {
    const nextDecay = new Date(lastDecayAt.getTime() + intervalHours * 60 * 60 * 1000)
    const now = new Date()
    const diff = nextDecay.getTime() - now.getTime()

    if (diff <= 0) return 'Now'

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 0) {
        return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
}

// Generate a random color for avatars/icons
export function generateAvatarColor(seed: string): string {
    let hash = 0
    for (let i = 0; i < seed.length; i++) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash)
    }

    const hue = hash % 360
    return `hsl(${hue}, 70%, 50%)`
}

// Truncate text with ellipsis
export function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength - 3) + '...'
}

// Format relative time
export function formatRelativeTime(date: Date): string {
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 7) {
        return date.toLocaleDateString()
    } else if (days > 0) {
        return `${days}d ago`
    } else if (hours > 0) {
        return `${hours}h ago`
    } else if (minutes > 0) {
        return `${minutes}m ago`
    } else {
        return 'Just now'
    }
}
