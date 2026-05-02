"use client";

import * as React from "react";
import { IconLoader2, IconCloud, IconShieldLock, IconInfoCircle } from "@tabler/icons-react";
import { CreditCalculation as CreditCalculationType } from "@/lib/types";

interface CreditCalculationProps {
  data: CreditCalculationType | null;
  isLoading: boolean;
}

function formatCurrency(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${new Intl.NumberFormat("en-US").format(Math.round(value))}`;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number | string) {
  if (typeof value === "string") return value;
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

export function CreditCalculation({ data, isLoading }: CreditCalculationProps) {
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
          Cost estimate will appear here
        </p>
      </div>
    );
  }

  const hasMultipleRows = data.rows && data.rows.length > 0;
  const isLegacy = data.rate_per_run === undefined || data.rate_per_run === null;
  const isCloud = (data.deployment ?? "cloud") === "cloud";
  const ratePerRun = data.rate_per_run ?? 0.08;

  const lyzrTotal = hasMultipleRows ? (data.combined_lyzr_total ?? 0) : (data.lyzr_annual_cost ?? 0);
  const llmTotal = hasMultipleRows ? (data.combined_llm_total ?? 0) : (data.llm_annual_cost ?? 0);
  const grandTotal = hasMultipleRows
    ? (data.combined_total ?? data.total_annual_cost ?? 0)
    : (data.total_annual_cost ?? 0);

  return (
    <div className="space-y-4">
      {/* Legacy template notice */}
      {isLegacy && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 px-3 py-2">
          <p className="text-xs text-amber-800 dark:text-amber-200">
            <span className="font-semibold">Legacy estimate:</span> this template was saved
            under an older pricing model. Re-run the calculation to see the new agent-run breakdown.
          </p>
        </div>
      )}

      {/* Intro */}
      <p className="text-sm text-foreground/80">
        <span className="font-semibold">Lyzr charges only for agent runs.</span>{" "}
        Knowledge base lookups, tool calls, sub-agent calls, memory, guardrails, and security policies
        are all <span className="font-medium">free inside an agent run</span>. LLM costs are passed
        through separately at provider rates.
      </p>

      {/* Architecture summary */}
      {data.agent_architecture_summary && (
        <div className="bg-muted/30 rounded-lg px-3 py-2">
          <p className="text-sm text-foreground/70">
            <span className="font-medium text-foreground">Architecture:</span>{" "}
            {data.agent_architecture_summary}
          </p>
        </div>
      )}

      {/* Deployment + rate */}
      <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
        {isCloud ? (
          <IconCloud className="h-5 w-5 text-primary flex-shrink-0" />
        ) : (
          <IconShieldLock className="h-5 w-5 text-primary flex-shrink-0" />
        )}
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">
            {isCloud ? "Lyzr Cloud" : "Lyzr VPC / On-Prem"}
          </p>
          <p className="text-xs text-muted-foreground">
            ${ratePerRun.toFixed(2)} per agent run
            {isCloud ? " — fully managed" : " — customer environment, full data sovereignty"}
          </p>
        </div>
      </div>

      {/* Agent runs breakdown per unit */}
      {data.runs_breakdown && data.runs_breakdown.length > 0 && !hasMultipleRows && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-foreground/70 mb-2">
            Agent runs per unit ({data.runs_per_unit} {data.runs_per_unit === 1 ? "run" : "runs"})
          </h4>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="py-2 px-3 text-left font-semibold">Reasoning Step</th>
                  <th className="py-2 px-3 text-left font-semibold">Runs</th>
                  <th className="py-2 px-3 text-left font-semibold">Why</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.runs_breakdown.map((step, i) => (
                  <tr key={i}>
                    <td className="py-2 px-3 font-medium">{step.step_name}</td>
                    <td className="py-2 px-3 font-mono">{step.runs}</td>
                    <td className="py-2 px-3 text-foreground/70 text-xs">{step.reasoning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 italic">
            Includes a {data.iteration_buffer_pct}% iteration buffer for re-runs, revisions, and edge cases.
          </p>
        </div>
      )}

      {/* Multiple workloads table */}
      {hasMultipleRows && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-foreground/70 mb-2">
            Workloads
          </h4>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="py-2 px-3 text-left font-semibold">Workload</th>
                  <th className="py-2 px-3 text-left font-semibold">Volume</th>
                  <th className="py-2 px-3 text-left font-semibold">Runs/Unit</th>
                  <th className="py-2 px-3 text-left font-semibold">Annual Runs</th>
                  <th className="py-2 px-3 text-left font-semibold">Lyzr</th>
                  <th className="py-2 px-3 text-left font-semibold">LLM</th>
                  <th className="py-2 px-3 text-left font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.rows!.map((row, i) => (
                  <tr key={i}>
                    <td className="py-2 px-3 font-medium">{row.workload_name}</td>
                    <td className="py-2 px-3">{formatNumber(row.volume)}</td>
                    <td className="py-2 px-3 font-mono">{row.runs_per_unit}</td>
                    <td className="py-2 px-3">{formatNumber(row.annual_runs)}</td>
                    <td className="py-2 px-3">{formatCurrency(row.lyzr_cost)}</td>
                    <td className="py-2 px-3">{formatCurrency(row.llm_cost)}</td>
                    <td className="py-2 px-3 font-bold text-primary">{formatCurrency(row.total_cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.combined_note && (
            <p className="text-xs text-muted-foreground mt-1.5 italic">{data.combined_note}</p>
          )}
        </div>
      )}

      {/* Cost summary - the two halves */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Lyzr Agent Run Cost */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Lyzr Agent Runs
            </p>
            <span className="text-[10px] text-muted-foreground">Software cost</span>
          </div>
          <p className="text-2xl font-bold text-primary">{formatCurrency(lyzrTotal)}</p>
          <p className="text-xs text-foreground/70 mt-1">
            {hasMultipleRows
              ? `Across all workloads at $${ratePerRun.toFixed(2)}/run`
              : data.total_annual_runs
                ? `${formatNumber(data.total_annual_runs)} runs × $${ratePerRun.toFixed(2)}`
                : `Annual Lyzr cost`}
          </p>
        </div>

        {/* LLM Pass-through Cost */}
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground/70">
              LLM (Pass-through)
            </p>
            <span className="text-[10px] text-muted-foreground">Provider rates</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(llmTotal)}</p>
          <p className="text-xs text-foreground/70 mt-1">
            Billed directly by OpenAI / Anthropic / Google. No Lyzr markup.
          </p>
        </div>
      </div>

      {/* Grand Total */}
      <div className="rounded-lg border-2 border-primary bg-primary/10 px-4 py-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Total Annual Cost</p>
          <p className="text-2xl font-bold text-primary">{formatCurrency(grandTotal)}</p>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Lyzr agent runs + LLM pass-through combined.
        </p>
      </div>

      {/* LLM model breakdown */}
      {data.llm_breakdown && data.llm_breakdown.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-xs font-semibold text-foreground/70 hover:text-foreground flex items-center gap-1.5">
            <IconInfoCircle className="h-3.5 w-3.5" />
            LLM cost breakdown by model
          </summary>
          <div className="mt-2 overflow-hidden rounded-lg border">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50">
                  <th className="py-2 px-3 text-left font-semibold">Model</th>
                  <th className="py-2 px-3 text-left font-semibold">Runs</th>
                  <th className="py-2 px-3 text-left font-semibold">Tokens (in/out)</th>
                  <th className="py-2 px-3 text-left font-semibold">Rate (in/out per 1M)</th>
                  <th className="py-2 px-3 text-left font-semibold">Annual Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.llm_breakdown.map((m, i) => (
                  <tr key={i}>
                    <td className="py-2 px-3">
                      <div className="font-medium">{m.model_name}</div>
                      <div className="text-[10px] text-muted-foreground">{m.provider}</div>
                    </td>
                    <td className="py-2 px-3 font-mono">{formatNumber(m.runs_using_model)}</td>
                    <td className="py-2 px-3 font-mono">
                      {formatNumber(m.avg_input_tokens)} / {formatNumber(m.avg_output_tokens)}
                    </td>
                    <td className="py-2 px-3 font-mono">
                      ${m.input_rate_per_1m.toFixed(2)} / ${m.output_rate_per_1m.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 font-semibold">{formatCurrency(m.annual_cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.llm_note && (
            <p className="text-xs text-muted-foreground mt-1.5 italic">{data.llm_note}</p>
          )}
        </details>
      )}
    </div>
  );
}
