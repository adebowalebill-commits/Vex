/**
 * Structured Audit Logger
 * Logs all creation events and important actions with structured JSON.
 */

export type AuditAction =
    | 'BUSINESS_CREATED'
    | 'BUSINESS_CLOSED'
    | 'CITIZEN_REGISTERED'
    | 'EMPLOYEE_HIRED'
    | 'EMPLOYEE_FIRED'
    | 'PERMIT_PURCHASED'
    | 'INVOICE_CREATED'
    | 'INVOICE_PAID'
    | 'TRANSFER_COMPLETED'
    | 'TAX_COLLECTED'
    | 'SUBSIDY_ISSUED'
    | 'RESOURCE_TRADED'
    | 'CRON_TICK'
    | 'ENFORCEMENT_ACTION'

interface AuditEntry {
    action: AuditAction
    worldId?: string
    actorId?: string       // citizenId or discordId
    targetId?: string      // businessId, employeeId, etc.
    details?: Record<string, unknown>
    timestamp: string
}

const LOG_BUFFER: AuditEntry[] = []
const MAX_BUFFER = 100

/**
 * Log a structured audit event.
 * Prints to console in structured JSON format and buffers for retrieval.
 */
export function audit(
    action: AuditAction,
    meta: {
        worldId?: string
        actorId?: string
        targetId?: string
        details?: Record<string, unknown>
    } = {}
) {
    const entry: AuditEntry = {
        action,
        worldId: meta.worldId,
        actorId: meta.actorId,
        targetId: meta.targetId,
        details: meta.details,
        timestamp: new Date().toISOString(),
    }

    // Structured JSON log (picked up by Vercel log drain / log aggregators)
    console.log(JSON.stringify({ level: 'audit', ...entry }))

    // Buffer for recent log retrieval
    LOG_BUFFER.push(entry)
    if (LOG_BUFFER.length > MAX_BUFFER) LOG_BUFFER.shift()
}

/**
 * Get recent audit log entries.
 */
export function getRecentAuditLogs(limit = 50): AuditEntry[] {
    return LOG_BUFFER.slice(-limit)
}
