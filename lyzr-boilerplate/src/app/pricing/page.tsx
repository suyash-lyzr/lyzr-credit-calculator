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
  IconChevronDown,
} from "@tabler/icons-react";
import {
  APC_RATE_PER_M,
  VPC_TIERS,
  SAAS_TIERS,
  STRATEGIC_MIN_PRICE,
  APC_PROFILES,
  MODEL_RATES,
  type ModelRate,
  type PlanTier,
} from "@/lib/pricing";

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
const usd = (n: number) => `$${n.toLocaleString("en-US")}`;
const fmtCap = (n: number) => (n >= 1e9 ? `${n / 1e9}B` : `${(n / 1e6).toFixed(0)}M`);

const SECTIONS = [
  { id: "overview", label: "Overview", icon: IconCoins },
  { id: "apc", label: "What is an APC?", icon: IconStack2 },
  { id: "rates", label: "Deployment Rates", icon: IconReceipt2 },
  { id: "plans", label: "Standard Plans", icon: IconReceipt2 },
  { id: "profiles", label: "APCs per Run", icon: IconRefresh },
  { id: "orchestration", label: "Choosing Orchestration", icon: IconSitemap },
  { id: "models", label: "Model Selection & LLM Rates", icon: IconCpu },
  { id: "calculation", label: "How the Total Is Calculated", icon: IconCalculator },
  { id: "roi", label: "ROI Analysis", icon: IconChartBar },
];

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
          {provider} <span className="font-normal text-muted-foreground">· {models.length} models</span>
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

function PlanTable({ deployment, tiers }: { deployment: string; tiers: PlanTier[] }) {
  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 text-left">
            <th className="px-4 py-2.5 font-semibold">{deployment} plan</th>
            <th className="px-4 py-2.5 font-semibold text-right">Annual price</th>
            <th className="px-4 py-2.5 font-semibold text-right">APC capacity</th>
            <th className="px-4 py-2.5 font-semibold">Notes</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {tiers.map((t) => (
            <tr key={t.name}>
              <td className="px-4 py-2.5 font-medium">{t.name}</td>
              <td className="px-4 py-2.5 text-right font-mono">{usd(t.price)}</td>
              <td className="px-4 py-2.5 text-right font-mono">{fmtCap(t.capacityApc)}</td>
              <td className="px-4 py-2.5 text-muted-foreground">{t.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
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

  // Group LLM models by provider for the rate tables.
  const byProvider = React.useMemo(() => {
    const map: Record<string, { name: string; r: ModelRate }[]> = {};
    Object.entries(MODEL_RATES).forEach(([name, r]) => {
      (map[r.provider] ??= []).push({ name, r });
    });
    Object.values(map).forEach((list) => list.sort((a, b) => a.r.input - b.r.input));
    const order = ["OpenAI", "Anthropic", "Google", "Amazon Bedrock", "Groq", "Perplexity", "xAI"];
    return Object.entries(map).sort(
      (a, b) => ((order.indexOf(a[0]) + 99) % 100) - ((order.indexOf(b[0]) + 99) % 100)
    );
  }, []);

  const saasRate = APC_RATE_PER_M.cloud;
  const vpcRate = APC_RATE_PER_M.vpc;

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background text-foreground">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b px-6 py-3 shrink-0">
        <Link
          href="/credit-calculator"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <IconArrowLeft className="h-4 w-4" /> Back to Calculator
        </Link>
        <span className="font-serif text-lg font-bold tracking-tight">How Lyzr Pricing Works</span>
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
                sub="Two numbers, computed independently. The platform fee is metered in APCs (tokens) and is what Lyzr bills; the LLM fee is the model provider's public rate passed straight through — with no markup."
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Card>
                  <div className="flex items-center gap-2 text-primary">
                    <IconCoins className="h-5 w-5" />
                    <h3 className="font-semibold">Lyzr Platform Cost</h3>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Metered in <strong className="text-foreground">APCs</strong> (Agent Processing
                    Credits). 1 APC = 1 token. Cost = total tokens your agents process × a flat
                    per-token rate that depends only on <strong className="text-foreground">deployment</strong>.
                  </p>
                  <div className="mt-3 rounded-lg bg-muted/50 px-3 py-2 font-mono text-xs">
                    total APCs × rate ( ${vpcRate}/M VPC · ${saasRate}/M SaaS )
                  </div>
                </Card>
                <Card>
                  <div className="flex items-center gap-2 text-primary">
                    <IconCpu className="h-5 w-5" />
                    <h3 className="font-semibold">LLM Cost</h3>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    The model-provider cost at the public rate, <strong className="text-foreground">no markup</strong>.
                    It is <strong className="text-foreground">$0 on the Lyzr bill</strong> if you bring your own model
                    (the platform APC cost still applies).
                  </p>
                  <div className="mt-3 rounded-lg bg-muted/50 px-3 py-2 font-mono text-xs">
                    Σ (tokens × provider rate)
                  </div>
                </Card>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Features like Knowledge Base, tools, memory and guardrails run <em>inside</em> a run —
                they are never billed separately, but the tokens they add (retrieved docs, tool
                schemas and results) do count toward APCs.
              </p>
            </section>

            {/* WHAT IS AN APC */}
            <section>
              <H
                id="apc"
                eyebrow="The unit"
                title="What is an APC?"
                sub="An Agent Processing Credit is the basic unit of work an AI model reads and writes. 1 APC = 1 token — a chunk of text (~4 characters, or ~¾ of a word)."
              />
              <Card className="bg-primary/[0.04] border-primary/20">
                <p className="text-sm">
                  <strong>APC = input tokens + output tokens</strong> — everything a model call
                  consumes, on both sides.
                </p>
              </Card>
              <p className="mt-4 mb-2 text-sm font-semibold">What counts toward APC usage</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  ["Input APCs", "System prompt, user message, conversation history, tool definitions, retrieved documents, files, records."],
                  ["Output APCs", "The visible response generated by the model."],
                  ["Reasoning APCs", "Hidden model computation used by reasoning-capable models, when billed by the provider."],
                  ["Tool / Context APCs", "Tool schemas, tool call results, file reads, search results, agent-to-agent handoffs."],
                ].map(([t, d]) => (
                  <div key={t} className="rounded-lg border bg-card px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{d}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                <strong className="text-foreground">Why price on APCs?</strong> It keeps Lyzr in the
                same mental model the whole market uses (per-million-token rates) — no abstract
                &quot;credits&quot; or seat math — every run exposes its full token usage so you can
                audit every APC, and the <em>platform</em> rate per APC never changes even if model
                prices move.
              </p>
            </section>

            {/* DEPLOYMENT RATES */}
            <section>
              <H
                id="rates"
                eyebrow="The rate card"
                title="Deployment Rates"
                sub="The APC unit is the same everywhere — only the rate changes by deployment type."
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Card>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    VPC / Private Deployment
                  </p>
                  <p className="mt-1 text-3xl font-bold text-primary">${vpcRate} <span className="text-base font-medium text-muted-foreground">/ 1M APCs</span></p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Runs inside your cloud, on your infrastructure. Lower per-token rate.
                  </p>
                </Card>
                <Card>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    SaaS (Lyzr-hosted)
                  </p>
                  <p className="mt-1 text-3xl font-bold text-primary">${saasRate} <span className="text-base font-medium text-muted-foreground">/ 1M APCs</span></p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Fully managed, zero-infrastructure. Higher per-token rate.
                  </p>
                </Card>
              </div>
              <p className="mt-3 text-xs text-muted-foreground italic">
                SaaS and VPC are priced on completely different unit economics — the same token
                volume costs very differently by deployment. Never quote a SaaS number against a VPC
                estimate or vice-versa.
              </p>
            </section>

            {/* STANDARD PLANS */}
            <section>
              <H
                id="plans"
                eyebrow="Capacity plans"
                title="Standard Plans"
                sub="Each plan is an annual price that buys an annual APC (token) capacity. A single use case usually fits comfortably inside a plan — plans are bought at the account level for all of a customer's agents."
              />
              <p className="mb-2 text-sm font-semibold">VPC (private deployment)</p>
              <PlanTable deployment="VPC" tiers={VPC_TIERS} />
              <p className="mt-2 text-xs text-muted-foreground">
                Studio Enterprise is the default to lead with; Lite and Scale are smaller /
                specific-case entry points, not the opening offer.
              </p>
              <p className="mt-5 mb-2 text-sm font-semibold">SaaS (Lyzr-hosted)</p>
              <PlanTable deployment="SaaS" tiers={SAAS_TIERS} />
              <div className="mt-5 rounded-lg border border-amber-300/60 bg-amber-50/50 px-4 py-3">
                <p className="text-sm font-semibold text-amber-800">
                  Strategic → Unlimited Credits ({usd(STRATEGIC_MIN_PRICE)}+)
                </p>
                <p className="mt-1 text-xs text-amber-800/80">
                  Fortune-50-scale, usage-heavy accounts aren&apos;t metered against a plan — usage
                  runs freely and the relationship is priced as a strategic partnership. This route
                  needs leadership sign-off and is not a self-serve estimate.
                </p>
              </div>
            </section>

            {/* APCs PER RUN */}
            <section>
              <H
                id="profiles"
                eyebrow="Sizing a run"
                title="APCs per Run"
                sub="A run's APCs = the sum of input + output tokens across every model call it makes. These reference profiles let you sanity-check an estimate; the calculator computes the exact figure from each node's token usage."
              />
              <Card className="overflow-x-auto p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 text-left">
                      <th className="px-4 py-2.5 font-semibold">Run type</th>
                      <th className="px-4 py-2.5 font-semibold text-right">Typical (P50)</th>
                      <th className="px-4 py-2.5 font-semibold text-right">Heavy (P95)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="px-4 py-2.5">
                        <span className="font-medium">Single agent</span>
                        <span className="block text-xs text-muted-foreground">prompt + history + tool calls + response</span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono">{APC_PROFILES.single.p50.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{APC_PROFILES.single.p95.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5">
                        <span className="font-medium">Multi-agent orchestration</span>
                        <span className="block text-xs text-muted-foreground">manager + workers, or a multi-node Superflow</span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono">{APC_PROFILES.multi.p50.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{APC_PROFILES.multi.p95.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </Card>
              <p className="mt-3 text-sm text-muted-foreground">
                There is <strong className="text-foreground">no complexity-tier rate and no
                node/sub-agent band</strong> — a run costs whatever tokens it actually consumes.
                Complexity still matters because a more complex agent makes more calls and carries
                more context, which means more APCs.
              </p>
            </section>

            {/* ORCHESTRATION */}
            <section>
              <H
                id="orchestration"
                eyebrow="Designing the solution"
                title="How we choose the orchestration"
                sub="The pattern doesn't set the price anymore — but it decides how many model calls and how much context a run needs (its APCs). We design the real production solution, then classify each part."
              />
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
                      Use a single agent when the whole job is one specific task one agent can finish
                      on its own — answer a question, summarize a document, classify a ticket, hold a
                      conversation. It can still use a knowledge base, tools and memory. The most
                      common case, and the fewest APCs per run.
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
                      Use a manager when one job needs several specialist agents working together and
                      a manager decides which to call and combines their answers. Pure reasoning — no
                      fixed workflow, no approvals, no external system calls. More calls per run → more
                      APCs.
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
                      Use a Superflow when the work is a defined, repeatable workflow that needs a
                      special capability a single agent or manager can&apos;t provide — human approval,
                      deterministic branching/loops, non-LLM / integration steps (HTTP, Code,
                      Parse/Extract), AI Swarm, durable long-running execution, or a fixed multi-step
                      pipeline. Only the LLM/agent nodes consume APCs; steps like If, HTTP and Code
                      don&apos;t.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* MODELS */}
            <section>
              <H
                id="models"
                eyebrow="Matching model to task"
                title="Model Selection & LLM Rates"
                sub="We pick the cheapest model that clears each node's quality bar and mix models across a workflow. LLM cost passes through at these public per-million-token rates — no markup."
              />
              <div className="mb-4 grid gap-2 sm:grid-cols-2">
                {[
                  ["Trivial / high-volume", "Routing, classification, tagging, simple extraction → cheapest tier (gpt-5.4-nano, gemini-2.5-flash-lite, claude-haiku-4.5)."],
                  ["General-purpose", "Chat, Q&A, RAG answers, summaries, everyday drafting → a GPT model (gpt-5.4-mini by default)."],
                  ["Complex / high-quality", "Nuanced drafting, careful multi-field extraction, risk analysis, coding → Claude Sonnet 4.6."],
                  ["Complex reasoning", "Hard multi-step planning, deep legal/financial reasoning → Claude Opus 4.8 (sparingly)."],
                  ["Research / web search", "Live web lookups → Perplexity Sonar / Sonar Pro (a plain chat model can't search the web)."],
                  ["Long context", "Very large documents → gemini-2.5-pro / gemini-3.1-pro."],
                ].map(([t, d]) => (
                  <div key={t} className="rounded-lg border bg-card px-4 py-3">
                    <p className="text-sm font-medium">{t}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{d}</p>
                  </div>
                ))}
              </div>
              <p className="mb-2 text-sm font-semibold">Default LLM rates ($/1M input / $/1M output)</p>
              <div className="space-y-2">
                {byProvider.map(([provider, models]) => (
                  <RatesDisclosure key={provider} provider={provider} models={models} />
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Caveats accounted for where they apply: Gemini Pro ~2× above 200k input tokens;
                Perplexity adds a per-request search fee; Anthropic Opus 4.7+ uses ~35% more tokens
                for the same text.
              </p>
            </section>

            {/* CALCULATION */}
            <section>
              <H
                id="calculation"
                eyebrow="Putting it together"
                title="How the Total Is Calculated"
                sub="Everything is deterministic — the calculator estimates the design, then the engine does all the money math."
              />
              <ol className="space-y-2 text-sm">
                {[
                  ["Estimate tokens per model call", "For each node/agent call in a run, estimate input + output tokens (input includes the full context: system prompt, tool defs, history, retrieved docs)."],
                  ["Sum to APCs per run", "APCs/run = Σ(input + output) across all calls. Non-LLM steps (HTTP, Code, If) consume no APCs."],
                  ["Multiply by annual runs", "Annual APCs = APCs/run × runs per year, for each workload, summed across the whole use case."],
                  ["Apply the deployment rate", `Platform cost = total annual APCs × $${vpcRate}/M (VPC) or $${saasRate}/M (SaaS).`],
                  ["Add LLM pass-through", "LLM cost = Σ(tokens × provider rate), or $0 on the Lyzr bill if the customer brings their own model."],
                  ["Check the scale", "Plans are sized at the account level (a customer may run several use cases), so a single estimate isn't mapped to a plan — but usage beyond the largest standard tier is flagged as a strategic Unlimited-Credits case."],
                ].map(([q, a], i) => (
                  <li key={q} className="flex gap-3 rounded-lg border bg-card px-3 py-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {i + 1}
                    </span>
                    <span>
                      <span className="font-medium">{q}</span>{" "}
                      <span className="text-muted-foreground">— {a}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-sm text-muted-foreground">
                Because a single use case is usually far smaller than a plan&apos;s capacity — and a
                customer may run several use cases on one account — the calculator shows the{" "}
                <strong className="text-foreground">usage cost</strong> (APCs × rate) as the
                headline and leaves plan sizing to the account-level conversation.
              </p>
            </section>

            {/* ROI */}
            <section>
              <H
                id="roi"
                eyebrow="Value vs. cost"
                title="ROI Analysis"
                sub="We compare the all-in AI cost against what the same work costs done manually, honestly accounting for any human still in the loop."
              />
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  <strong className="text-foreground">Human cost</strong> = the mapped role&apos;s
                  fully-loaded hourly rate × minutes per unit × annual volume.
                </p>
                <p>
                  <strong className="text-foreground">All-in AI cost</strong> = Lyzr platform (APCs ×
                  rate) + LLM paid to the provider (shown as pass-through, counted even when BYO) +
                  any retained human review time.
                </p>
                <p>
                  <strong className="text-foreground">Honest human-in-the-loop.</strong> If the design
                  keeps a person for approval or escalation, only the automated fraction is credited —
                  the residual review time stays in the AI column, so savings are never overstated as
                  &quot;100% replaced.&quot;
                </p>
                <p>
                  We report yearly savings, savings %, payback period, and ROI % — all computed from
                  the same numbers shown in the panel, so the chat and the breakdown can never
                  disagree.
                </p>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
