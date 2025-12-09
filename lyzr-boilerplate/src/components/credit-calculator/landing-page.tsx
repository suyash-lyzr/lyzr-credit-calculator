"use client";

import * as React from "react";
import { IconSend, IconLoader2 } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { SavedTemplate } from "@/lib/types";
import mermaid from "mermaid";

interface LandingPageProps {
  onSubmit: (message: string) => void;
  isLoading: boolean;
  templates?: SavedTemplate[];
  onLoadTemplate?: (template: SavedTemplate) => void;
}

export function LandingPage({ 
  onSubmit, 
  isLoading, 
  templates = [], 
  onLoadTemplate,
}: LandingPageProps) {
  const [input, setInput] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSubmit(input.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "56px";
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = Math.min(Math.max(56, scrollHeight), 200) + "px";
    }
  };

  React.useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  return (
    <div className="w-full bg-background overflow-y-auto h-screen">
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-full max-w-4xl px-6 py-8 -mt-16">
          <div className="flex flex-col items-center text-center mb-10">
            <Image
              src="https://s3-us-west-2.amazonaws.com/cbi-image-service-prd/original/ed9b933b-bc18-4619-8e8a-e273334b8b34.png"
              alt="Lyzr"
              width={100}
              height={100}
              className="mb-4"
              unoptimized
            />
            <h1 className="text-3xl font-bold mb-2">Credit Calculator</h1>
            <p className="text-muted-foreground text-lg">
              Describe your use case and I&apos;ll help you estimate the credits &amp; ROI :)
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="relative max-w-2xl mx-auto">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your use case..."
              disabled={isLoading}
              rows={1}
              className="w-full min-h-[56px] max-h-[200px] py-4 px-4 pr-14 text-lg rounded-xl border-2 border-input bg-background focus:border-primary focus:outline-none focus:ring-0 resize-none overflow-hidden"
            />
            <Button 
              type="submit" 
              disabled={!input.trim() || isLoading} 
              size="icon"
              className="absolute right-2 top-4 h-10 w-10 rounded-lg"
            >
              {isLoading ? (
                <IconLoader2 className="h-5 w-5 animate-spin" />
              ) : (
                <IconSend className="h-5 w-5" />
              )}
            </Button>
          </form>

          <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
            <ExampleChip 
              text="Customer support ticket triage" 
              onClick={() => setInput("I want to automate customer support ticket triage for about 500 tickets per day")} 
            />
            <ExampleChip 
              text="Invoice processing" 
              onClick={() => setInput("Help me calculate costs for automating invoice processing with approval workflow")} 
            />
            <ExampleChip 
              text="Contract analysis" 
              onClick={() => setInput("I need to analyze legal contracts and extract key terms - about 50 contracts per week")} 
            />
          </div>

          <p className="mt-12 text-center text-[18px] text-muted-foreground italic max-w-2xl mx-auto">
            Lyzr follows a transparent pricing model where customers pay only for Agent Actions, not the underlying LLM or compute cost.
          </p>
        </div>
      </div>

      {templates.length > 0 && (
        <div className="w-full max-w-4xl mx-auto px-6 pb-16">
          <h3 className="text-lg font-semibold text-foreground mb-6 text-center">Common use cases</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.slice(0, 6).map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onClick={() => onLoadTemplate?.(template)}
              />
            ))}
          </div>
          {templates.length > 6 && (
            <p className="mt-4 text-xs text-muted-foreground text-center">
              Press Cmd+Shift+S to view all {templates.length} saved use cases
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ExampleChip({ text, onClick }: { text: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-2 text-sm rounded-full border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
    >
      {text}
    </button>
  );
}

function TemplateCard({ template, onClick }: { template: SavedTemplate; onClick: () => void }) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = React.useState<string>("");

  React.useEffect(() => {
    const renderDiagram = async () => {
      if (!template.architecture.mermaidCode) return;
      
      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: "neutral",
          flowchart: {
            curve: "basis",
            padding: 10,
          },
          themeVariables: {
            fontSize: "10px",
          },
        });

        const uniqueId = `mermaid-thumb-${template.id}-${Date.now()}`;
        const { svg } = await mermaid.render(uniqueId, template.architecture.mermaidCode);
        setSvgContent(svg);
      } catch (error) {
        console.error("Mermaid render error:", error);
      }
    };

    renderDiagram();
  }, [template.architecture.mermaidCode, template.id]);

  return (
    <div
      className="group relative flex flex-col rounded-xl border border-border bg-card hover:bg-muted/50 hover:border-primary/30 transition-all cursor-pointer overflow-hidden"
      onClick={onClick}
    >
      <div className="h-32 bg-muted/30 border-b border-border flex items-center justify-center overflow-hidden p-2">
        {svgContent ? (
          <div
            ref={containerRef}
            className="w-full h-full flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:h-auto"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        ) : (
          <div className="text-xs text-muted-foreground">Loading diagram...</div>
        )}
      </div>
      
      <div className="p-3">
        <h3 className="font-semibold text-sm mb-1 line-clamp-1">
          {template.name}
        </h3>
        
        {template.architecture.summary && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {template.architecture.summary}
          </p>
        )}
      </div>
    </div>
  );
}
