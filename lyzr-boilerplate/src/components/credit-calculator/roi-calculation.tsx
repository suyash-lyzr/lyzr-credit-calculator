"use client";

import * as React from "react";
import { IconLoader2 } from "@tabler/icons-react";
import { ROICalculation as ROICalculationType } from "@/lib/types";

interface ROICalculationProps {
  data: ROICalculationType | null;
  isLoading: boolean;
}

export function ROICalculation({ data, isLoading }: ROICalculationProps) {
  const formatCurrency = (value: number, decimals: number = 0) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}k`;
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("en-US").format(value);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <IconLoader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-8 text-center">
        <p className="text-sm text-muted-foreground">
          ROI calculation will appear here
        </p>
      </div>
    );
  }

  const yearlyVolume = data.volume_estimates.units_per_month * 12;
  const humanYearlyCost = data.human_analysis.cost_per_unit * yearlyVolume;
  const aiYearlyCost = data.ai_analysis.cost_per_unit * yearlyVolume;
  const netSavings = humanYearlyCost - aiYearlyCost;
  const savingsPercentage = ((netSavings / humanYearlyCost) * 100).toFixed(1);

  return (
    <div className="space-y-4">
      <p className="text-sm text-foreground/80">
        <span className="font-semibold">ROI Analysis: AI vs. Human Execution</span>{" "}
        Comparison based on a standard {data.human_analysis.mapped_role} rate of{" "}
        <span className="font-medium">${data.human_analysis.fully_loaded_rate.toFixed(0)}/hr</span> taking{" "}
        <span className="font-medium">{data.human_analysis.time_per_task_minutes} minutes</span> per {data.unit_name}.
      </p>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="py-2.5 px-4 text-left font-semibold">Metric</th>
              <th className="py-2.5 px-4 text-left font-semibold">Human Manual Process</th>
              <th className="py-2.5 px-4 text-left font-semibold">Lyzr Agent Architecture</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr>
              <td className="py-2.5 px-4 font-medium">Time Per {data.unit_name}</td>
              <td className="py-2.5 px-4">{data.human_analysis.time_per_task_minutes} Minutes</td>
              <td className="py-2.5 px-4">
                {"< "}{Math.ceil(data.ai_analysis.time_per_task_seconds / 60)} Minute{data.ai_analysis.time_per_task_seconds > 60 ? "s" : ""}{" "}
                <span className="text-muted-foreground">(Parallel)</span>
              </td>
            </tr>
            <tr>
              <td className="py-2.5 px-4 font-medium">Unit Cost</td>
              <td className="py-2.5 px-4">${data.human_analysis.cost_per_unit.toFixed(2)} / {data.unit_name}</td>
              <td className="py-2.5 px-4">
                <span className="font-medium">${data.ai_analysis.cost_per_unit.toFixed(2)} / {data.unit_name}</span>{" "}
                <span className="text-muted-foreground">(Lyzr + Infra)</span>
              </td>
            </tr>
            <tr>
              <td className="py-2.5 px-4 font-medium">Total Year 1 Cost</td>
              <td className="py-2.5 px-4">{formatCurrency(humanYearlyCost)}</td>
              <td className="py-2.5 px-4">{formatCurrency(aiYearlyCost)}</td>
            </tr>
            <tr className="bg-muted/30">
              <td className="py-2.5 px-4 font-semibold">Net Savings</td>
              <td className="py-2.5 px-4">–</td>
              <td className="py-2.5 px-4 font-semibold text-green-600">
                {formatCurrency(netSavings)} ({savingsPercentage}%)
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-sm">
        <span className="font-semibold">The Bottom Line:</span> For a total investment of ~{formatCurrency(aiYearlyCost)} (Software + Compute), 
        you replace {formatCurrency(humanYearlyCost)} in manual labor, ensuring instant scalability and a persistent 
        Knowledge Graph of your {data.use_case.toLowerCase()} data.
      </p>
    </div>
  );
}
