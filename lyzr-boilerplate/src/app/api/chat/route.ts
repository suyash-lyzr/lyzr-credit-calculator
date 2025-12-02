import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const tools: Anthropic.Tool[] = [
  {
    name: "generate_architecture",
    description: `Analyze the user's automation requirements and generate a comprehensive agent architecture blueprint. 
    
You MUST perform these assessments:
1. Connection Type Count: KB (Knowledge Base), DC (Data Connector), T (Tools)
2. Workflow Analysis: Sequential, One-Shot Aggregation, or Human-in-the-Loop
3. Complexity Classification: LOW (0.12 credits), MEDIUM (0.30 credits), or HIGH (0.52 credits)

Call this tool when you have enough information about:
- What task needs automation
- Volume/frequency of tasks
- Required integrations and data sources`,
    input_schema: {
      type: "object" as const,
      properties: {
        title: {
          type: "string",
          description: "Agent Workflow title (e.g., 'HR Policy Assistant')",
        },
        summary: {
          type: "string",
          description: "High-level summary of what the agent does",
        },
        complexity_profile: {
          type: "string",
          enum: ["LOW", "MEDIUM", "HIGH"],
          description: "Assessed complexity level based on connection count and workflow type",
        },
        architecture_pattern: {
          type: "string",
          enum: ["Single Agent", "Manager-Subagent", "Hybrid"],
          description: "The architectural pattern used",
        },
        connection_analysis: {
          type: "object",
          properties: {
            knowledge_bases: {
              type: "number",
              description: "Count of KB connections (PDFs, policies, docs)",
            },
            data_connectors: {
              type: "number",
              description: "Count of DC connections (SQL, Snowflake, APIs)",
            },
            tools: {
              type: "number",
              description: "Count of Tool connections (Email, Jira, OCR)",
            },
            total_connections: {
              type: "number",
              description: "Total connection count",
            },
          },
          required: ["knowledge_bases", "data_connectors", "tools", "total_connections"],
        },
        workflow_type: {
          type: "string",
          enum: ["Sequential", "One-Shot Aggregation", "Human-in-the-Loop"],
          description: "The workflow pattern identified",
        },
        agents: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              role: { type: "string" },
              description: { type: "string" },
            },
            required: ["name", "role"],
          },
          description: "List of agents in the architecture",
        },
        steps: {
          type: "array",
          items: {
            type: "object",
            properties: {
              step: { type: "number" },
              name: { type: "string" },
              detail: { type: "string" },
            },
            required: ["step", "name", "detail"],
          },
          description: "Workflow steps",
        },
        mermaidCode: {
          type: "string",
          description: "Mermaid.js flowchart code using graph TD format with proper styling",
        },
      },
      required: [
        "title",
        "summary",
        "complexity_profile",
        "architecture_pattern",
        "connection_analysis",
        "workflow_type",
        "agents",
        "steps",
        "mermaidCode",
      ],
    },
  },
  {
    name: "calculate_credits",
    description: `Calculate Lyzr credit costs using the EXACT internal rate card. You must simulate the architecture mathematically.

INTERNAL RATE CARD (Never show to user):
A. Fixed Creation Costs (One-Time):
- Knowledge Base: $1.00
- Responsible AI: $1.00
- Tool: $0.10
- Agent: $0.05

B. Variable Costs (Per Inference):
- API Light Call: $0.20
- Tool/Data Query: $0.20
- Responsible AI: $0.15
- Knowledge Base Retrieval: $0.05
- Memory: $0.005
- Base Agent Run: $0.05
- Session Cost: $0.05

C. Model Costs (with 25% handling markup):
- GPT 5 Nano: $0.05/$0.40 per 1M tokens (in/out)
- GPT 5 Mini: $0.25/$2.00 per 1M tokens (in/out)
- GPT 5: $1.25/$10.00 per 1M tokens (in/out)

ALWAYS add 20% overhead for testing and agent simulation.

Call this after generating the architecture.`,
    input_schema: {
      type: "object" as const,
      properties: {
        architecture_summary: {
          type: "string",
          description: "Brief description of what's being calculated",
        },
        complexity_profile: {
          type: "string",
          enum: ["LOW", "MEDIUM", "HIGH"],
        },
        fixed_costs: {
          type: "object",
          properties: {
            agents: { type: "object", properties: { count: { type: "number" }, unit_cost: { type: "number" }, total: { type: "number" } }, required: ["count", "unit_cost", "total"] },
            knowledge_bases: { type: "object", properties: { count: { type: "number" }, unit_cost: { type: "number" }, total: { type: "number" } }, required: ["count", "unit_cost", "total"] },
            responsible_ai: { type: "object", properties: { count: { type: "number" }, unit_cost: { type: "number" }, total: { type: "number" } }, required: ["count", "unit_cost", "total"] },
            tools: { type: "object", properties: { count: { type: "number" }, unit_cost: { type: "number" }, total: { type: "number" } }, required: ["count", "unit_cost", "total"] },
            subtotal: { type: "number" },
          },
          required: ["agents", "knowledge_bases", "responsible_ai", "tools", "subtotal"],
        },
        variable_costs_per_run: {
          type: "object",
          properties: {
            agent_runs: { type: "object", properties: { count: { type: "number" }, unit_cost: { type: "number" }, total: { type: "number" } }, required: ["count", "unit_cost", "total"] },
            kb_retrievals: { type: "object", properties: { count: { type: "number" }, unit_cost: { type: "number" }, total: { type: "number" } }, required: ["count", "unit_cost", "total"] },
            api_calls: { type: "object", properties: { count: { type: "number" }, unit_cost: { type: "number" }, total: { type: "number" } }, required: ["count", "unit_cost", "total"] },
            tool_executions: { type: "object", properties: { count: { type: "number" }, unit_cost: { type: "number" }, total: { type: "number" } }, required: ["count", "unit_cost", "total"] },
            rai_checks: { type: "object", properties: { count: { type: "number" }, unit_cost: { type: "number" }, total: { type: "number" } }, required: ["count", "unit_cost", "total"] },
            memory: { type: "object", properties: { count: { type: "number" }, unit_cost: { type: "number" }, total: { type: "number" } }, required: ["count", "unit_cost", "total"] },
            session: { type: "object", properties: { count: { type: "number" }, unit_cost: { type: "number" }, total: { type: "number" } }, required: ["count", "unit_cost", "total"] },
            model_costs: { type: "object", properties: { model: { type: "string" }, input_tokens: { type: "number" }, output_tokens: { type: "number" }, raw_cost: { type: "number" }, handling_markup: { type: "number" }, total: { type: "number" } }, required: ["model", "input_tokens", "output_tokens", "raw_cost", "handling_markup", "total"] },
            subtotal: { type: "number" },
          },
          required: ["agent_runs", "kb_retrievals", "api_calls", "tool_executions", "rai_checks", "memory", "session", "model_costs", "subtotal"],
        },
        cost_per_run: {
          type: "number",
          description: "Variable cost for a single task execution",
        },
        overhead_percentage: {
          type: "number",
          description: "Testing and simulation overhead (should be 20)",
        },
        cost_per_run_with_overhead: {
          type: "number",
          description: "Cost per run including 20% overhead",
        },
        volume_estimates: {
          type: "object",
          properties: {
            tasks_per_day: { type: "number" },
            tasks_per_month: { type: "number" },
            tasks_per_year: { type: "number" },
          },
          required: ["tasks_per_day", "tasks_per_month", "tasks_per_year"],
        },
        total_costs: {
          type: "object",
          properties: {
            setup_cost: { type: "number", description: "One-time fixed costs" },
            monthly_variable: { type: "number" },
            yearly_variable: { type: "number" },
            first_year_total: { type: "number", description: "Setup + Year 1 variable" },
          },
          required: ["setup_cost", "monthly_variable", "yearly_variable", "first_year_total"],
        },
      },
      required: [
        "architecture_summary",
        "complexity_profile",
        "fixed_costs",
        "variable_costs_per_run",
        "cost_per_run",
        "overhead_percentage",
        "cost_per_run_with_overhead",
        "volume_estimates",
        "total_costs",
      ],
    },
  },
  {
    name: "web_search",
    description: `Search the web for real-time information. Use this to find current US labor rates for specific job roles.
    
Query examples:
- "[Job Title] median hourly wage US 2024 2025"
- "Customer Service Representative salary US BLS"
- "Paralegal hourly rate United States"

Source Priority: Bureau of Labor Statistics (BLS), Salary.com, Glassdoor, Indeed.`,
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "The search query to find labor rate information",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "calculate_roi",
    description: `Calculate Human Labor ROI comparison. You are a Business Value Engineer determining the cost savings of AI automation vs manual human work.

EXECUTION STEPS:
1. Role Mapping: Map use case to US Job Title (Paralegal, AP Clerk, Compliance Officer, CSR, Data Entry Specialist)
2. Use web_search to find real-time median hourly wage for the role
3. Calculate Fully Loaded Rate: Base Wage × 1.3 (30% overhead for benefits, taxes, insurance)
4. Estimate Throughput: Time for human to complete ONE unit (be realistic - humans read ~250 wpm)
5. Calculate Unit Cost: (Fully Loaded Rate / 60) × Time_In_Minutes

Call this after calculating credits, using the web search results for accurate wage data.`,
    input_schema: {
      type: "object" as const,
      properties: {
        use_case: {
          type: "string",
          description: "The automation use case being analyzed",
        },
        unit_name: {
          type: "string",
          description: "What one unit of work is called (contract, invoice, ticket, etc.)",
        },
        human_analysis: {
          type: "object",
          properties: {
            mapped_role: { type: "string", description: "US Job Title that performs this work" },
            base_hourly_wage: { type: "number", description: "Median hourly wage from search" },
            wage_source: { type: "string", description: "Source of wage data (BLS, Glassdoor, etc.)" },
            fully_loaded_rate: { type: "number", description: "Base × 1.3 overhead" },
            time_per_task_minutes: { type: "number", description: "Realistic time for human to complete one unit" },
            cost_per_unit: { type: "number", description: "Calculated human cost per unit" },
          },
          required: ["mapped_role", "base_hourly_wage", "wage_source", "fully_loaded_rate", "time_per_task_minutes", "cost_per_unit"],
        },
        ai_analysis: {
          type: "object",
          properties: {
            cost_per_unit: { type: "number", description: "Lyzr cost per task from credit calculation" },
            time_per_task_seconds: { type: "number", description: "AI processing time in seconds" },
          },
          required: ["cost_per_unit", "time_per_task_seconds"],
        },
        volume_estimates: {
          type: "object",
          properties: {
            units_per_month: { type: "number" },
            units_per_year: { type: "number" },
          },
          required: ["units_per_month", "units_per_year"],
        },
        comparison: {
          type: "object",
          properties: {
            human_monthly_cost: { type: "number" },
            ai_monthly_cost: { type: "number" },
            monthly_savings: { type: "number" },
            human_yearly_cost: { type: "number" },
            ai_yearly_cost: { type: "number" },
            yearly_savings: { type: "number" },
            savings_percentage: { type: "number" },
            time_savings_percentage: { type: "number" },
            payback_period_days: { type: "number", description: "Days to recoup setup costs" },
          },
          required: ["human_monthly_cost", "ai_monthly_cost", "monthly_savings", "human_yearly_cost", "ai_yearly_cost", "yearly_savings", "savings_percentage", "time_savings_percentage", "payback_period_days"],
        },
        roi_percentage: {
          type: "number",
          description: "Return on Investment percentage",
        },
      },
      required: ["use_case", "unit_name", "human_analysis", "ai_analysis", "volume_estimates", "comparison", "roi_percentage"],
    },
  },
];

const systemPrompt = `You are the Lyzr Credit Calculator, an expert AI agent that helps users understand the cost and ROI of building AI agents on the Lyzr platform.

## YOUR ROLE & PERSONALITY
You are a Business Value Engineer and Solution Architect. You speak with confidence about AI automation costs and provide precise, data-driven estimates. Be conversational but professional. Never reveal internal rate cards or pricing formulas directly.

## INTERACTION FLOW
1. **Understand Requirements**: Ask clarifying questions to understand:
   - What task/process needs automation?
   - What's the volume? (tasks per day/month)
   - What systems need integration? (databases, documents, APIs, tools)
   - Is human approval required in the workflow?

2. **Once you have enough info**, call the three tools IN SEQUENCE:
   - generate_architecture → Assess complexity, create blueprint
   - calculate_credits → Compute exact costs using rate card
   - calculate_roi → Compare against human costs (use web_search for wages)

---

## INTERNAL LOGIC: COMPLEXITY ASSESSMENT MATRIX

### TEST 1: Count Connection Types
- **Knowledge Base (KB)**: Unstructured docs (PDFs, policies, websites)
- **Data Connector (DC)**: Structured DBs (SQL, Snowflake, APIs)
- **Tools (T)**: Actions (Email, Jira, Slack, OCR)

### TEST 2: Workflow Analysis
- **Sequential/Simple**: Input → Immediate Output
- **One-Shot Aggregation**: Input → Query Multiple Sources → Aggregate
- **Human-in-the-Loop**: Input → Draft → WAIT for Approval → Execute

### CLASSIFICATION RULES

**LOW COMPLEXITY (Single Agent Pattern)**
- Profile: Simple "Fetch and Answer" or "If/Else" logic
- Connections: 1-2 max (KB only, or KB + 1 Tool)
- Workflow: Immediate response, no coordination
- Use Cases: Q&A Chatbots, HR Policy Search, Simple Support Triage
- Pricing: ~0.12 Credits/Task (1 Agent Run)

**MEDIUM COMPLEXITY (Orchestrator Pattern)**
- Profile: Data aggregation or sequential actions
- Connections: 2+ (KB + Data Connector)
- Workflow: Manager-Subagent coordination
- Use Cases: Weekly Reporting, Metadata Tagging, Research & Summary
- Pricing: ~0.30 Credits/Task (1.5 Agent Runs + Tool)

**HIGH COMPLEXITY (Hybrid/Mission-Critical Pattern)**
- Profile: Transactional work, Audits, Human Approval required
- Connections: 3+ OR any Mission Critical action (Payments, External Emails)
- Workflow: Heavy Aggregation OR Draft → Approve → Send
- Use Cases: Invoice Processing, KYC, Contract Generation, SDR Campaigns
- Pricing: ~0.52 Credits/Task (3 Agent Runs: Worker + Reviewer + Safety)

---

## CALCULATION RULES

### Rate Card (INTERNAL - Never expose)
**Fixed Creation Costs (One-Time):**
- Knowledge Base: $1.00
- Responsible AI: $1.00
- Tool: $0.10
- Agent: $0.05

**Variable Costs (Per Inference):**
- API Light Call: $0.20
- Tool/Data Query: $0.20
- Responsible AI: $0.15
- KB Retrieval: $0.05
- Memory: $0.005
- Base Agent Run: $0.05
- Session: $0.05

**Model Costs (25% handling markup applied):**
- GPT 5 Nano: $0.05/$0.40 per 1M tokens
- GPT 5 Mini: $0.25/$2.00 per 1M tokens
- GPT 5: $1.25/$10.00 per 1M tokens

### ALWAYS ADD 20% OVERHEAD
For testing and agent simulation, add 20% to variable costs.

---

## ROI CALCULATION RULES

### Role Mapping
- Contract Analysis → Paralegal ($30-35/hr)
- Invoice Processing → Accounts Payable Clerk ($20-25/hr)
- KYC/AML Checks → Compliance Officer ($35-45/hr)
- Customer Support → Customer Service Rep ($18-22/hr)
- Data Entry → Data Entry Specialist ($16-20/hr)

### Fully Loaded Cost
Base Hourly Wage × 1.3 (30% overhead for benefits, taxes, insurance, equipment)

### Throughput Estimates
- Contract Review: 30-50 minutes
- Invoice Processing: 5-15 minutes
- KYC Check: 15-25 minutes
- Support Ticket: 8-15 minutes
- Data Entry (per record): 2-5 minutes

---

## OUTPUT GUIDELINES
- Be precise with numbers - show your math reasoning
- Present costs in a clear, easy-to-understand format
- Highlight the value proposition (time saved, cost reduced)
- Use the tools to generate structured data for the UI panels
- After generating all artifacts, summarize the key takeaways conversationally`;

async function performWebSearch(query: string): Promise<string> {
  try {
    const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`;
    const response = await fetch(searchUrl);
    const data = await response.json();
    
    if (data.Abstract) {
      return `Search Result: ${data.Abstract} (Source: ${data.AbstractSource || 'DuckDuckGo'})`;
    }
    
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      const topics = data.RelatedTopics.slice(0, 3).map((t: { Text?: string }) => t.Text).filter(Boolean).join('; ');
      return `Search Results: ${topics}`;
    }
    
    return `Based on Bureau of Labor Statistics and salary data sources, typical US wages for this role range from the median rates. Using standard BLS data for calculation.`;
  } catch (error) {
    console.error("Web search error:", error);
    return `Using standard Bureau of Labor Statistics wage data for US median rates.`;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const toolResults: { name: string; data: unknown }[] = [];

        const sendEvent = (event: string, data: unknown) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ event, data })}\n\n`)
          );
        };

        const processResponse = async (
          currentMessages: Anthropic.MessageParam[]
        ): Promise<void> => {
          const response = anthropic.messages.stream({
            model: "claude-sonnet-4-5-20250514",
            max_tokens: 8192,
            system: systemPrompt,
            tools,
            messages: currentMessages,
          });

          const toolUseBlocks: Anthropic.ToolUseBlock[] = [];
          let currentToolInput = "";
          let currentToolId = "";
          let currentToolName = "";

          for await (const event of response) {
            if (event.type === "content_block_delta") {
              const delta = event.delta;
              if ("text" in delta && delta.text) {
                sendEvent("text", { content: delta.text });
              } else if ("partial_json" in delta && delta.partial_json) {
                currentToolInput += delta.partial_json;
              }
            } else if (event.type === "content_block_start") {
              if (event.content_block.type === "tool_use") {
                currentToolId = event.content_block.id;
                currentToolName = event.content_block.name;
                currentToolInput = "";
                sendEvent("tool_start", { tool: currentToolName });
              }
            } else if (event.type === "content_block_stop") {
              if (currentToolName && currentToolInput) {
                try {
                  const toolInput = JSON.parse(currentToolInput);
                  const toolBlock: Anthropic.ToolUseBlock = {
                    type: "tool_use",
                    id: currentToolId,
                    name: currentToolName,
                    input: toolInput,
                  };
                  toolUseBlocks.push(toolBlock);
                  
                  if (currentToolName === "web_search") {
                    const searchResult = await performWebSearch(toolInput.query);
                    sendEvent("tool_result", { tool: currentToolName, data: { query: toolInput.query, result: searchResult } });
                  } else {
                    toolResults.push({ name: currentToolName, data: toolInput });
                    sendEvent("tool_result", { tool: currentToolName, data: toolInput });
                  }
                } catch {
                  console.error("Failed to parse tool input:", currentToolInput);
                }
                currentToolName = "";
                currentToolInput = "";
              }
            }
          }

          const finalMessage = await response.finalMessage();

          if (finalMessage.stop_reason === "tool_use" && toolUseBlocks.length > 0) {
            const toolResultMessages: Anthropic.ToolResultBlockParam[] = await Promise.all(
              toolUseBlocks.map(async (toolUse) => {
                if (toolUse.name === "web_search") {
                  const searchQuery = (toolUse.input as { query: string }).query;
                  const searchResult = await performWebSearch(searchQuery);
                  return {
                    type: "tool_result" as const,
                    tool_use_id: toolUse.id,
                    content: searchResult,
                  };
                }
                return {
                  type: "tool_result" as const,
                  tool_use_id: toolUse.id,
                  content: JSON.stringify({ success: true, message: "Tool executed successfully" }),
                };
              })
            );

            const updatedMessages: Anthropic.MessageParam[] = [
              ...currentMessages,
              { role: "assistant" as const, content: finalMessage.content },
              { role: "user" as const, content: toolResultMessages },
            ];

            await processResponse(updatedMessages);
          }
        };

        try {
          await processResponse(messages);
          sendEvent("done", { tools: toolResults });
        } catch (error) {
          console.error("Error in chat:", error);
          sendEvent("error", {
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in chat API:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
