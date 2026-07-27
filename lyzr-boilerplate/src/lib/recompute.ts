/**
 * Client-side recompute helpers for Phase-2 live editing. They run the SAME deterministic engine
 * (pricing.ts) the server uses, so an edit in the UI produces identical numbers to a fresh
 * calculation — and ROI always re-syncs to the edited credits.
 */

import {
  computeTotals,
  computeRoiComparison,
  type Deployment,
  type WorkloadInput,
} from "@/lib/pricing";
import type { AgentWorkload, CreditCalculation, ROICalculation } from "@/lib/types";

/** Re-price all workloads for a deployment and return an updated CreditCalculation. */
export function recomputeCredits(
  prev: CreditCalculation,
  workloads: AgentWorkload[],
  deployment: Deployment
): CreditCalculation {
  const totals = computeTotals(workloads as unknown as WorkloadInput[], deployment);
  const merged = workloads.map((w, i) => ({ ...w, ...totals.workloads[i] })) as AgentWorkload[];
  return {
    ...prev,
    deployment,
    workloads: merged,
    total_annual_apc: totals.total_annual_apc,
    apc_rate_per_m: totals.apc_rate_per_m,
    platform_annual_cost: totals.platform_annual_cost,
    llm_annual_cost: totals.llm_annual_cost,
    llm_annual_cost_external: totals.llm_annual_cost_external,
    total_annual_cost: totals.total_annual_cost,
    recommended_tier: totals.recommended_tier,
  };
}

/** Re-derive the ROI from edited credits (volume + AI cost come from the priced design). */
export function recomputeRoiFromCredits(
  roi: ROICalculation,
  credits: CreditCalculation
): ROICalculation {
  const workloads = credits.workloads ?? [];
  const primaryRuns = workloads.reduce(
    (max, w) => Math.max(max, w.runs_per_period ?? 0),
    0
  );
  const unitsPerYear = primaryRuns > 0 ? primaryRuns : roi.volume_estimates.units_per_year;
  // Split AI cost into Lyzr platform vs LLM-to-provider so savings are all-in (BYO LLM included).
  const aiPlatformAnnualCost =
    typeof credits.platform_annual_cost === "number"
      ? credits.platform_annual_cost
      : roi.ai_analysis.cost_per_unit * unitsPerYear;
  const aiLlmAnnualCost =
    typeof credits.llm_annual_cost_external === "number" ? credits.llm_annual_cost_external : 0;
  const aiLlmIsPassThrough =
    (credits.llm_annual_cost ?? 0) === 0 && aiLlmAnnualCost > 0;

  const { comparison, aiCostPerUnit, unitsPerMonth, roiPercentage } = computeRoiComparison({
    unitsPerYear,
    loadedRate: roi.human_analysis.fully_loaded_rate,
    humanCostPerUnit: roi.human_analysis.cost_per_unit,
    humanTimeMinutes: roi.human_analysis.time_per_task_minutes,
    aiPlatformAnnualCost,
    aiLlmAnnualCost,
    aiLlmIsPassThrough,
    aiTimeSeconds: roi.ai_analysis.time_per_task_seconds,
    automationRate: roi.ai_analysis.automation_rate ?? 1,
    residualMinutesPerUnit: roi.ai_analysis.residual_human_minutes_per_unit ?? 0,
  });

  return {
    ...roi,
    ai_analysis: { ...roi.ai_analysis, cost_per_unit: aiCostPerUnit },
    volume_estimates: { units_per_month: unitsPerMonth, units_per_year: unitsPerYear },
    comparison: { ...roi.comparison, ...comparison },
    roi_percentage: roiPercentage,
  };
}
