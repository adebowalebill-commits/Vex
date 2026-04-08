/**
 * Economy Treasury API
 * Enhanced treasury management: reports, loans, spending.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireBotAuth } from '@/lib/bot-auth'
import { getTreasuryReport, issueLoan, processLoanPayment, collectPermitFee, collectLandFee } from '@/lib/ledger'

// GET /api/economy/treasury — Full treasury report
export async function GET(request: NextRequest) {
    const authError = requireBotAuth(request)
    if (authError) return authError

    try {
        const { searchParams } = new URL(request.url)
        const worldId = searchParams.get('worldId')

        if (!worldId) {
            return NextResponse.json(
                { success: false, error: 'worldId is required' },
                { status: 400 }
            )
        }

        const report = await getTreasuryReport(worldId)

        if (!report) {
            return NextResponse.json(
                { success: false, error: 'Treasury not found' },
                { status: 404 }
            )
        }

        return NextResponse.json({
            success: true,
            data: report,
        })
    } catch (error) {
        console.error('Error fetching treasury report:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch treasury report' },
            { status: 500 }
        )
    }
}

// POST /api/economy/treasury — Treasury operations (loans, fees, spending)
export async function POST(request: NextRequest) {
    const authError = requireBotAuth(request)
    if (authError) return authError

    try {
        const body = await request.json()
        const { action, worldId, citizenId, amount, ...params } = body

        if (!action || !worldId) {
            return NextResponse.json(
                { success: false, error: 'action and worldId are required' },
                { status: 400 }
            )
        }

        switch (action) {
            case 'issue_loan': {
                if (!citizenId || !amount) {
                    return NextResponse.json(
                        { success: false, error: 'citizenId and amount required for loan' },
                        { status: 400 }
                    )
                }
                const interestRate = params.interestRate ?? 5
                const termMonths = params.termMonths ?? 6
                const result = await issueLoan(worldId, citizenId, amount, interestRate, termMonths)

                if (!result.success) {
                    return NextResponse.json({ success: false, error: result.error }, { status: 400 })
                }

                return NextResponse.json({
                    success: true,
                    data: { loanId: result.loanId },
                    message: `Loan of ${amount} issued at ${interestRate}% for ${termMonths} months`,
                })
            }

            case 'loan_payment': {
                const { loanId } = params
                if (!loanId) {
                    return NextResponse.json(
                        { success: false, error: 'loanId required' },
                        { status: 400 }
                    )
                }
                const result = await processLoanPayment(loanId)

                if (!result.success) {
                    return NextResponse.json({ success: false, error: result.error }, { status: 400 })
                }

                return NextResponse.json({
                    success: true,
                    data: { amountPaid: result.amountPaid },
                    message: `Loan payment of ${result.amountPaid?.toFixed(2)} processed`,
                })
            }

            case 'collect_permit': {
                if (!citizenId || !amount) {
                    return NextResponse.json(
                        { success: false, error: 'citizenId and amount required' },
                        { status: 400 }
                    )
                }
                const result = await collectPermitFee(worldId, citizenId, amount, params.description)

                if (!result.success) {
                    return NextResponse.json({ success: false, error: result.error }, { status: 400 })
                }

                return NextResponse.json({
                    success: true,
                    message: `Permit fee of ${amount} collected`,
                })
            }

            case 'collect_land': {
                if (!citizenId || !amount) {
                    return NextResponse.json(
                        { success: false, error: 'citizenId and amount required' },
                        { status: 400 }
                    )
                }
                const result = await collectLandFee(worldId, citizenId, amount, params.description)

                if (!result.success) {
                    return NextResponse.json({ success: false, error: result.error }, { status: 400 })
                }

                return NextResponse.json({
                    success: true,
                    message: `Land fee of ${amount} collected`,
                })
            }

            default:
                return NextResponse.json(
                    { success: false, error: `Unknown action: ${action}. Valid: issue_loan, loan_payment, collect_permit, collect_land` },
                    { status: 400 }
                )
        }
    } catch (error) {
        console.error('Error processing treasury operation:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to process treasury operation' },
            { status: 500 }
        )
    }
}
