"use client";

import * as React from "react";
import Link from "next/link";
import {
  IconArrowLeft,
  IconCoins,
  IconRefresh,
  IconStack2,
  IconReceipt2,
  IconSitemap,
  IconCpu,
  IconCalculator,
  IconChartBar,
  IconUser,
  IconUsersGroup,
  IconMicrophone,
  IconChevronDown,
} from "@tabler/icons-react";
import {
  SIMPLE_RATE,
  MANAGER_BANDS,
  SUPERFLOW_BANDS,
  SUPERFLOW_BASE_OVER_30,
  SUPERFLOW_PER_NODE_OVER_30,
  VOICE_RATE_PER_MIN,
  MODEL_RATES,
  type ModelRate,
} from "@/lib/pricing";

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
const money = (n: number) => `$${n.toFixed(2)}`;

const SECTIONS = [
  { id: "overview", label: "Overview", icon: IconCoins },
  { id: "runs", label: "Agent Runs", icon: IconRefresh },
  { id: "complexity", label: "Complexity Tiers", icon: IconStack2 },
  { id: "rates", label: "Rate Card · SaaS & VPC", icon: IconReceipt2 },
  { id: "orchestration", label: "Choosing Orchestration", icon: IconSitemap },
  { id: "models", label: "Model Selection & LLM Rates", icon: IconCpu },
  { id: "calculation", label: "How the Total Is Calculated", icon: IconCalculator },
  { id: "roi", label: "ROI Analysis", icon: IconChartBar },
];

function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "saas" | "vpc" }) {
  const cls =
    tone === "saas"
      ? "bg-primary/10 text-primary"
      : tone === "vpc"
        ? "bg-emerald-100 text-emerald-700"
        : "bg-muted text-muted-foreground";
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{children}</span>;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border bg-card p-5 ${className}`}>{children}</div>;
}

function RatesDisclosure({ provider, models }: { provider: string; models: { name: string; r: ModelRate }[] }) {
  const [open, setOpen] = React.useState(false);
  return (
    <Card className="p-0 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-muted/40 transition-colors"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold">
          {provider}{" "}
          <span className="font-normal text-muted-foreground">· {models.length} models</span>
        </span>
        <IconChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <table className="w-full text-sm border-t">
          <tbody className="divide-y">
            {models.map(({ name, r }) => (
              <tr key={name}>
                <td className="px-4 py-2 font-mono text-[12px]">{name}</td>
                <td className="px-4 py-2 text-right font-mono text-muted-foreground">
                  ${r.input} / ${r.output}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function H({ id, eyebrow, title, sub }: { id: string; eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="mb-4" id={id} style={{ scrollMarginTop: 24 }}>
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">{eyebrow}</p>
      <h2 className="mt-1 text-2xl font-bold tracking-tight">{title}</h2>
      {sub && <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">{sub}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// page
// ---------------------------------------------------------------------------
export default function PricingExplainerPage() {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [active, setActive] = React.useState<string>("overview");

  React.useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { root, rootMargin: "0px 0px -70% 0px", threshold: 0 }
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const go = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Group LLM models by provider for the rate table.
  const byProvider = React.useMemo(() => {
    const map: Record<string, { name: string; r: ModelRate }[]> = {};
    Object.entries(MODEL_RATES).forEach(([name, r]) => {
      (map[r.provider] ??= []).push({ name, r });
    });
    Object.values(map).forEach((list) => list.sort((a, b) => a.r.input - b.r.input));
    const order = ["OpenAI", "Anthropic", "Google", "Amazon Bedrock", "Groq", "Perplexity", "xAI"];
    return Object.entries(map).sort(
      (a, b) => (order.indexOf(a[0]) + 99) % 100 - ((order.indexOf(b[0]) + 99) % 100)
    );
  }, []);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background text-foreground">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b px-6 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/credit-calculator"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <IconArrowLeft className="h-4 w-4" /> Back to Calculator
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-serif text-lg font-bold tracking-tight">How Lyzr Pricing Works</span>
        </div>
        <div className="w-[140px]" />
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar nav */}
        <nav className="hidden w-72 shrink-0 border-r p-4 md:block">
          <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            On this page
          </p>
          <ul className="space-y-0.5">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const isActive = active === s.id;
              return (
                <li key={s.id}>
                  <button
                    onClick={() => go(s.id)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      isActive
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 flex-1">{s.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-6 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <p className="text-xs font-semibold text-primary">No black box</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Every rate and rule shown is exactly what the calculator uses behind the scenes.
            </p>
          </div>
        </nav>

        {/* Content */}
        <main ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl px-10 py-8 space-y-14">
            {/* OVERVIEW */}
            <section>
              <H
                id="overview"
                eyebrow="The model in one line"
                title="Total Cost = Lyzr Platform + LLM"
                sub="Two numbers, computed independently. The platform fee is what Lyzr bills; the LLM fee is the model provider's public rate passed straight through — with no markup."
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Card>
                  <div className="flex items-center gap-2 text-primary">
                    <IconCoins className="h-5 w-5" />
                    <h3 className="font-semibold">Lyzr Platform Cost</h3>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Depends on exactly two things: the number of <strong className="text-foreground">agent runs</strong>{" "}
                    and the <strong className="text-foreground">complexity</strong> of the agent doing the work.
                  </p>
                  <div className="mt-3 rounded-lg bg-muted/50 px-3 py-2 font-mono text-xs">
                    Σ (price-per-run × runs)
                  </div>
                </Card>
                <Card>
                  <div className="flex items-center gap-2 text-primary">
                    <IconCpu className="h-5 w-5" />
                    <h3 className="font-semibold">LLM Cost</h3>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    The model-provider cost at the public rate, <strong className="text-foreground">no markup</strong>.
                    It is <strong className="text-foreground">$0 on the Lyzr bill</strong> if you bring your own model.
                  </p>
                  <div className="mt-3 rounded-lg bg-muted/50 px-3 py-2 font-mono text-xs">
                    Σ (tokens × provider rate)
                  </div>
                </Card>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Features like Knowledge Base, tools, memory, data query and guardrails run{" "}
                <em>inside</em> a run — they are never billed separately and never change the tier.
              </p>
            </section>

            {/* RUNS */}
            <section>
              <H
                id="runs"
                eyebrow="The first pricing axis"
                title="What counts as an agent run"
                sub="A run = one execution request — one invocation/trigger of a workload — no matter how much happens inside it. You're billed for the unit of work delivered, not the machinery used."
              />
              <Card className="overflow-hidden p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 text-left">
                      <th className="px-4 py-2.5 font-semibold">Situation</th>
                      <th className="px-4 py-2.5 font-semibold w-32">Runs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {[
                      ["A single agent answers once", "1 run"],
                      ["One user chat message", "1 run (10-msg chat = 10 runs)"],
                      ["A manager that calls 5 sub-agents for one request", "1 run"],
                      ["A Superflow with 12 nodes executed once", "1 run"],
                      ["A scheduled flow firing daily for 30 days", "30 runs"],
                      ["A Superflow that pauses days for approval, then resumes", "1 run"],
                    ].map(([a, b]) => (
                      <tr key={a}>
                        <td className="px-4 py-2.5">{a}</td>
                        <td className="px-4 py-2.5 font-medium">{b}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </section>

            {/* COMPLEXITY */}
            <section>
              <H
                id="complexity"
                eyebrow="The second pricing axis"
                title="Complexity — four tiers"
                sub="Complexity sets the price of each run, mapped to how the work is built. Manager and Superflow are further banded by how much actually executes at runtime."
              />
              <div className="space-y-3">
                {[
                  {
                    icon: IconUser,
                    name: "Simple — Single Agent",
                    desc: "One agent handles one task end-to-end (with KB, tools, memory, voice or a schedule — none of which change the tier).",
                    measure: "Flat per run",
                  },
                  {
                    icon: IconUsersGroup,
                    name: "Intermediate — Manager",
                    desc: "A manager coordinates several specialist sub-agents and synthesizes their answers. Pure reasoning, no special workflow nodes.",
                    measure: "Banded by sub-agents executed",
                  },
                  {
                    icon: IconSitemap,
                    name: "Complex — Superflow",
                    desc: "A defined multi-step workflow with special nodes (approvals, branching/loops, integrations). The superset — it can contain agents and a manager.",
                    measure: "Banded by nodes executed",
                  },
                  {
                    icon: IconMicrophone,
                    name: "Voice",
                    desc: "A spoken (inbound/outbound) interaction. Enabled on the agent that handles the call.",
                    measure: "Per minute",
                  },
                ].map((t) => {
                  const Icon = t.icon;
                  return (
                    <Card key={t.name} className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">{t.name}</h3>
                          <Pill>{t.measure}</Pill>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{t.desc}</p>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>

            {/* RATES */}
            <section>
              <H
                id="rates"
                eyebrow="Default rate card"
                title="Platform rates — SaaS vs VPC / On-Prem"
                sub="Two deployments. SaaS is fully Lyzr-managed. Customer VPC and On-Prem run in your environment and share the same (lower) rate card."
              />
              <div className="mb-3 flex gap-2">
                <Pill tone="saas">SaaS = Lyzr-managed</Pill>
                <Pill tone="vpc">VPC / On-Prem = your environment</Pill>
              </div>
              <Card className="overflow-x-auto p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 text-left">
                      <th className="px-4 py-2.5 font-semibold">Tier</th>
                      <th className="px-4 py-2.5 font-semibold">Runtime measure</th>
                      <th className="px-4 py-2.5 font-semibold text-right">SaaS</th>
                      <th className="px-4 py-2.5 font-semibold text-right">VPC / On-Prem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="px-4 py-2.5 font-medium">Simple · Single Agent</td>
                      <td className="px-4 py-2.5 text-muted-foreground">flat / run</td>
                      <td className="px-4 py-2.5 text-right font-mono">{money(SIMPLE_RATE.cloud)}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{money(SIMPLE_RATE.vpc)}</td>
                    </tr>
                    {MANAGER_BANDS.map((b, i) => (
                      <tr key={b.label}>
                        <td className="px-4 py-2.5 font-medium">{i === 0 ? "Intermediate · Manager" : ""}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{b.label}</td>
                        <td className="px-4 py-2.5 text-right font-mono">{money(b.cloud)}</td>
                        <td className="px-4 py-2.5 text-right font-mono">{money(b.vpc)}</td>
                      </tr>
                    ))}
                    {SUPERFLOW_BANDS.map((b, i) => (
                      <tr key={b.label}>
                        <td className="px-4 py-2.5 font-medium">{i === 0 ? "Complex · Superflow" : ""}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{b.label}</td>
                        <td className="px-4 py-2.5 text-right font-mono">{money(b.cloud)}</td>
                        <td className="px-4 py-2.5 text-right font-mono">{money(b.vpc)}</td>
                      </tr>
                    ))}
                    <tr>
                      <td className="px-4 py-2.5 font-medium"></td>
                      <td className="px-4 py-2.5 text-muted-foreground">&gt; 30 nodes</td>
                      <td className="px-4 py-2.5 text-right font-mono">
                        {money(SUPERFLOW_BASE_OVER_30.cloud)} + {money(SUPERFLOW_PER_NODE_OVER_30.cloud)}/extra
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono">
                        {money(SUPERFLOW_BASE_OVER_30.vpc)} + {money(SUPERFLOW_PER_NODE_OVER_30.vpc)}/extra
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 font-medium">Voice</td>
                      <td className="px-4 py-2.5 text-muted-foreground">per minute</td>
                      <td className="px-4 py-2.5 text-right font-mono">{money(VOICE_RATE_PER_MIN.cloud)}/min</td>
                      <td className="px-4 py-2.5 text-right font-mono">{money(VOICE_RATE_PER_MIN.vpc)}/min</td>
                    </tr>
                  </tbody>
                </table>
              </Card>
              <p className="mt-3 text-xs text-muted-foreground">
                <strong>&gt;30 nodes</strong> = the 21–30 base price plus a per-node increment beyond 30 (e.g. 50 nodes
                on-prem = {money(SUPERFLOW_BASE_OVER_30.vpc)} + 20 × {money(SUPERFLOW_PER_NODE_OVER_30.vpc)} = $0.74).
                Nested Superflows are each priced on their own node count and summed. A Manager running <em>inside</em> a
                Superflow counts purely as nodes — no separate manager charge.
              </p>
            </section>

            {/* ORCHESTRATION */}
            <section>
              <H
                id="orchestration"
                eyebrow="The heart of the estimate"
                title="How we choose the orchestration"
                sub="The pattern we choose sets the price — so we design the solution you'd actually build, then pick the simplest one that does the job well. Most real apps are a mix of patterns."
              />
              <Card className="bg-muted/30">
                <h4 className="text-sm font-semibold">How we approach it</h4>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  We design the complete solution you&apos;d actually run in production — not a stripped-down version, and
                  not an over-engineered one. That means including the supporting steps a real build needs (pulling in
                  knowledge, checking quality, sending tricky cases to a human, and writing results back to your
                  systems), then choosing the simplest, lowest-cost pattern that does that job well.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  So the estimate is fair, we don&apos;t leave out real steps just to make it look cheaper, and we
                  don&apos;t add agents or steps that aren&apos;t actually needed.
                </p>
              </Card>

              <p className="mt-6 mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                The three patterns
              </p>
              <div className="space-y-3">
                {/* SINGLE AGENT */}
                <div className="flex gap-3.5 rounded-xl border border-primary/15 bg-primary/[0.03] p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <IconUser className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-semibold">Single Agent</h4>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                        one task, one agent
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      Use a <strong className="text-foreground">single agent</strong> when the whole job is{" "}
                      <strong className="text-foreground">one specific task</strong> that one agent can finish on its
                      own — answer a question, summarize a document, classify a ticket, or hold a conversation. It can
                      still use a knowledge base, tools, and memory and stay a single agent. This is the most common
                      case.
                    </p>
                    <p className="mt-2.5 rounded-lg bg-background/70 px-3 py-2 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground/70">Example</span> · an FAQ assistant that answers
                      customer questions from your help center.
                    </p>
                  </div>
                </div>

                {/* MANAGER */}
                <div className="flex gap-3.5 rounded-xl border border-primary/25 bg-primary/[0.055] p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <IconUsersGroup className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-semibold">Manager with sub-agents</h4>
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
                        specialists, coordinated
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      Use a <strong className="text-foreground">manager</strong> when one job needs{" "}
                      <strong className="text-foreground">several specialist agents working together</strong>, and a
                      manager decides which specialists to call and combines their answers. It&apos;s all reasoning —
                      there&apos;s no fixed step-by-step workflow, no approvals, and no external system calls.
                    </p>
                    <p className="mt-2.5 rounded-lg bg-background/70 px-3 py-2 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground/70">Example</span> · a research assistant where one
                      specialist searches the web, another reads filings, and another scans news — then the manager
                      writes a single brief.
                    </p>
                  </div>
                </div>

                {/* SUPERFLOW */}
                <div className="flex gap-3.5 rounded-xl border border-primary/40 bg-primary/[0.08] p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary">
                    <IconSitemap className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-semibold">Superflow</h4>
                      <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[11px] font-medium text-primary">
                        a defined workflow
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      Use a Superflow when the work is a{" "}
                      <strong className="text-foreground">defined, repeatable workflow</strong> — the same steps run in
                      the same order every time — <strong className="text-foreground">and</strong> it needs one of these
                      special capabilities a single agent or manager can&apos;t provide:
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {[
                        ["Human-in-the-loop approval", "Pause for a person to approve/reject (Wait for Approval)"],
                        ["Deterministic control flow", "If/Else, Switch, Loop, Filter, Merge"],
                        ["Non-LLM / integration steps", "HTTP, Code, Parse/Extract, Crypto, Set"],
                        ["AI Swarm", "Split into parallel sub-tasks as a workflow step"],
                        ["Durable, long-running execution", "Waits of days/weeks, retries, exactly-once"],
                        ["A fixed multi-step pipeline", "Agents/steps chained in a defined order"],
                      ].map(([t, d]) => (
                        <div key={t} className="rounded-lg border bg-card px-3 py-2.5">
                          <p className="text-sm font-medium">{t}</p>
                          <p className="text-xs text-muted-foreground">{d}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <h4 className="mt-6 mb-2 text-sm font-semibold">The decision in 4 steps (for each part of the app)</h4>
              <ol className="space-y-2 text-sm">
                {[
                  ["Is it one task a single agent can finish on its own?", "→ Single Agent (the common case)"],
                  ["Is it a fixed, repeatable workflow that needs a special step (approval, branching/looping, an external system call, or a set sequence)?", "→ Superflow"],
                  ["Does it need several specialist agents coordinated by a manager (pure reasoning)?", "→ Manager"],
                  ["Is the channel spoken?", "→ enable Voice (per minute)"],
                ].map(([q, a], i) => (
                  <li key={q} className="flex gap-3 rounded-lg border bg-card px-3 py-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {i + 1}
                    </span>
                    <span>
                      <span className="font-medium">{q}</span>{" "}
                      <span className="text-muted-foreground">{a}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-2 text-sm text-muted-foreground">
                A real app is usually a <strong className="text-foreground">mixture</strong> — decompose it, classify
                each piece, and price each separately.
              </p>

              <h4 className="mt-6 mb-2 text-sm font-semibold">Examples</h4>
              <Card className="overflow-x-auto p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 text-left">
                      <th className="px-4 py-2.5 font-semibold">Use case</th>
                      <th className="px-4 py-2.5 font-semibold">Pattern(s)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {[
                      ["FAQ chatbot over a knowledge base", "Single Agent (KB is just a feature)"],
                      ["Daily KPI summary emailed at 9am", "Single Agent (scheduled — not a Superflow)"],
                      ["Company research brief (web + filings + news)", "Manager (dispatches specialists, synthesizes)"],
                      ["Invoice: parse → check → approve → post to ERP", "Superflow (approval + integration + pipeline)"],
                      ["Recruiting suite", "Single (candidate Q&A) + Superflow (screening w/ approval) + Manager (fit)"],
                    ].map(([u, p]) => (
                      <tr key={u}>
                        <td className="px-4 py-2.5">{u}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{p}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </section>

            {/* MODELS */}
            <section>
              <H
                id="models"
                eyebrow="LLM cost"
                title="How we choose the model"
                sub="For each agent/node we pick the cheapest model that clears its quality bar, and mix models across a design. LLM cost is pass-through at the provider's public rate — no markup."
              />
              <div className="space-y-2">
                {[
                  ["Trivial / high-volume", "Routing, classification, tagging, simple extraction", "gpt-5-nano · gpt-5.4-nano · claude-haiku-4-5 · nova-micro"],
                  ["General-purpose", "Standard chat, Q&A, RAG, summaries, everyday drafting", "a GPT model — gpt-5.4-mini / gpt-5.4 / gpt-5.5"],
                  ["Complex / high-quality", "Nuanced drafting, careful extraction, risk analysis, coding", "claude-sonnet-4-6"],
                  ["Complex reasoning", "Hard multi-step planning, deep legal/financial reasoning", "claude-opus-4-8 (sparingly)"],
                  ["Research / web", "Live search, news, latest info (built-in web access)", "Perplexity sonar / sonar-pro"],
                  ["Long-context", "Very large documents", "gemini-2.5-pro / gemini-3.1-pro"],
                ].map(([tier, when, model]) => (
                  <div key={tier} className="rounded-lg border bg-card px-4 py-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold">{tier}</p>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">{model}</code>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{when}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Rule of thumb: don&apos;t put Opus on a node a cheap model handles, and don&apos;t put a cheap model on a
                node that genuinely needs reasoning. <strong className="text-foreground">Bring your own model</strong>{" "}
                and the LLM line is $0 on the Lyzr bill (you pay the provider directly).
              </p>

              <h4 className="mt-6 mb-2 text-sm font-semibold">
                Default model rates <span className="font-normal text-muted-foreground">($ per 1M tokens · input / output)</span>
              </h4>
              <p className="mb-2 text-xs text-muted-foreground">Click a provider to see its models and rates.</p>
              <div className="space-y-2">
                {byProvider.map(([provider, models]) => (
                  <RatesDisclosure key={provider} provider={provider} models={models} />
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Caveats accounted for where they apply: Gemini Pro ~2× above 200k input tokens; Perplexity adds a
                per-request search fee; Anthropic Opus 4.7+ uses ~35% more tokens for the same text.
              </p>
            </section>

            {/* CALCULATION */}
            <section>
              <H
                id="calculation"
                eyebrow="Putting it together"
                title="How the total is calculated"
                sub="Each workload is priced independently, then summed. Platform and LLM are computed on separate axes."
              />
              <Card className="bg-muted/30 font-mono text-xs leading-relaxed">
                <div>price_per_run = rate for the workload&apos;s tier &amp; runtime band</div>
                <div>platform(workload) = price_per_run × runs</div>
                <div>llm(workload) = Σ(call tokens × provider rate) × runs &nbsp;(0 if BYO)</div>
                <div className="mt-2 text-foreground">Total = Σ platform + Σ llm</div>
              </Card>
              <p className="mt-2 text-xs text-muted-foreground">
                Never multiply runs × nodes — nodes only select the band. When a Superflow&apos;s branches land in
                different node bands, each path is priced and blended by how often it&apos;s taken.
              </p>

              <h4 className="mt-5 mb-2 text-sm font-semibold">Worked example — &ldquo;Dashboard + chat over data&rdquo; (SaaS)</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <Card>
                  <Pill>Single Agent</Pill>
                  <h5 className="mt-2 font-semibold text-sm">Chat with the data</h5>
                  <p className="mt-1 text-sm text-muted-foreground">
                    50,000 messages/yr × {money(SIMPLE_RATE.cloud)} = <strong className="text-foreground">$3,000</strong>{" "}
                    platform. LLM ≈ $105 (gemini-2.5-flash, 1 call/run).
                  </p>
                </Card>
                <Card>
                  <Pill>Superflow</Pill>
                  <h5 className="mt-2 font-semibold text-sm">Data analysis pipeline</h5>
                  <p className="mt-1 text-sm text-muted-foreground">
                    365 runs/yr, 8 nodes → 1–10 band → {money(SUPERFLOW_BANDS[0].cloud)}/run ={" "}
                    <strong className="text-foreground">$109.50</strong> platform. LLM ≈ $3.
                  </p>
                </Card>
              </div>
              <div className="mt-3 rounded-lg border-2 border-primary bg-primary/10 px-4 py-3 text-sm">
                <strong>Total ≈ $3,217/yr</strong> — Platform $3,109.50 + LLM ~$108. Platform is driven by chat{" "}
                <em>volume</em>; LLM is small here. The two axes move independently.
              </div>
            </section>

            {/* ROI */}
            <section>
              <H
                id="roi"
                eyebrow="Value, honestly"
                title="ROI analysis"
                sub="We compare the AI solution's true annual cost against the loaded human cost of doing the same work — and we never overstate it."
              />
              <div className="space-y-2 text-sm text-muted-foreground">
                <Card>
                  <h4 className="text-sm font-semibold text-foreground">Human baseline</h4>
                  <p className="mt-1">
                    A fully-loaded hourly rate (US median × 1.3) for the role the work replaces, times the minutes per
                    unit, times the annual volume.
                  </p>
                </Card>
                <Card>
                  <h4 className="text-sm font-semibold text-foreground">Honest about human-in-the-loop</h4>
                  <p className="mt-1">
                    If the design keeps a person in the loop, the AI does <strong>not</strong> replace 100% of the labor.
                    We fold the retained human time back into the AI-solution cost:
                  </p>
                  <ul className="mt-2 space-y-1">
                    <li>
                      • <strong className="text-foreground">Mandatory sign-off on every run</strong> (e.g. a lawyer
                      approves every contract) → a short review time per unit is added back.
                    </li>
                    <li>
                      • <strong className="text-foreground">Confidence-gated escalation</strong> (only a fraction reaches
                      a human) → that fraction&apos;s review time is added back.
                    </li>
                  </ul>
                </Card>
                <Card>
                  <h4 className="text-sm font-semibold text-foreground">What we report</h4>
                  <p className="mt-1">
                    Net annual savings and %, payback period, and <strong>time savings measured as reduction in human
                    effort</strong> (not just AI speed). A design that still needs 12 min of human review per unit vs 60
                    min manual is an 80% time saving — we never claim 95%.
                  </p>
                </Card>
              </div>
            </section>

            <footer className="border-t pt-6 pb-2 text-center text-xs text-muted-foreground">
              Every rate and rule on this page is the exact logic the calculator runs. Questions? Ask the Lyzr team.
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
