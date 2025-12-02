import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

const tools: Anthropic.Tool[] = [
  {
    name: "generate_architecture",
    description:
      "Generate a high-level agent architecture diagram based on the user's automation requirements. Call this tool when you have understood the user's needs well enough to propose an agent architecture.",
    input_schema: {
      type: "object" as const,
      properties: {
        nodes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              type: {
                type: "string",
                enum: ["input", "agent", "tool", "output", "decision"],
              },
              description: { type: "string" },
            },
            required: ["id", "name", "type"],
          },
          description: "List of nodes in the architecture",
        },
        connections: {
          type: "array",
          items: {
            type: "object",
            properties: {
              from: { type: "string" },
              to: { type: "string" },
              label: { type: "string" },
            },
            required: ["from", "to"],
          },
          description: "Connections between nodes",
        },
        mermaidCode: {
          type: "string",
          description:
            "Mermaid.js flowchart code for the architecture diagram. Use graph TD format.",
        },
      },
      required: ["nodes", "connections", "mermaidCode"],
    },
  },
  {
    name: "calculate_credits",
    description:
      "Calculate the Lyzr credit costs for the proposed agent architecture. Call this after generating the architecture to provide cost estimates.",
    input_schema: {
      type: "object" as const,
      properties: {
        lineItems: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              component: { type: "string" },
              description: { type: "string" },
              quantity: { type: "number" },
              unitCost: { type: "number" },
              totalCost: { type: "number" },
            },
            required: [
              "id",
              "component",
              "description",
              "quantity",
              "unitCost",
              "totalCost",
            ],
          },
          description: "Line items for credit calculation",
        },
        subtotal: {
          type: "number",
          description: "Total cost per run in USD",
        },
        monthlyEstimate: {
          type: "number",
          description: "Estimated monthly cost based on expected usage",
        },
        yearlyEstimate: {
          type: "number",
          description: "Estimated yearly cost",
        },
      },
      required: ["lineItems", "subtotal", "monthlyEstimate", "yearlyEstimate"],
    },
  },
  {
    name: "calculate_roi",
    description:
      "Calculate the ROI compared to human costs for the automation. Call this after calculating credits to show the value proposition.",
    input_schema: {
      type: "object" as const,
      properties: {
        metrics: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              label: { type: "string" },
              humanValue: { type: "number" },
              automatedValue: { type: "number" },
              unit: { type: "string" },
              savings: { type: "number" },
              savingsPercentage: { type: "number" },
            },
            required: [
              "id",
              "label",
              "humanValue",
              "automatedValue",
              "unit",
              "savings",
              "savingsPercentage",
            ],
          },
          description: "Comparison metrics between human and automated approach",
        },
        totalMonthlySavings: {
          type: "number",
          description: "Total monthly savings in USD",
        },
        totalYearlySavings: {
          type: "number",
          description: "Total yearly savings in USD",
        },
        paybackPeriodMonths: {
          type: "number",
          description: "Number of months to break even",
        },
        roiPercentage: {
          type: "number",
          description: "Return on investment percentage",
        },
      },
      required: [
        "metrics",
        "totalMonthlySavings",
        "totalYearlySavings",
        "paybackPeriodMonths",
        "roiPercentage",
      ],
    },
  },
];

const systemPrompt = `You are Lyzr Credit Calculator, an AI assistant that helps users understand the cost and ROI of building AI agents on the Lyzr platform.

Your job is to:
1. Understand the user's automation needs through conversation
2. Design an appropriate agent architecture
3. Calculate the Lyzr credits required
4. Compare costs against human labor to show ROI

When the user describes a problem or automation need:
1. First, ask clarifying questions if needed to understand the scope (volume, frequency, complexity)
2. Once you have enough information, call the three tools in sequence:
   - generate_architecture: Create a visual architecture diagram
   - calculate_credits: Calculate the credit costs
   - calculate_roi: Compare against human costs

For architecture diagrams, create sensible agent flows using:
- Input nodes (data sources, triggers)
- Agent nodes (LLM-powered decision makers)
- Tool nodes (external integrations, APIs)
- Decision nodes (branching logic)
- Output nodes (results, actions)

For credit calculations, use these approximate rates:
- LLM calls (Claude): $0.003 per 1K input tokens, $0.015 per 1K output tokens
- Tool executions: $0.001 per call
- Memory/storage: $0.0001 per MB
- Agent orchestration: $0.002 per step

For ROI calculations, compare against typical human costs:
- Consider time savings (human hours vs automated seconds)
- Consider accuracy improvements
- Consider scalability benefits
- Use reasonable hourly rates ($30-100/hr depending on task complexity)

Always be helpful, provide realistic estimates, and explain your reasoning. When updating calculations based on new information, call the relevant tools again to update the artifacts.`;

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullContent = "";
        const toolResults: { name: string; data: unknown }[] = [];

        const sendEvent = (event: string, data: unknown) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ event, data })}\n\n`)
          );
        };

        const processResponse = async (
          currentMessages: Anthropic.MessageParam[]
        ): Promise<void> => {
          const response = await anthropic.messages.create({
            model: "claude-sonnet-4-5-20250514",
            max_tokens: 8192,
            system: systemPrompt,
            tools,
            messages: currentMessages,
          });

          for (const block of response.content) {
            if (block.type === "text") {
              fullContent += block.text;
              sendEvent("text", { content: block.text });
            } else if (block.type === "tool_use") {
              sendEvent("tool_start", { tool: block.name });
              
              toolResults.push({ name: block.name, data: block.input });
              sendEvent("tool_result", { tool: block.name, data: block.input });
            }
          }

          if (response.stop_reason === "tool_use") {
            const toolUseBlocks = response.content.filter(
              (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
            );

            const toolResultMessages: Anthropic.ToolResultBlockParam[] =
              toolUseBlocks.map((toolUse) => ({
                type: "tool_result" as const,
                tool_use_id: toolUse.id,
                content: JSON.stringify({ success: true, message: "Tool executed successfully" }),
              }));

            const updatedMessages: Anthropic.MessageParam[] = [
              ...currentMessages,
              { role: "assistant" as const, content: response.content },
              { role: "user" as const, content: toolResultMessages },
            ];

            await processResponse(updatedMessages);
          }
        };

        try {
          await processResponse(messages);
          sendEvent("done", { content: fullContent, tools: toolResults });
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
