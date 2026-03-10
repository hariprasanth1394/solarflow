import { queryFinancialSummary } from "../repositories/analyticsRepository"
import { getOrSetQueryCache } from "../lib/queryCache"
import { elapsedMs, logError, logInfo, startTimer } from "../utils/logger"
import { withRequestContext } from "../utils/withRequestContext"

const FINANCIAL_ANALYTICS_CACHE_TTL_MS = 20_000

export async function getFinancialAnalytics() {
  const startedAt = startTimer()
  return withRequestContext(async ({ organizationId, userId }) => {
    try {
      const [salesRes, installsRes, monthlyRes, capacityRes, pipelineRes] = await getOrSetQueryCache(
        `analytics:financial:${organizationId}`,
        FINANCIAL_ANALYTICS_CACHE_TTL_MS,
        () => queryFinancialSummary(organizationId)
      )

      const salesRows = (salesRes.data ?? []) as Array<{ amount?: number }>
      const monthlyRows = (monthlyRes.data ?? []) as Array<{ month?: string; amount?: number; cost?: number }>
      const capacityRows = (capacityRes.data ?? []) as Array<{ capacity_kw?: number }>
      const pipelineRows = (pipelineRes.data ?? []) as Array<{ status?: string }>

      const totalSales = salesRows.reduce((sum, row) => sum + (row.amount ?? 0), 0)
      const monthlyRevenue = monthlyRows.reduce((acc: Record<string, number>, row) => {
        const key = row.month ?? "Unknown"
        acc[key] = (acc[key] ?? 0) + (row.amount ?? 0)
        return acc
      }, {})

      const totalCost = monthlyRows.reduce((sum, row) => sum + (row.cost ?? 0), 0)
      const profitMargin = totalSales > 0 ? ((totalSales - totalCost) / totalSales) * 100 : 0
      const capacityInstalled = capacityRows.reduce((sum, row) => sum + (row.capacity_kw ?? 0), 0)

      const conversion = pipelineRows.reduce((acc: Record<string, number>, row) => {
        const key = row.status ?? "Unknown"
        acc[key] = (acc[key] ?? 0) + 1
        return acc
      }, {})

      const data = {
        totalSales,
        totalInstallations: installsRes.count ?? 0,
        monthlyRevenue,
        profitMargin: Number(profitMargin.toFixed(2)),
        capacityInstalled,
        pipelineConversion: conversion,
        installationCompletionRate: installsRes.count ?? 0
      }

      logInfo("Financial analytics computed", {
        service: "analyticsService",
        organizationId,
        userId,
        durationMs: elapsedMs(startedAt),
        totalSales,
        totalInstallations: installsRes.count ?? 0
      })

      return {
        data,
        error: salesRes.error || installsRes.error || monthlyRes.error || capacityRes.error || pipelineRes.error
      }
    } catch (error) {
      logError("Financial analytics failed", error, {
        service: "analyticsService",
        organizationId,
        userId,
        durationMs: elapsedMs(startedAt)
      })
      throw new Error("Operation failed")
    }
  })
}
