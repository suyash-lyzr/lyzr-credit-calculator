"use client";

import * as React from "react";
import { IconLoader2, IconCloud, IconShieldLock, IconInfoCircle, IconCalculator, IconBrain } from "@tabler/icons-react";
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

function formatMicroCurrency(value: number) {
  if (value >= 1) return formatCurrency(value);
  if (value >= 0.01) return `$${value.toFixed(4)}`;
  if (value >= 0.0001) return `$${value.toFixed(6)}`;
  return `$${value.toExponential(2)}`;
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

  const hasLlmSteps = !!data.llm_steps && data.llm_steps.length > 0;
  const llmBufferPct = data.llm_buffer_pct ?? 0;
  const llmPerUnitCost = data.llm_per_unit_cost
    ?? (hasLlmSteps ? data.llm_steps!.reduce((s, r) => s + (r.cost_per_unit ?? 0), 0) : 0);

  return (
    <div className="space-y-5">
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

      {/* ====================================================== */}
      {/* SECTION 1: AGENT RUN CALCULATION                       */}
      {/* ====================================================== */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <IconCalculator className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wide text-primary">
            1. Agent Run Calculation
          </h3>
        </div>

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

        {/* Lyzr cost card */}
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Lyzr Agent Run Cost (Annual)
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
      </section>

      {/* ====================================================== */}
      {/* SECTION 2: LLM ESTIMATION                              */}
      {/* ====================================================== */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <IconBrain className="h-4 w-4 text-foreground/80" />
          <h3 className="text-sm font-bold uppercase tracking-wide text-foreground/80">
            2. LLM Estimation (Pass-through)
          </h3>
        </div>

        <p className="text-xs text-foreground/70">
          Per-step model selection, token estimates, and cost. Billed directly by OpenAI / Anthropic / Google — Lyzr takes <span className="font-semibold">no markup</span>.
        </p>

        {hasLlmSteps ? (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-xs min-w-[920px]">
              <thead>
                <tr className="bg-muted/50">
                  <th className="py-2 px-3 text-left font-semibold">Step / Action</th>
                  <th className="py-2 px-3 text-left font-semibold">Model</th>
                  <th className="py-2 px-3 text-right font-semibold">In tok</th>
                  <th className="py-2 px-3 text-right font-semibold">Out tok</th>
                  <th className="py-2 px-3 text-right font-semibold">Rate $/1M (in/out)</th>
                  <th className="py-2 px-3 text-right font-semibold">Cost / call</th>
                  <th className="py-2 px-3 text-right font-semibold">Calls / unit</th>
                  <th className="py-2 px-3 text-right font-semibold">Annual calls</th>
                  <th className="py-2 px-3 text-right font-semibold">Annual cost</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.llm_steps!.map((row, i) => (
                  <tr key={i}>
                    <td className="py-2 px-3 align-top">
                      <div className="font-medium">{row.step_name}</div>
                      <div className="text-[11px] text-muted-foreground">{row.action}</div>
                    </td>
                    <td className="py-2 px-3 align-top">
                      <div className="font-medium">{row.model_name}</div>
                      <div className="text-[10px] text-muted-foreground">{row.provider}</div>
                      {row.model_rationale && (
                        <div className="text-[10px] text-muted-foreground italic mt-0.5">
                          {row.model_rationale}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-3 font-mono text-right align-top">{formatNumber(row.input_tokens)}</td>
                    <td className="py-2 px-3 font-mono text-right align-top">{formatNumber(row.output_tokens)}</td>
                    <td className="py-2 px-3 font-mono text-right align-top whitespace-nowrap">
                      ${row.input_rate_per_1m.toFixed(2)} / ${row.output_rate_per_1m.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 font-mono text-right align-top">{formatMicroCurrency(row.cost_per_call)}</td>
                    <td className="py-2 px-3 font-mono text-right align-top">{row.runs_per_unit}</td>
                    <td className="py-2 px-3 font-mono text-right align-top">{formatNumber(row.annual_calls)}</td>
                    <td className="py-2 px-3 font-mono text-right align-top font-semibold">{formatCurrency(row.annual_cost)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/40 border-t-2">
                  <td className="py-2 px-3 font-semibold" colSpan={5}>Total LLM cost</td>
                  <td className="py-2 px-3 font-mono text-right font-semibold" colSpan={3}>
                    {llmPerUnitCost > 0 && (
                      <span className="text-foreground/70">
                        {formatMicroCurrency(llmPerUnitCost)} / unit
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 font-mono text-right font-bold text-foreground">
                    {formatCurrency(llmTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed bg-muted/20 px-3 py-4 text-center">
            <p className="text-xs text-muted-foreground">
              Detailed LLM breakdown not available for this estimate.
            </p>
          </div>
        )}

        {hasLlmSteps && llmBufferPct > 0 && (
          <p className="text-xs text-muted-foreground italic">
            Includes a {llmBufferPct}% LLM buffer for retries, self-correction loops, multi-sample generation, and tool-use iterations within an agent run.
          </p>
        )}

        {/* LLM cost card */}
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground/70">
              LLM Pass-through Cost (Annual)
            </p>
            <span className="text-[10px] text-muted-foreground">Provider rates</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(llmTotal)}</p>
          <p className="text-xs text-foreground/70 mt-1">
            Billed directly by OpenAI / Anthropic / Google. No Lyzr markup.
          </p>
        </div>

        {/* Optional per-model rollup */}
        {data.llm_breakdown && data.llm_breakdown.length > 0 && (
          <details className="group">
            <summary className="cursor-pointer text-xs font-semibold text-foreground/70 hover:text-foreground flex items-center gap-1.5">
              <IconInfoCircle className="h-3.5 w-3.5" />
              Per-model rollup
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
      </section>

      {/* ====================================================== */}
      {/* GRAND TOTAL                                            */}
      {/* ====================================================== */}
      <div className="rounded-lg border-2 border-primary bg-primary/10 px-4 py-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Total Annual Cost</p>
          <p className="text-2xl font-bold text-primary">{formatCurrency(grandTotal)}</p>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Lyzr agent runs ({formatCurrency(lyzrTotal)}) + LLM pass-through ({formatCurrency(llmTotal)}).
        </p>
      </div>
    </div>
  );
}
