"use client";

import * as React from "react";
import { ArchitectureDiagram } from "./architecture-diagram";
import { CreditCalculation } from "./credit-calculation";
import { ROICalculation } from "./roi-calculation";
import { ReviewValidation } from "./review-validation";
import { ArtifactState } from "@/lib/types";
import { IconBrain, IconCoins, IconChartBar, IconShieldCheck, IconLoader2, IconCheck } from "@tabler/icons-react";

interface ArtifactPanelProps {
  artifactState: ArtifactState;
}

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  stepNumber: number;
  isLoading: boolean;
  isComplete: boolean;
}

function SectionHeader({ icon, title, stepNumber, isLoading, isComplete, badge }: SectionHeaderProps & { badge?: string }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        <div className={`flex items-center justify-center w-6 h-6 rounded-full ${
          isComplete ? 'bg-green-100 text-green-600' : 
          isLoading ? 'bg-primary/10 text-primary' : 
          'bg-muted text-muted-foreground'
        }`}>
          {isLoading ? (
            <IconLoader2 className="h-3 w-3 animate-spin" />
          ) : isComplete ? (
            <IconCheck className="h-3 w-3" />
          ) : (
            <span className="text-xs font-medium">{stepNumber}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {icon}
          <h3 className="font-semibold text-base">{title}</h3>
        </div>
      </div>
      {badge && (
        <span className="text-xs text-muted-foreground italic">{badge}</span>
      )}
    </div>
  );
}

function LoadingPlaceholder({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-8 bg-muted/30 rounded-lg border border-dashed">
      <div className="text-center">
        <IconLoader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
        <p className="text-xs text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

export function ArtifactPanel({ artifactState }: ArtifactPanelProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const hasAnyData =
    artifactState.architecture ||
    artifactState.credits ||
    artifactState.roi ||
    artifactState.review ||
    artifactState.isLoading.architecture ||
    artifactState.isLoading.credits ||
    artifactState.isLoading.roi ||
    artifactState.isLoading.review;

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [artifactState.architecture, artifactState.credits, artifactState.roi, artifactState.review,
      artifactState.isLoading.architecture, artifactState.isLoading.credits, artifactState.isLoading.roi, artifactState.isLoading.review]);

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
              Your agent architecture, credit costs, ROI, and review will appear here
            </p>
          </div>
        </div>
      ) : (
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {(artifactState.isLoading.architecture || artifactState.architecture) && (
            <section className="pb-3 border-b">
              <SectionHeader
                icon={<IconBrain className="h-4 w-4 text-primary" />}
                title="Agent Architecture"
                stepNumber={1}
                isLoading={artifactState.isLoading.architecture}
                isComplete={!!artifactState.architecture}
                badge="Powered by Lyzr's Architect"
              />
              <div className="h-[320px] max-h-[45vh]">
                {artifactState.isLoading.architecture && !artifactState.architecture ? (
                  <LoadingPlaceholder message="Analyzing requirements and designing architecture..." />
                ) : (
                  <ArchitectureDiagram
                    data={artifactState.architecture}
                    isLoading={false}
                  />
                )}
              </div>
            </section>
          )}

          {(artifactState.isLoading.credits || artifactState.credits) && (
            <section className="pb-3 border-b">
              <SectionHeader
                icon={<IconCalculator className="h-4 w-4 text-primary" />}
                title="Credit Calculation"
                stepNumber={2}
                isLoading={artifactState.isLoading.credits}
                isComplete={!!artifactState.credits}
              />
              {artifactState.isLoading.credits && !artifactState.credits ? (
                <LoadingPlaceholder message="Calculating credit costs..." />
              ) : (
                <CreditCalculation
                  data={artifactState.credits}
                  isLoading={false}
                />
              )}
            </section>
          )}

          {(artifactState.isLoading.roi || artifactState.roi) && (
            <section className="pb-3 border-b">
              <SectionHeader
                icon={<IconChartBar className="h-4 w-4 text-primary" />}
                title="ROI Analysis"
                stepNumber={3}
                isLoading={artifactState.isLoading.roi}
                isComplete={!!artifactState.roi}
              />
              {artifactState.isLoading.roi && !artifactState.roi ? (
                <LoadingPlaceholder message="Comparing AI costs vs human labor..." />
              ) : (
                <ROICalculation
                  data={artifactState.roi}
                  isLoading={false}
                />
              )}
            </section>
          )}

          {(artifactState.isLoading.review || artifactState.review) && (
            <section>
              <SectionHeader
                icon={<IconShieldCheck className="h-4 w-4 text-primary" />}
                title="Review & Validation"
                stepNumber={4}
                isLoading={artifactState.isLoading.review}
                isComplete={!!artifactState.review}
              />
              {artifactState.isLoading.review && !artifactState.review ? (
                <LoadingPlaceholder message="Reviewing and validating calculations..." />
              ) : (
                <ReviewValidation
                  data={artifactState.review}
                  isLoading={false}
                />
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}