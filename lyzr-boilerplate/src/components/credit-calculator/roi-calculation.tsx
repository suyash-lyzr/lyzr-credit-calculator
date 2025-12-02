"use client";

import * as React from "react";
import { IconTrendingUp, IconLoader2, IconArrowUp } from "@tabler/icons-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ROICalculation as ROICalculationType } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ROICalculationProps {
  data: ROICalculationType | null;
  isLoading: boolean;
}

export function ROICalculation({ data, isLoading }: ROICalculationProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className="flex-1 overflow-hidden border-0 shadow-none bg-transparent">
      <CardHeader className="py-2 px-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <IconTrendingUp className="h-4 w-4 text-primary" />
          ROI vs. Human Cost
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2 h-[calc(100%-48px)] overflow-auto">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <IconLoader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : data ? (
          <div className="space-y-2">
            <div className="space-y-2">
              {data.metrics.map((metric) => (
                <div key={metric.id} className="rounded-lg bg-muted/50 p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium">{metric.label}</span>
                    <span className="flex items-center gap-1 text-xs text-green-600">
                      <IconArrowUp className="h-3 w-3" />
                      {metric.savingsPercentage.toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>Human: {metric.humanValue} {metric.unit}</span>
                    <span>→</span>
                    <span className="text-primary font-medium">
                      Auto: {metric.automatedValue} {metric.unit}
                    </span>
                  </div>
                  <Progress value={metric.savingsPercentage} className="h-1 mt-1" />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-green-500/10 p-2 text-center">
                <p className="text-[10px] text-muted-foreground">Monthly Savings</p>
                <p className="text-sm font-bold text-green-600">
                  {formatCurrency(data.totalMonthlySavings)}
                </p>
              </div>
              <div className="rounded-lg bg-green-500/10 p-2 text-center">
                <p className="text-[10px] text-muted-foreground">Yearly Savings</p>
                <p className="text-sm font-bold text-green-600">
                  {formatCurrency(data.totalYearlySavings)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-primary/10 p-2 text-center">
                <p className="text-[10px] text-muted-foreground">Payback Period</p>
                <p className="text-sm font-bold text-primary">
                  {data.paybackPeriodMonths.toFixed(1)} months
                </p>
              </div>
              <div className="rounded-lg bg-primary/10 p-2 text-center">
                <p className="text-[10px] text-muted-foreground">ROI</p>
                <p className="text-sm font-bold text-primary">
                  {data.roiPercentage.toFixed(0)}%
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-center">
            <p className="text-xs text-muted-foreground">
              ROI calculation will appear here
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
