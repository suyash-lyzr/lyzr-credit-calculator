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

  // The model sometimes returns a plural unit_name ("tickets"), which reads wrong in per-unit
  // phrasing ("12 min per tickets", "$5.72 / tickets"). Singularize defensively.
  const singularize = (s: string) => {
    const w = (s || "unit").trim();
    if (/(ss|us|is)$/i.test(w)) return w; // process, analysis — already singular
    if (/ies$/i.test(w)) return w.replace(/ies$/i, "y"); // queries -> query
    if (/(ch|sh|x|z|s)es$/i.test(w)) return w.replace(/es$/i, ""); // batches -> batch
    if (/s$/i.test(w)) return w.replace(/s$/i, ""); // tickets -> ticket
    return w;
  };

  // "a AP Clerk" -> "an AP Clerk". Uses vowel SOUND, so initialisms like AP/HR/RN (spoken
  // "ay-pee", "aitch-arr") take "an" even though they start with a consonant letter.
  const article = (word: string) => {
    const w = (word || "").trim();
    if (!w) return "a";
    const first = w[0];
    if (/^[AEIOU]$/i.test(first)) return "an";
    // Initialism (2+ leading capitals, e.g. "AP Clerk", "HR Analyst"): go by letter name.
    if (/^[A-Z]{2,}/.test(w) && /^[FHLMNRSX]/.test(first)) return "an";
    return "a";
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

  const unit = singularize(data.unit_name);
  const yearlyVolume = data.volume_estimates.units_per_month * 12;
  const humanYearlyCost = data.human_analysis.cost_per_unit * yearlyVolume;
  // cost_per_unit is the ALL-IN AI tooling cost (Lyzr platform + LLM) per unit.
  const aiToolingYearlyCost = data.ai_analysis.cost_per_unit * yearlyVolume;
  // Split for display: Lyzr platform vs LLM (pass-through to provider when BYO). Falls back
  // gracefully for older artifacts that didn't carry the split.
  const cmp = data.comparison ?? ({} as typeof data.comparison);
  const aiLlmYearlyCost =
    typeof cmp.ai_llm_yearly_cost === "number" ? cmp.ai_llm_yearly_cost : 0;
  const aiLyzrPlatformYearlyCost =
    typeof cmp.ai_platform_yearly_cost === "number"
      ? cmp.ai_platform_yearly_cost
      : Math.max(0, aiToolingYearlyCost - aiLlmYearlyCost);
  const llmIsPassThrough = !!cmp.ai_llm_is_passthrough;

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

  // Total AI-solution cost = Lyzr platform + LLM (pass-through) PLUS any human time retained.
  const aiYearlyCost = aiToolingYearlyCost + residualHumanYearlyCost;
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

  // One consistent "what makes up the AI cost" breakdown, reused in the table and the bottom line.
  const aiCostParts: string[] = [`${formatExact(aiLyzrPlatformYearlyCost)} Lyzr platform`];
  if (aiLlmYearlyCost > 0) {
    aiCostParts.push(
      `${formatExact(aiLlmYearlyCost)} LLM ${llmIsPassThrough ? "paid to provider" : "on Lyzr bill"}`
    );
  }
  if (hasResidualHuman) {
    aiCostParts.push(`${formatExact(residualHumanYearlyCost)} retained human review`);
  }
  const aiCostBreakdown = aiCostParts.join(" + ");

  return (
    <div className="space-y-4">
      {/* Headline numbers first — the story in four tiles, details in the table below */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-lg border-2 border-primary/50 bg-primary/10 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
            Net savings / yr
          </p>
          <p className="mt-0.5 text-xl font-bold text-primary">{formatCurrency(netSavings)}</p>
          <p className="text-[10px] text-muted-foreground">{savingsPercentage}% below manual cost</p>
        </div>
        <div className="rounded-lg border bg-card px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">ROI</p>
          <p className="mt-0.5 text-xl font-bold">
            {typeof data.roi_percentage === "number" ? `${data.roi_percentage}%` : "—"}
          </p>
          <p className="text-[10px] text-muted-foreground">return on AI spend</p>
        </div>
        <div className="rounded-lg border bg-card px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Payback
          </p>
          <p className="mt-0.5 text-xl font-bold">{data.comparison.payback_period_days} days</p>
          <p className="text-[10px] text-muted-foreground">to recover year-1 cost</p>
        </div>
        <div className="rounded-lg border bg-card px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Human time saved
          </p>
          <p className="mt-0.5 text-xl font-bold">{data.comparison.time_savings_percentage}%</p>
          <p className="text-[10px] text-muted-foreground">per {unit}</p>
        </div>
      </div>

      <p className="text-sm text-foreground/80">
        Compared with {article(data.human_analysis.mapped_role)}{" "}
        {data.human_analysis.mapped_role} at{" "}
        <span className="font-medium">{formatRate(data.human_analysis.fully_loaded_rate)}/hr</span>{" "}
        spending <span className="font-medium">{data.human_analysis.time_per_task_minutes} min</span>{" "}
        per {unit}.
        {hasResidualHuman &&
          (isEveryRunReview ? (
            <>
              {" "}Every {unit} still gets a ~{reviewMinutesPerTouch}-min human sign-off —
              that retained time is counted below, so savings aren&apos;t overstated.
            </>
          ) : (
            <>
              {" "}{Math.round(automationRate * 100)}% is handled end-to-end; the remaining{" "}
              {escalatedPct}% still gets ~{reviewMinutesPerTouch} min of human review — counted
              below.
            </>
          ))}
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
              <td className="py-2.5 px-4 font-medium">Time Per {unit}</td>
              <td className="py-2.5 px-4">{data.human_analysis.time_per_task_minutes} Minutes</td>
              <td className="py-2.5 px-4">
                {"< "}{Math.ceil(data.ai_analysis.time_per_task_seconds / 60)} min AI
                {hasResidualHuman ? (
                  <span className="text-muted-foreground">
                    {" "}+ ~
                    {Number.isInteger(residualMinutesPerUnit)
                      ? residualMinutesPerUnit
                      : residualMinutesPerUnit.toFixed(1)}{" "}
                    min review
                  </span>
                ) : (
                  <span className="text-muted-foreground"> (Parallel)</span>
                )}
              </td>
            </tr>
            <tr>
              <td className="py-2.5 px-4 font-medium">Unit Cost</td>
              <td className="py-2.5 px-4">${data.human_analysis.cost_per_unit.toFixed(2)} / {unit}</td>
              <td className="py-2.5 px-4">
                <span className="font-medium">${data.ai_analysis.cost_per_unit.toFixed(2)} / {unit}</span>{" "}
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
                      ? `${reviewMinutesPerTouch} min sign-off / ${unit}`
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
                <span className="text-muted-foreground"> ({aiCostBreakdown})</span>
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
        <span className="font-semibold">The Bottom Line:</span> For a total annual cost of ~{formatExact(aiYearlyCost)}{" "}
        ({aiCostBreakdown}), you bring {data.use_case.toLowerCase()} down from {formatCurrency(humanYearlyCost)} in
        manual labor — a {formatCurrency(netSavings)} ({savingsPercentage}%) saving, with instant scalability and 24/7
        execution.
        {hasResidualHuman &&
          (isEveryRunReview
            ? " The retained human time is a quick sign-off on each run — the AI still does the heavy lifting."
            : " The remaining human time covers the lower-confidence cases the design deliberately escalates.")}
      </p>
      {aiLlmYearlyCost > 0 && llmIsPassThrough && (
        <p className="text-xs text-muted-foreground">
          Note: the {formatExact(aiLlmYearlyCost)} LLM cost is <span className="font-medium">pass-through</span> — paid
          directly to the model provider, not billed by Lyzr. It&apos;s included here so the savings reflect the true
          all-in cost of the solution. Your Lyzr invoice is {formatExact(aiLyzrPlatformYearlyCost)}.
        </p>
      )}
    </div>
  );
}
