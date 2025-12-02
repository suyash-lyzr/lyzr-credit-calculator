"use client";

import * as React from "react";
import { IconSend, IconLoader2 } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";

interface LandingPageProps {
  onSubmit: (message: string) => void;
  isLoading: boolean;
}

export function LandingPage({ onSubmit, isLoading }: LandingPageProps) {
  const [input, setInput] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSubmit(input.trim());
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="w-full max-w-2xl px-6">
        <div className="flex flex-col items-center text-center mb-12">
          <Image
            src="https://s3-us-west-2.amazonaws.com/cbi-image-service-prd/original/ed9b933b-bc18-4619-8e8a-e273334b8b34.png"
            alt="Lyzr"
            width={120}
            height={120}
            className="mb-6"
            unoptimized
          />
          <h1 className="text-3xl font-bold mb-3">Credit Calculator</h1>
          <p className="text-muted-foreground text-lg">
            Describe your use case and I&apos;ll calculate the credits and ROI
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="relative">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your use case..."
            disabled={isLoading}
            className="w-full h-14 pr-14 text-lg rounded-xl border-2 focus:border-primary"
          />
          <Button 
            type="submit" 
            disabled={!input.trim() || isLoading} 
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-lg"
          >
            {isLoading ? (
              <IconLoader2 className="h-5 w-5 animate-spin" />
            ) : (
              <IconSend className="h-5 w-5" />
            )}
          </Button>
        </form>

        <div className="mt-8 flex flex-wrap justify-center gap-2">
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
