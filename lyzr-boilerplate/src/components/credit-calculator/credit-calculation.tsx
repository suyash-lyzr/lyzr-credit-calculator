"use client";

import * as React from "react";
import {
  IconLoader2,
  IconCloud,
  IconShieldLock,
  IconCalculator,
  IconUser,
  IconUsersGroup,
  IconSitemap,
  IconMicrophone,
  IconChevronDown,
  IconPencil,
  IconCheck,
} from "@tabler/icons-react";
import {
  CreditCalculation as CreditCalculationType,
  AgentWorkload,
  Complexity,
} from "@/lib/types";
import type { Deployment } from "@/lib/pricing";
import { recomputeCredits } from "@/lib/recompute";

interface CreditCalculationProps {
  data: CreditCalculationType | null;
  isLoading: boolean;
  /** When provided, the calculation becomes editable; edits re-price live and re-sync ROI. */
  onChange?: (next: CreditCalculationType) => void;
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

function formatNumber(value: number | string | undefined) {
  if (value === undefined) return "—";
  if (typeof value === "string") return value;
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

/** Compact APC/token count: 1.40B, 182.0M, 10,800. */
function fmtApc(n: number) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  return formatNumber(Math.round(n));
}

const TIER_META: Record<
  Complexity,
  { label: string; icon: React.ReactNode; className: string }
> = {
  simple: {
    label: "Single Agent",
    icon: <IconUser className="h-3.5 w-3.5" />,
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  intermediate: {
    label: "Manager",
    icon: <IconUsersGroup className="h-3.5 w-3.5" />,
    className: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  },
  complex: {
    label: "Superflow",
    icon: <IconSitemap className="h-3.5 w-3.5" />,
    className: "bg-primary/15 text-primary",
  },
  voice: {
    label: "Voice",
    icon: <IconMicrophone className="h-3.5 w-3.5" />,
    className: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  },
};

function TierBadge({ complexity }: { complexity: Complexity }) {
  const meta = TIER_META[complexity] ?? TIER_META.simple;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.className}`}
    >
      {meta.icon}
      {meta.label}
    </span>
  );
}

const TIER_OPTIONS: { value: Complexity; label: string }[] = [
  { value: "simple", label: "Single Agent" },
  { value: "intermediate", label: "Manager" },
  { value: "complex", label: "Superflow" },
  { value: "voice", label: "Voice" },
];

/** A small labelled number input used in edit mode. */
function NumField({
  label,
  value,
  onCommit,
  min = 0,
  step = 1,
}: {
  label: string;
  value: number;
  onCommit: (n: number) => void;
  min?: number;
  step?: number;
}) {
  const [v, setV] = React.useState(String(value));
  React.useEffect(() => setV(String(value)), [value]);
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <input
        type="number"
        min={min}
        step={step}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => {
          const n = Number(v);
          onCommit(Number.isFinite(n) && n >= min ? n : min);
        }}
        className="w-full rounded border bg-background px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </label>
  );
}

/** Collapsible fine print so assumptions don't crowd the main read. */
function FinePrint({ notes }: { notes?: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="rounded-lg border bg-muted/20">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1.5 px-3 py-2 text-[11px] text-muted-foreground hover:text-foreground"
      >
        <IconChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        Assumptions &amp; fine print
      </button>
      {open && (
        <div className="space-y-1.5 border-t px-3 py-2">
          <p className="text-[11px] text-muted-foreground">
            APC = Agent Processing Credit. 1 APC = 1 token — every token a model reads (input) or
            writes (output) counts, so the same token estimates drive both the platform cost and the
            LLM cost.
          </p>
          {notes && <p className="text-[11px] text-muted-foreground italic">{notes}</p>}
        </div>
      )}
    </div>
  );
}

function WorkloadCard({
  w,
  editing,
  onUpdate,
}: {
  w: AgentWorkload;
  editing?: boolean;
  onUpdate?: (patch: Partial<AgentWorkload>) => void;
}) {
  const [open, setOpen] = React.useState(true);
  const calls = w.llm_calls ?? [];
  const hasCalls = calls.length > 0;

  // Complexity is now just the orchestration classification; it no longer sets a rate.
  const changeTier = (complexity: Complexity) => onUpdate?.({ complexity });

  return (
    <div className="rounded-lg border bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-3 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{w.name}</span>
            <TierBadge complexity={w.complexity} />
            {w.apc_profile_label && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                {w.apc_profile_label}
              </span>
            )}
          </div>
          {w.reasoning && (
            <p className="text-[11px] leading-relaxed text-muted-foreground mt-1">{w.reasoning}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-base font-bold text-primary">{formatCurrency(w.total_cost ?? 0)}</p>
          <p className="text-[10px] text-muted-foreground">per year</p>
        </div>
      </div>

      {/* Edit controls */}
      {editing && (
        <div className="border-t bg-muted/20 px-3 py-2.5 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <label className="flex flex-col gap-0.5">
              <span className="text-[10px] text-muted-foreground">Tier</span>
              <select
                value={w.complexity}
                onChange={(e) => changeTier(e.target.value as Complexity)}
                className="w-full rounded border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {TIER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            <NumField
              label="Runs / year"
              value={w.runs_per_period ?? 0}
              onCommit={(n) => onUpdate?.({ runs_per_period: n })}
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            APCs/run come from the model calls below (Σ input+output tokens). Edit a call&apos;s tokens to change platform cost.
          </p>
          <label className="flex items-center gap-2 text-[11px] text-foreground/70">
            <input
              type="checkbox"
              checked={!!w.byo_model}
              onChange={(e) => onUpdate?.({ byo_model: e.target.checked })}
              className="h-3.5 w-3.5 accent-[var(--color-primary)]"
            />
            Bring your own model (LLM cost $0 on the Lyzr bill)
          </label>
        </div>
      )}

      {/* How this workload's cost is built — scannable stats, with the formula as a caption */}
      <div className="grid grid-cols-4 gap-px border-t bg-border">
        {[
          { label: "Runs / year", value: formatNumber(w.runs_per_period) },
          { label: "APCs per run", value: formatNumber(w.apc_per_run ?? 0) },
          { label: "APCs / year", value: fmtApc(w.annual_apc ?? 0) },
          {
            label: w.byo_model ? "Platform (LLM is BYO)" : "Platform",
            value: formatCurrency(w.platform_cost ?? 0),
            accent: true,
          },
        ].map((s) => (
          <div key={s.label} className="bg-background px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
            <p
              className={`mt-0.5 font-mono text-xs font-semibold ${
                s.accent ? "text-primary" : "text-foreground"
              }`}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>
      <p className="border-t bg-muted/20 px-3 py-1.5 text-[10px] text-muted-foreground">
        runs × APCs per run = APCs / year, billed at the deployment rate. LLM adds{" "}
        <span className="font-mono">
          {formatCurrency(w.byo_model ? w.llm_cost_external ?? 0 : w.llm_cost ?? 0)}
        </span>
        {w.byo_model ? " paid directly to the provider." : " at provider rates."}
      </p>

      {/* LLM call detail */}
      {hasCalls && (
        <div className="border-t">
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex w-full items-center gap-1.5 bg-muted/30 px-3 py-2 text-[11px] font-medium text-muted-foreground hover:text-foreground"
          >
            <IconChevronDown
              className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
            />
            The {calls.length} model call{calls.length > 1 ? "s" : ""} in one run
            {w.byo_model && " (BYO — LLM paid to provider)"}
          </button>
          {open && (
            <div className="divide-y border-t">
              {calls.map((c, i) => (
                <div key={i} className="px-3 py-2.5">
                  {/* Step: what runs — and what it costs */}
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[11px] font-semibold">
                      <span className="mr-1.5 text-muted-foreground">{i + 1}.</span>
                      {c.label ?? "—"}
                    </span>
                    <span className="shrink-0 font-mono text-[11px]">
                      {formatMicroCurrency(c.cost_per_call ?? 0)}
                    </span>
                  </div>
                  {/* Which model — and how many tokens it uses */}
                  <div className="mt-1 flex items-baseline justify-between gap-3 text-[10px] text-muted-foreground">
                    <span className="min-w-0 truncate">
                      {c.node_type && <span className="uppercase tracking-wide">{c.node_type}</span>}
                      {c.node_type && " · "}
                      <span className="text-foreground/80">{c.model}</span>
                      {c.provider && ` · ${c.provider}`}
                    </span>
                    <span className="shrink-0 font-mono">
                      {formatNumber(c.input_tokens)} in / {formatNumber(c.output_tokens)} out
                    </span>
                  </div>
                  {/* What it does, then why this model — separate lines, not a run-on */}
                  {c.purpose && (
                    <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">
                      {c.purpose}
                    </p>
                  )}
                  {c.model_rationale && (
                    <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground/70">
                      <span className="text-muted-foreground/90">Why this model:</span>{" "}
                      {c.model_rationale}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function CreditCalculation({ data, isLoading, onChange }: CreditCalculationProps) {
  const [editing, setEditing] = React.useState(false);
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
        <p className="text-sm text-muted-foreground">Cost estimate will appear here</p>
      </div>
    );
  }

  const isNew = Array.isArray(data.workloads) && data.workloads.length > 0;

  // ----- Legacy template fallback -----
  if (!isNew) {
    const lyzr = data.lyzr_annual_cost ?? data.combined_lyzr_total ?? 0;
    const llm = data.llm_annual_cost ?? data.combined_llm_total ?? 0;
    const total = data.total_annual_cost ?? data.combined_total ?? lyzr + llm;
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 px-3 py-2">
          <p className="text-xs text-amber-800 dark:text-amber-200">
            <span className="font-semibold">Legacy estimate:</span> saved under an older pricing
            model. Re-run the calculation to see the new APC (token-based) breakdown.
          </p>
        </div>
        <div className="rounded-lg border-2 border-primary bg-primary/10 px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Total Annual Cost</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(total)}</p>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Lyzr ({formatCurrency(lyzr)}) + LLM ({formatCurrency(llm)}).
          </p>
        </div>
      </div>
    );
  }

  // ----- New complexity-tier model -----
  const workloads = data.workloads as AgentWorkload[];
  const isCloud = (data.deployment ?? "cloud") === "cloud";
  const dep: Deployment = isCloud ? "cloud" : "vpc";
  const canEdit = !!onChange;

  // Apply an edit: re-price all workloads via the engine and bubble the new credits up.
  const applyWorkloads = (next: AgentWorkload[], deployment: Deployment = dep) => {
    onChange?.(recomputeCredits(data, next, deployment));
  };
  const updateWorkload = (i: number, patch: Partial<AgentWorkload>) => {
    applyWorkloads(workloads.map((w, idx) => (idx === i ? { ...w, ...patch } : w)));
  };
  const setDeployment = (deployment: Deployment) => applyWorkloads(workloads, deployment);
  const platformTotal = data.platform_annual_cost ?? workloads.reduce((s, w) => s + (w.platform_cost ?? 0), 0);
  const llmOnLyzrBill = data.llm_annual_cost ?? workloads.reduce((s, w) => s + (w.llm_cost ?? 0), 0);
  // The LLM cost the customer actually pays the provider (includes BYO pass-through). This is what
  // the "LLM" card should show — $0 there was confusing when it's labeled "pass-through".
  const llmExternal = data.llm_annual_cost_external ?? llmOnLyzrBill;
  const hasByo = workloads.some((w) => w.byo_model);
  // Portion paid DIRECTLY to the provider (BYO), i.e. not on the Lyzr invoice.
  const llmPassThrough = Math.max(0, llmExternal - llmOnLyzrBill);
  const lyzrInvoice = platformTotal + llmOnLyzrBill; // what Lyzr bills
  const allInTotal = platformTotal + llmExternal; // platform + all LLM the customer pays
  const totalApc = data.total_annual_apc ?? workloads.reduce((s, w) => s + (w.annual_apc ?? 0), 0);
  const apcRatePerM = data.apc_rate_per_m ?? (isCloud ? 20 : 5);
  const rec = data.recommended_tier; // strategic flag (plan sizing is an account-level conversation)

  return (
    <div className="space-y-5">
      {/* Intro + edit toggle */}
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-foreground/80">
          <span className="font-semibold">Platform cost is metered in APCs</span>{" "}
          <span className="text-muted-foreground">
            (1 APC = 1 token — the text a model reads and writes)
          </span>
          . LLM cost passes through at provider rates &mdash; no markup.
        </p>
        {canEdit && (
          <button
            onClick={() => setEditing((e) => !e)}
            className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${
              editing
                ? "border-primary bg-primary text-white"
                : "border-border bg-background text-foreground/70 hover:text-foreground"
            }`}
            title="Adjust tiers, volumes, models and deployment — costs and ROI update live"
          >
            {editing ? <IconCheck className="h-3.5 w-3.5" /> : <IconPencil className="h-3.5 w-3.5" />}
            {editing ? "Done" : "Edit"}
          </button>
        )}
      </div>

      {editing && (
        <p className="text-[11px] text-muted-foreground -mt-2">
          Adjust any value below — the platform cost, LLM cost and ROI recompute instantly.
        </p>
      )}

      {/* HEADLINE FIRST — the total, then how it splits. Details follow below. */}
      <section className="space-y-2.5">
        <div className="rounded-lg border-2 border-primary bg-primary/10 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">Total Annual Cost (all-in)</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(allInTotal)}</p>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Platform ({formatCurrency(platformTotal)}) + LLM ({formatCurrency(llmExternal)}).
            {llmPassThrough > 0
              ? ` ${formatCurrency(llmPassThrough)} of LLM is pass-through paid to the provider — your Lyzr invoice is ${formatCurrency(lyzrInvoice)}.`
              : ""}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Lyzr Platform
            </p>
            <p className="text-2xl font-bold text-primary mt-0.5">{formatCurrency(platformTotal)}</p>
            <p className="text-[11px] text-foreground/60 mt-1">
              {fmtApc(totalApc)} tokens (APCs)/yr × ${apcRatePerM} per 1M
            </p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground/70">
              LLM {hasByo ? "(Pass-through)" : "Pass-through"}
            </p>
            <p className="text-2xl font-bold text-foreground mt-0.5">{formatCurrency(llmExternal)}</p>
            <p className="text-[11px] text-foreground/60 mt-1">
              {hasByo
                ? "Paid directly to the model provider (BYO) — $0 on your Lyzr invoice."
                : "Billed at provider rates. No Lyzr markup."}
            </p>
          </div>
        </div>

        {/* Strategic flag only — per sales feedback, no plan recommendation for a single use case
            (customers may run several use cases; plans are sized at the account level). */}
        {rec && rec.strategic && (
          <div className="rounded-lg border border-amber-300/60 bg-amber-50/50 px-4 py-3">
            <p className="text-sm font-semibold text-amber-800">Strategic account — route to leadership</p>
            <p className="mt-1 text-xs text-amber-800/80">
              Estimated usage ({fmtApc(totalApc)} APCs/yr) exceeds the largest standard{" "}
              {isCloud ? "SaaS" : "VPC"} plan. This looks like an Unlimited Credits deal ($500K+),
              which needs leadership sign-off — not a self-serve plan.
            </p>
          </div>
        )}
      </section>

      {/* Deployment — one compact line */}
      <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          {isCloud ? (
            <IconCloud className="h-4 w-4 text-primary flex-shrink-0" />
          ) : (
            <IconShieldLock className="h-4 w-4 text-primary flex-shrink-0" />
          )}
          <p className="text-xs truncate">
            <span className="font-semibold text-foreground">
              {isCloud ? "Lyzr SaaS" : "Customer VPC / On-Prem"}
            </span>
            <span className="text-muted-foreground">
              {" "}
              · {isCloud ? "fully managed" : "your environment"} · ${apcRatePerM} per 1M APCs
            </span>
          </p>
        </div>
        {editing && (
          <div className="flex rounded-md border overflow-hidden text-[11px] font-medium shrink-0">
            <button
              onClick={() => setDeployment("cloud")}
              className={`px-2.5 py-1 ${isCloud ? "bg-primary text-white" : "bg-background text-foreground/70 hover:text-foreground"}`}
            >
              SaaS
            </button>
            <button
              onClick={() => setDeployment("vpc")}
              className={`px-2.5 py-1 border-l ${!isCloud ? "bg-primary text-white" : "bg-background text-foreground/70 hover:text-foreground"}`}
            >
              VPC / On-Prem
            </button>
          </div>
        )}
      </div>

      {/* (The architecture summary is intentionally NOT repeated here — the Agent Architecture
          section directly above already states it.) */}

      {/* Workloads */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <IconCalculator className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wide text-primary">
            Workloads &amp; Platform Cost
          </h3>
        </div>
        <div className="space-y-2.5">
          {workloads.map((w, i) => (
            <WorkloadCard
              key={i}
              w={w}
              editing={editing}
              onUpdate={(patch) => updateWorkload(i, patch)}
            />
          ))}
        </div>
      </section>

      <FinePrint notes={data.notes} />
    </div>
  );
}
