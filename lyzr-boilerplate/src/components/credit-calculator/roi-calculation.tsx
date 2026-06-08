"use client";

import * as React from "react";
import { IconLoader2 } from "@tabler/icons-react";
import { ROICalculation as ROICalculationType } from "@/lib/types";

interface ROICalculationProps {
  data: ROICalculationType | null;
  isLoading: boolean;
}

export function ROICalculation({ data, isLoading }: ROICalculationProps) {
  const formatCurrency = (value: number, decimals: number = 0) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}k`;
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("en-US").format(value);
  };

  // Show whole-dollar rates as "$29", fractional loaded rates as "$28.60" — never round a
  // loaded rate to a different integer than the unit-cost math implies.
  const formatRate = (value: number) =>
    Number.isInteger(value) ? `$${value}` : `$${value.toFixed(2)}`;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <IconLoader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-8 text-center">
        <p className="text-sm text-muted-foreground">
          ROI calculation will appear here
        </p>
      </div>
    );
  }

  const yearlyVolume = data.volume_estimates.units_per_month * 12;
  const humanYearlyCost = data.human_analysis.cost_per_unit * yearlyVolume;
  const aiPlatformYearlyCost = data.ai_analysis.cost_per_unit * yearlyVolume;

  // Residual human cost: if the architecture keeps a human-in-the-loop (approval / review /
  // escalation node), a fraction of units still cost human time. Honest ROI subtracts that from
  // savings instead of pretending 100% of labor is eliminated. Defaults to fully autonomous.
  const automationRate =
    typeof data.ai_analysis.automation_rate === "number"
      ? Math.max(0, Math.min(1, data.ai_analysis.automation_rate))
      : 1;
  const residualMinutesPerUnit =
    typeof data.ai_analysis.residual_human_minutes_per_unit === "number"
      ? Math.max(0, data.ai_analysis.residual_human_minutes_per_unit)
      : 0;
  const hasResidualHuman = automationRate < 1 || residualMinutesPerUnit > 0;
  // Two distinct HITL patterns read very differently to a buyer:
  //  - mandatory approval on EVERY run (automation_rate ~0): not "escalation", a quick sign-off.
  //  - confidence-gated escalation (0 < rate < 1): only a subset reaches a human.
  const isEveryRunReview = hasResidualHuman && automationRate <= 0.001;
  const escalatedPct = Math.round((1 - automationRate) * 100);
  // Per-touched-unit review minutes (residual is amortized across ALL units in the math).
  const reviewMinutesPerTouch =
    1 - automationRate > 0.001
      ? Math.round(residualMinutesPerUnit / (1 - automationRate))
      : Math.round(residualMinutesPerUnit);
  const residualHumanYearlyCost =
    (data.human_analysis.fully_loaded_rate / 60) * residualMinutesPerUnit * yearlyVolume;

  // Total AI-solution cost = Lyzr platform + LLM (cost_per_unit) PLUS any human time retained.
  const aiYearlyCost = aiPlatformYearlyCost + residualHumanYearlyCost;
  const netSavings = humanYearlyCost - aiYearlyCost;
  const savingsPercentage = ((netSavings / humanYearlyCost) * 100).toFixed(1);

  // Exact dollars (with commas, no "k" abbreviation) — used in breakdowns so a tiny platform
  // figure next to a large human figure doesn't both collapse to the same "$8k".
  const formatExact = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <div className="space-y-4">
      <p className="text-sm text-foreground/80">
        <span className="font-semibold">ROI Analysis: AI vs. Human Execution</span>{" "}
        Comparison based on a standard {data.human_analysis.mapped_role} rate of{" "}
        <span className="font-medium">{formatRate(data.human_analysis.fully_loaded_rate)}/hr</span> taking{" "}
        <span className="font-medium">{data.human_analysis.time_per_task_minutes} minutes</span> per {data.unit_name}.
        {hasResidualHuman && (
          isEveryRunReview ? (
            <>
              {" "}The AI does the heavy lifting, but every {data.unit_name} still gets a quick human
              sign-off — about{" "}
              <span className="font-medium">{reviewMinutesPerTouch} min</span> of {data.human_analysis.mapped_role}{" "}
              review each (vs {data.human_analysis.time_per_task_minutes} min done fully by hand). That retained
              review time is included below, so savings aren&apos;t overstated.
            </>
          ) : (
            <>
              {" "}This design keeps a human in the loop, so{" "}
              <span className="font-medium">{Math.round(automationRate * 100)}%</span> of {data.unit_name}s are
              handled end-to-end and the remaining{" "}
              <span className="font-medium">{escalatedPct}%</span> still need ~{reviewMinutesPerTouch} min of human
              review each — that residual labor is included below.
            </>
          )
        )}
      </p>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="py-2.5 px-4 text-left font-semibold">Metric</th>
              <th className="py-2.5 px-4 text-left font-semibold">Human Manual Process</th>
              <th className="py-2.5 px-4 text-left font-semibold">Lyzr Agent Architecture</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr>
              <td className="py-2.5 px-4 font-medium">Time Per {data.unit_name}</td>
              <td className="py-2.5 px-4">{data.human_analysis.time_per_task_minutes} Minutes</td>
              <td className="py-2.5 px-4">
                {"< "}{Math.ceil(data.ai_analysis.time_per_task_seconds / 60)} min AI
                {hasResidualHuman ? (
                  <span className="text-muted-foreground">
                    {" "}+ ~{Math.round(residualMinutesPerUnit)} min review
                  </span>
                ) : (
                  <span className="text-muted-foreground"> (Parallel)</span>
                )}
              </td>
            </tr>
            <tr>
              <td className="py-2.5 px-4 font-medium">Unit Cost</td>
              <td className="py-2.5 px-4">${data.human_analysis.cost_per_unit.toFixed(2)} / {data.unit_name}</td>
              <td className="py-2.5 px-4">
                <span className="font-medium">${data.ai_analysis.cost_per_unit.toFixed(2)} / {data.unit_name}</span>{" "}
                <span className="text-muted-foreground">(Lyzr runs + LLM)</span>
              </td>
            </tr>
            {hasResidualHuman && (
              <tr>
                <td className="py-2.5 px-4 font-medium">Residual Human Review</td>
                <td className="py-2.5 px-4 text-muted-foreground">Included in manual process</td>
                <td className="py-2.5 px-4">
                  {formatExact(residualHumanYearlyCost)}{" "}
                  <span className="text-muted-foreground">
                    ({isEveryRunReview
                      ? `${reviewMinutesPerTouch} min sign-off / ${data.unit_name}`
                      : `${escalatedPct}% escalated`})
                  </span>
                </td>
              </tr>
            )}
            <tr>
              <td className="py-2.5 px-4 font-medium">Total Year 1 Cost</td>
              <td className="py-2.5 px-4">{formatCurrency(humanYearlyCost)}</td>
              <td className="py-2.5 px-4">
                {formatExact(aiYearlyCost)}
                {hasResidualHuman && (
                  <span className="text-muted-foreground">
                    {" "}({formatExact(aiPlatformYearlyCost)} Lyzr + {formatExact(residualHumanYearlyCost)} human)
                  </span>
                )}
              </td>
            </tr>
            <tr className="bg-muted/30">
              <td className="py-2.5 px-4 font-semibold">Net Savings</td>
              <td className="py-2.5 px-4">–</td>
              <td className="py-2.5 px-4 font-semibold text-green-600">
                {formatCurrency(netSavings)} ({savingsPercentage}%)
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-sm">
        <span className="font-semibold">The Bottom Line:</span> For a total annual cost of ~{formatExact(aiYearlyCost)}
        {hasResidualHuman
          ? ` (${formatExact(aiPlatformYearlyCost)} Lyzr + ${formatExact(residualHumanYearlyCost)} retained human review)`
          : " (Lyzr agent runs + LLM pass-through)"}
        , you bring {data.use_case.toLowerCase()} down from {formatCurrency(humanYearlyCost)} in manual labor — a{" "}
        {formatCurrency(netSavings)} ({savingsPercentage}%) saving, with instant scalability and 24/7 execution.
        {hasResidualHuman &&
          (isEveryRunReview
            ? " The retained human time is a quick sign-off on each run — the AI still does the heavy lifting."
            : " The remaining human time covers the lower-confidence cases the design deliberately escalates.")}
      </p>
    </div>
  );
}
