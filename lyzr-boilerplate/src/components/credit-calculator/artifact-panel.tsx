"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArchitectureDiagram } from "./architecture-diagram";
import { CreditCalculation } from "./credit-calculation";
import { ROICalculation } from "./roi-calculation";
import { ArtifactState } from "@/lib/types";

interface ArtifactPanelProps {
  artifactState: ArtifactState;
}

export function ArtifactPanel({ artifactState }: ArtifactPanelProps) {
  const hasAnyData =
    artifactState.architecture ||
    artifactState.credits ||
    artifactState.roi ||
    artifactState.isLoading.architecture ||
    artifactState.isLoading.credits ||
    artifactState.isLoading.roi;

  return (
    <div className="flex h-full flex-col bg-muted/30 rounded-xl border">
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
        <div className="flex h-full flex-col p-2 gap-2">
          <div className="flex-1 min-h-0">
            <ArchitectureDiagram
              data={artifactState.architecture}
              isLoading={artifactState.isLoading.architecture}
            />
          </div>
          <Separator />
          <div className="flex-1 min-h-0">
            <CreditCalculation
              data={artifactState.credits}
              isLoading={artifactState.isLoading.credits}
            />
          </div>
          <Separator />
          <div className="flex-1 min-h-0">
            <ROICalculation
              data={artifactState.roi}
              isLoading={artifactState.isLoading.roi}
            />
          </div>
        </div>
      )}
    </div>
  );
}
