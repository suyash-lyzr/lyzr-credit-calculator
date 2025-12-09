"use client";

import * as React from "react";
import { IconSend, IconLoader2, IconChartBar, IconCpu } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { SavedTemplate } from "@/lib/types";

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

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background overflow-y-auto">
      <div className="w-full max-w-4xl px-6 py-8 -mt-8">
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

        {templates.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center gap-2 mb-4">
              <IconCpu className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Saved Estimations</h3>
              <span className="text-xs text-muted-foreground">({templates.length})</span>
              <span className="ml-auto text-xs text-muted-foreground">
                Press Cmd+Shift+S to manage
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.slice(0, 6).map((template) => (
                <div
                  key={template.id}
                  className="group relative flex flex-col p-4 rounded-xl border border-border bg-card hover:bg-muted/50 hover:border-primary/30 transition-all cursor-pointer"
                  onClick={() => onLoadTemplate?.(template)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      template.architecture.complexity_profile === 'LOW' 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : template.architecture.complexity_profile === 'MEDIUM'
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {template.architecture.complexity_profile}
                    </span>
                  </div>

                  <h3 className="font-semibold text-sm mb-1 line-clamp-1">
                    {template.name}
                  </h3>
                  
                  {template.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                      {template.description}
                    </p>
                  )}

                  <div className="mt-auto pt-3 border-t border-border/50">
                    <div className="text-xs text-muted-foreground mb-2 font-mono line-clamp-1">
                      {template.architecture.architecture_pattern} | {template.architecture.architecture_counts.n_agents} Agent{template.architecture.architecture_counts.n_agents !== 1 ? 's' : ''}
                      {template.architecture.architecture_counts.n_kb > 0 && ` | KB`}
                      {template.architecture.architecture_counts.n_tools > 0 && ` | ${template.architecture.architecture_counts.n_tools} Tools`}
                    </div>
                    
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <IconChartBar className="h-3.5 w-3.5" />
                        <span>{formatCurrency(template.credits.combined_total || template.credits.total_annual_cost)}/yr</span>
                      </div>
                      <div className="text-green-600 dark:text-green-400 font-semibold">
                        {template.roi.comparison.savings_percentage.toFixed(0)}% savings
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {templates.length > 6 && (
              <p className="mt-3 text-xs text-muted-foreground text-center">
                Press Cmd+Shift+S to view all {templates.length} saved estimations
              </p>
            )}
          </div>
        )}

        <p className="mt-12 text-center text-[18px] text-muted-foreground italic max-w-2xl mx-auto">
          Lyzr follows a transparent pricing model where customers pay only for Agent Actions, not the underlying LLM or compute cost.
        </p>
      </div>
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
