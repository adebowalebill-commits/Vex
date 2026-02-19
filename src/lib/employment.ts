/**
 * Employment Engine
 * Handles hiring, firing, and payroll processing.
 */

import prisma from '@/lib/prisma'

export interface HireResult {
    success: boolean
    employeeId?: string
    error?: string
}

export interface PayrollResult {
    businessId: string
    businessName: string
    totalPaid: number
    employeesPaid: number
    errors: string[]
}

/**
 * Hire a citizen at a business
 */
export async function hireCitizen(
    businessId: string,
    citizenId: string,
    position: string,
    hourlyWage: number
): Promise<HireResult> {
    try {
        // Verify business exists and is active
        const business = await prisma.business.findUnique({
            where: { id: businessId },
            select: { id: true, isActive: true, worldId: true },
        })

        if (!business || !business.isActive) {
            return { success: false, error: 'Business not found or inactive' }
        }

        // Verify citizen exists and is in the same world
        const citizen = await prisma.citizen.findUnique({
            where: { id: citizenId },
            select: { id: true, worldId: true },
        })

        if (!citizen) {
            return { success: false, error: 'Citizen not found' }
        }

        if (citizen.worldId !== business.worldId) {
            return { success: false, error: 'Citizen and business must be in the same world' }
        }

        // Check if already employed at this business
        const existing = await prisma.employee.findUnique({
            where: { citizenId_businessId: { citizenId, businessId } },
        })

        if (existing) {
            if (existing.isActive) {
                return { success: false, error: 'Citizen is already employed at this business' }
            }
            // Re-hire: reactivate
            await prisma.employee.update({
                where: { id: existing.id },
                data: { isActive: true, position, hourlyWage, hoursWorked: 0 },
            })
            return { success: true, employeeId: existing.id }
        }

        const employee = await prisma.employee.create({
            data: {
                citizenId,
                businessId,
                position,
                hourlyWage,
            },
        })

        return { success: true, employeeId: employee.id }
    } catch (error) {
        console.error('Error hiring citizen:', error)
        return { success: false, error: 'Failed to hire citizen' }
    }
}

/**
 * Fire an employee (deactivate)
 */
export async function fireCitizen(
    employeeId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const employee = await prisma.employee.findUnique({
            where: { id: employeeId },
        })

        if (!employee) {
            return { success: false, error: 'Employee not found' }
        }

        if (!employee.isActive) {
            return { success: false, error: 'Employee is already inactive' }
        }

        await prisma.employee.update({
            where: { id: employeeId },
            data: { isActive: false },
        })

        return { success: true }
    } catch (error) {
        console.error('Error firing citizen:', error)
        return { success: false, error: 'Failed to fire citizen' }
    }
}

/**
 * Process payroll for a business — pay all active employees
 */
export async function processPayroll(
    businessId: string,
    hoursThisCycle: number = 8
): Promise<PayrollResult> {
    const business = await prisma.business.findUnique({
        where: { id: businessId },
        select: { id: true, name: true, walletBalance: true, worldId: true },
    })

    if (!business) {
        return { businessId, businessName: 'Unknown', totalPaid: 0, employeesPaid: 0, errors: ['Business not found'] }
    }

    const employees = await prisma.employee.findMany({
        where: { businessId, isActive: true },
        include: { citizen: true },
    })

    if (employees.length === 0) {
        return { businessId, businessName: business.name, totalPaid: 0, employeesPaid: 0, errors: [] }
    }

    // Calculate total wages
    const totalWages = employees.reduce((sum, emp) => sum + (emp.hourlyWage * hoursThisCycle), 0)

    if (business.walletBalance < totalWages) {
        return {
            businessId,
            businessName: business.name,
            totalPaid: 0,
            employeesPaid: 0,
            errors: [`Insufficient funds: need ${totalWages}, have ${business.walletBalance}`],
        }
    }

    const errors: string[] = []
    let totalPaid = 0
    let employeesPaid = 0

    await prisma.$transaction(async (tx) => {
        // Deduct from business
        await tx.business.update({
            where: { id: businessId },
            data: { walletBalance: { decrement: totalWages } },
        })

        // Pay each employee
        for (const emp of employees) {
            const wage = emp.hourlyWage * hoursThisCycle

            await tx.citizen.update({
                where: { id: emp.citizenId },
                data: { walletBalance: { increment: wage } },
            })

            await tx.employee.update({
                where: { id: emp.id },
                data: { hoursWorked: { increment: hoursThisCycle } },
            })

            // Record transaction
            await tx.transaction.create({
                data: {
                    amount: wage,
                    type: 'SALARY',
                    description: `Salary: ${emp.position} (${hoursThisCycle}h @ ${emp.hourlyWage}/h)`,
                    status: 'COMPLETED',
                    worldId: business.worldId,
                    senderBusinessId: businessId,
                    receiverCitizenId: emp.citizenId,
                },
            })

            totalPaid += wage
            employeesPaid++
        }
    })

    return { businessId, businessName: business.name, totalPaid, employeesPaid, errors }
}

/**
 * Get employees of a business
 */
export async function getEmployees(businessId: string) {
    return prisma.employee.findMany({
        where: { businessId, isActive: true },
        include: {
            citizen: { select: { id: true, displayName: true } },
        },
        orderBy: { hiredAt: 'desc' },
    })
}

/**
 * Get jobs for a citizen (businesses they work at)
 */
export async function getCitizenJobs(citizenId: string) {
    return prisma.employee.findMany({
        where: { citizenId, isActive: true },
        include: {
            business: { select: { id: true, name: true, type: true } },
        },
        orderBy: { hiredAt: 'desc' },
    })
}

/**
 * Process payroll for all active businesses in a world
 */
export async function processWorldPayroll(
    worldId: string,
    hoursThisCycle: number = 8
): Promise<PayrollResult[]> {
    const businesses = await prisma.business.findMany({
        where: { worldId, isActive: true, isOperating: true },
        select: { id: true },
    })

    const results: PayrollResult[] = []
    for (const biz of businesses) {
        results.push(await processPayroll(biz.id, hoursThisCycle))
    }
    return results
}
