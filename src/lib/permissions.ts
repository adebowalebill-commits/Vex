/**
 * Role Permissions System
 * Enforces role-based access control across VexiumVerse API routes.
 *
 * Roles (hierarchy):
 *   PROTOCOL_ADMIN > WORLD_OWNER > MAYOR > BUSINESS_OWNER > CITIZEN
 *
 * Per PRD Section 6:
 * - Server Owner: set taxes, manage treasury, appoint mayors
 * - Mayor: control land, set permits, manage regional resources
 * - Business Owner: operate production, manage payroll
 * - Citizen: maintain needs, earn income, spend currency
 */

import prisma from './prisma'
import { NextResponse } from 'next/server'

// ============================================
// TYPES
// ============================================

export type UserRole =
    | 'PROTOCOL_ADMIN'
    | 'WORLD_OWNER'
    | 'MAYOR'
    | 'BUSINESS_OWNER'
    | 'CITIZEN'
    | 'NONE'

export type Action =
    // World-level governance (WORLD_OWNER)
    | 'SET_TAX_RATES'
    | 'MANAGE_TREASURY'
    | 'ISSUE_SUBSIDY'
    | 'ISSUE_LOAN'
    | 'APPOINT_MAYOR'

    // Regional governance (MAYOR)
    | 'SET_PERMIT_PRICES'
    | 'SET_LAND_PRICES'
    | 'MANAGE_REGION_RESOURCES'
    | 'MANAGE_REGION'

    // Business operations (BUSINESS_OWNER)
    | 'OPERATE_BUSINESS'
    | 'MANAGE_PAYROLL'
    | 'MANAGE_INVENTORY'

    // Citizen actions (CITIZEN)
    | 'VIEW_BALANCE'
    | 'TRANSACT'
    | 'PURCHASE_NEEDS'
    | 'APPLY_FOR_JOB'
    | 'VIEW_DASHBOARD'

// ============================================
// ROLE HIERARCHY
// ============================================

const ROLE_HIERARCHY: Record<UserRole, number> = {
    PROTOCOL_ADMIN: 100,
    WORLD_OWNER: 80,
    MAYOR: 60,
    BUSINESS_OWNER: 40,
    CITIZEN: 20,
    NONE: 0,
}

// ============================================
// PERMISSION MATRIX
// Maps each action to the minimum role required.
// Higher roles automatically inherit permissions.
// ============================================

const PERMISSION_MATRIX: Record<Action, UserRole> = {
    // World Owner
    SET_TAX_RATES: 'WORLD_OWNER',
    MANAGE_TREASURY: 'WORLD_OWNER',
    ISSUE_SUBSIDY: 'WORLD_OWNER',
    ISSUE_LOAN: 'WORLD_OWNER',
    APPOINT_MAYOR: 'WORLD_OWNER',

    // Mayor
    SET_PERMIT_PRICES: 'MAYOR',
    SET_LAND_PRICES: 'MAYOR',
    MANAGE_REGION_RESOURCES: 'MAYOR',
    MANAGE_REGION: 'MAYOR',

    // Business Owner
    OPERATE_BUSINESS: 'BUSINESS_OWNER',
    MANAGE_PAYROLL: 'BUSINESS_OWNER',
    MANAGE_INVENTORY: 'BUSINESS_OWNER',

    // Citizen
    VIEW_BALANCE: 'CITIZEN',
    TRANSACT: 'CITIZEN',
    PURCHASE_NEEDS: 'CITIZEN',
    APPLY_FOR_JOB: 'CITIZEN',
    VIEW_DASHBOARD: 'CITIZEN',
}

// ============================================
// ROLE RESOLUTION
// ============================================

/**
 * Determine a user's highest role in a world.
 * Checks ownership, mayoral positions, and business ownership.
 */
export async function getUserRole(userId: string, worldId: string): Promise<UserRole> {
    // Check if world owner
    const world = await prisma.world.findUnique({
        where: { id: worldId },
        select: { ownerId: true },
    })

    if (!world) return 'NONE'
    if (world.ownerId === userId) return 'WORLD_OWNER'

    // Get citizen record
    const citizen = await prisma.citizen.findFirst({
        where: { userId, worldId },
        select: {
            id: true,
            mayorOfRegions: { select: { id: true }, take: 1 },
            ownedBusinesses: { select: { id: true }, where: { isActive: true }, take: 1 },
        },
    })

    if (!citizen) return 'NONE'

    // Check if mayor
    if (citizen.mayorOfRegions.length > 0) return 'MAYOR'

    // Check if business owner
    if (citizen.ownedBusinesses.length > 0) return 'BUSINESS_OWNER'

    // Default: citizen
    return 'CITIZEN'
}

/**
 * Determine a citizen's role (when we already have the citizen ID).
 */
export async function getCitizenRole(citizenId: string, worldId: string): Promise<UserRole> {
    const citizen = await prisma.citizen.findUnique({
        where: { id: citizenId },
        select: {
            userId: true,
            mayorOfRegions: { select: { id: true }, take: 1 },
            ownedBusinesses: { select: { id: true }, where: { isActive: true }, take: 1 },
        },
    })

    if (!citizen) return 'NONE'

    // Check world ownership
    const world = await prisma.world.findUnique({
        where: { id: worldId },
        select: { ownerId: true },
    })

    if (world?.ownerId === citizen.userId) return 'WORLD_OWNER'
    if (citizen.mayorOfRegions.length > 0) return 'MAYOR'
    if (citizen.ownedBusinesses.length > 0) return 'BUSINESS_OWNER'

    return 'CITIZEN'
}

// ============================================
// PERMISSION CHECKING
// ============================================

/**
 * Check if a user has permission to perform an action in a world.
 */
export async function checkPermission(
    userId: string,
    worldId: string,
    action: Action
): Promise<boolean> {
    const userRole = await getUserRole(userId, worldId)
    const requiredRole = PERMISSION_MATRIX[action]

    if (!requiredRole) return false

    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole]
}

/**
 * Require permission — returns a NextResponse error if unauthorized.
 * Use in API route handlers: `const error = await requirePermission(...); if (error) return error;`
 */
export async function requirePermission(
    userId: string,
    worldId: string,
    action: Action
): Promise<NextResponse | null> {
    const hasPermission = await checkPermission(userId, worldId, action)

    if (!hasPermission) {
        const userRole = await getUserRole(userId, worldId)
        const requiredRole = PERMISSION_MATRIX[action]

        return NextResponse.json(
            {
                success: false,
                error: 'Insufficient permissions',
                details: {
                    action,
                    yourRole: userRole,
                    requiredRole,
                },
            },
            { status: 403 }
        )
    }

    return null // No error — permission granted
}

/**
 * Get a summary of a user's permissions in a world.
 * Useful for UI to show/hide action buttons.
 */
export async function getUserPermissions(
    userId: string,
    worldId: string
): Promise<{ role: UserRole; permissions: Action[] }> {
    const role = await getUserRole(userId, worldId)

    const permissions: Action[] = []
    for (const [action, requiredRole] of Object.entries(PERMISSION_MATRIX) as [Action, UserRole][]) {
        if (ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[requiredRole]) {
            permissions.push(action)
        }
    }

    return { role, permissions }
}

/**
 * Get human-readable role label.
 */
export function getRoleLabel(role: UserRole): string {
    switch (role) {
        case 'PROTOCOL_ADMIN': return 'Protocol Admin'
        case 'WORLD_OWNER': return 'Server Owner'
        case 'MAYOR': return 'Mayor'
        case 'BUSINESS_OWNER': return 'Business Owner'
        case 'CITIZEN': return 'Citizen'
        case 'NONE': return 'None'
    }
}
