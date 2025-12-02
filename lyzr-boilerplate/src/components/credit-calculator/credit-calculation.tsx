"use client";

import * as React from "react";
import { IconLoader2 } from "@tabler/icons-react";
import { CreditCalculation as CreditCalculationType } from "@/lib/types";

interface CreditCalculationProps {
  data: CreditCalculationType | null;
  isLoading: boolean;
}

export function CreditCalculation({ data, isLoading }: CreditCalculationProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${new Intl.NumberFormat("en-US").format(Math.round(value))}`;
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
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
          Credit calculation will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-foreground/80">
        <span className="font-semibold">Lyzr Agent Credits Consumption (Software Cost):</span>{" "}
        Lyzr follows a transparent model where you pay for{" "}
        <span className="font-medium">Agent Actions</span> (effort), not tokens.
      </p>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="py-2.5 px-4 text-left font-semibold">Action Profile</th>
              <th className="py-2.5 px-4 text-left font-semibold">Complexity</th>
              <th className="py-2.5 px-4 text-left font-semibold">Unit Price</th>
              <th className="py-2.5 px-4 text-left font-semibold">Total Volume</th>
              <th className="py-2.5 px-4 text-left font-semibold">Total Annual<br/>Credits Usage ($)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-3 px-4 font-medium">{data.action_profile}</td>
              <td className="py-3 px-4">{data.complexity}</td>
              <td className="py-3 px-4 font-medium">${data.unit_price.toFixed(2)}</td>
              <td className="py-3 px-4">{formatNumber(data.total_volume)}</td>
              <td className="py-3 px-4 font-bold text-primary">{formatCurrency(data.total_annual_cost)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
