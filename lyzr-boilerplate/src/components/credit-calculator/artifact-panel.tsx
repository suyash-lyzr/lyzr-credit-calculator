"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArchitectureDiagram } from "./architecture-diagram";
import { CreditCalculation } from "./credit-calculation";
import { ROICalculation } from "./roi-calculation";
import { ArtifactState } from "@/lib/types";
import { IconBrain, IconCalculator, IconChartBar, IconLoader2 } from "@tabler/icons-react";

interface ArtifactPanelProps {
  artifactState: ArtifactState;
}

export function ArtifactPanel({ artifactState }: ArtifactPanelProps) {
  const [activeTab, setActiveTab] = React.useState("architecture");

  const hasAnyData =
    artifactState.architecture ||
    artifactState.credits ||
    artifactState.roi ||
    artifactState.isLoading.architecture ||
    artifactState.isLoading.credits ||
    artifactState.isLoading.roi;

  React.useEffect(() => {
    if (artifactState.isLoading.architecture || artifactState.architecture) {
      setActiveTab("architecture");
    }
    if (artifactState.isLoading.credits || artifactState.credits) {
      setActiveTab("credits");
    }
    if (artifactState.isLoading.roi || artifactState.roi) {
      setActiveTab("roi");
    }
  }, [artifactState.isLoading.architecture, artifactState.isLoading.credits, artifactState.isLoading.roi, artifactState.architecture, artifactState.credits, artifactState.roi]);

  const getTabIcon = (tab: string, isLoading: boolean, hasData: boolean) => {
    if (isLoading) {
      return <IconLoader2 className="h-4 w-4 animate-spin" />;
    }
    
    const iconClass = `h-4 w-4 ${hasData ? 'text-green-600' : 'text-muted-foreground'}`;
    
    switch (tab) {
      case "architecture":
        return <IconBrain className={iconClass} />;
      case "credits":
        return <IconCalculator className={iconClass} />;
      case "roi":
        return <IconChartBar className={iconClass} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-full flex-col bg-muted/30 rounded-xl border overflow-hidden">
      {!hasAnyData ? (
        <div className="flex h-full items-center justify-center p-8">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <svg
                className="h-6 w-6 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-sm font-medium">Calculation Results</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Your agent architecture, credit costs, and ROI will appear here
            </p>
          </div>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
          <div className="border-b px-4 pt-2">
            <TabsList className="w-full justify-start gap-1 bg-transparent p-0">
              <TabsTrigger 
                value="architecture" 
                className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary"
              >
                {getTabIcon("architecture", artifactState.isLoading.architecture, !!artifactState.architecture)}
                <span>Architecture</span>
              </TabsTrigger>
              <TabsTrigger 
                value="credits"
                className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary"
              >
                {getTabIcon("credits", artifactState.isLoading.credits, !!artifactState.credits)}
                <span>Credits</span>
              </TabsTrigger>
              <TabsTrigger 
                value="roi"
                className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary"
              >
                {getTabIcon("roi", artifactState.isLoading.roi, !!artifactState.roi)}
                <span>ROI</span>
              </TabsTrigger>
            </TabsList>
          </div>
          
          <div className="flex-1 overflow-auto p-4">
            <TabsContent value="architecture" className="mt-0 h-full">
              <ArchitectureDiagram
                data={artifactState.architecture}
                isLoading={artifactState.isLoading.architecture}
              />
            </TabsContent>
            
            <TabsContent value="credits" className="mt-0 h-full">
              <CreditCalculation
                data={artifactState.credits}
                isLoading={artifactState.isLoading.credits}
              />
            </TabsContent>
            
            <TabsContent value="roi" className="mt-0 h-full">
              <ROICalculation
                data={artifactState.roi}
                isLoading={artifactState.isLoading.roi}
              />
            </TabsContent>
          </div>
        </Tabs>
      )}
    </div>
  );
}
