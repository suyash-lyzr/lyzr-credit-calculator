"use client";

import * as React from "react";
import { IconTrendingUp, IconLoader2, IconArrowUp, IconClock, IconUser, IconRobot } from "@tabler/icons-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ROICalculation as ROICalculationType } from "@/lib/types";

interface ROICalculationProps {
  data: ROICalculationType | null;
  isLoading: boolean;
}

export function ROICalculation({ data, isLoading }: ROICalculationProps) {
  const formatCurrency = (value: number, decimals: number = 0) => {
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

  return (
    <Card className="flex-1 overflow-hidden border-0 shadow-none bg-transparent">
      <CardHeader className="py-2 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <IconTrendingUp className="h-4 w-4 text-primary" />
            ROI vs. Manual Process
          </CardTitle>
          {data && (
            <Badge variant="outline" className="text-[10px] bg-green-100 text-green-700 border-green-300">
              {data.roi_percentage.toFixed(0)}% ROI
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-2 h-[calc(100%-48px)] overflow-auto">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <IconLoader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : data ? (
          <div className="space-y-3">
            <div className="rounded-lg bg-muted/50 p-2">
              <div className="text-[10px] font-medium text-muted-foreground mb-1">Manual Process Analysis</div>
              <div className="space-y-1 text-[10px]">
                <div className="flex items-center gap-1">
                  <IconUser className="h-3 w-3" />
                  <span className="font-medium">{data.human_analysis.mapped_role}</span>
                </div>
                <div className="flex justify-between">
                  <span>Base Hourly Rate</span>
                  <span>{formatCurrency(data.human_analysis.base_hourly_wage, 2)}/hr</span>
                </div>
                <div className="flex justify-between">
                  <span>Fully Loaded (w/ 30% overhead)</span>
                  <span className="font-medium">{formatCurrency(data.human_analysis.fully_loaded_rate, 2)}/hr</span>
                </div>
                <div className="flex justify-between">
                  <span>Time per {data.unit_name}</span>
                  <span>{data.human_analysis.time_per_task_minutes} mins</span>
                </div>
                <div className="flex justify-between font-medium pt-1 border-t border-border/50">
                  <span>Cost per {data.unit_name}</span>
                  <span className="text-orange-600">{formatCurrency(data.human_analysis.cost_per_unit, 2)}</span>
                </div>
              </div>
              <div className="text-[9px] text-muted-foreground mt-1">
                Source: {data.human_analysis.wage_source}
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 p-2">
              <div className="text-[10px] font-medium text-muted-foreground mb-1">AI Automation</div>
              <div className="space-y-1 text-[10px]">
                <div className="flex items-center gap-1">
                  <IconRobot className="h-3 w-3" />
                  <span className="font-medium">Lyzr AI Agent</span>
                </div>
                <div className="flex justify-between">
                  <span>Processing Time</span>
                  <span>{data.ai_analysis.time_per_task_seconds} seconds</span>
                </div>
                <div className="flex justify-between font-medium pt-1 border-t border-border/50">
                  <span>Cost per {data.unit_name}</span>
                  <span className="text-primary">{formatCurrency(data.ai_analysis.cost_per_unit, 3)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-green-50 p-2 border border-green-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-medium">Cost Savings</span>
                <span className="flex items-center gap-1 text-xs text-green-600 font-bold">
                  <IconArrowUp className="h-3 w-3" />
                  {data.comparison.savings_percentage.toFixed(0)}%
                </span>
              </div>
              <Progress value={Math.min(data.comparison.savings_percentage, 100)} className="h-2" />
              <div className="flex justify-between text-[10px] mt-1">
                <span className="text-muted-foreground">Time Savings</span>
                <span className="text-green-600 font-medium">{data.comparison.time_savings_percentage.toFixed(0)}%</span>
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 p-2">
              <div className="text-[10px] font-medium text-muted-foreground mb-1">
                Volume: {formatNumber(data.volume_estimates.units_per_month)} {data.unit_name}s/month
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-green-500/10 p-2 text-center">
                <p className="text-[10px] text-muted-foreground">Monthly Savings</p>
                <p className="text-sm font-bold text-green-600">
                  {formatCurrency(data.comparison.monthly_savings)}
                </p>
              </div>
              <div className="rounded-lg bg-green-500/10 p-2 text-center">
                <p className="text-[10px] text-muted-foreground">Yearly Savings</p>
                <p className="text-sm font-bold text-green-600">
                  {formatCurrency(data.comparison.yearly_savings)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-primary/10 p-2 text-center">
                <p className="text-[10px] text-muted-foreground">Payback Period</p>
                <p className="text-sm font-bold text-primary">
                  {data.comparison.payback_period_days < 30 
                    ? `${data.comparison.payback_period_days.toFixed(0)} days`
                    : `${(data.comparison.payback_period_days / 30).toFixed(1)} months`
                  }
                </p>
              </div>
              <div className="rounded-lg bg-primary/10 p-2 text-center">
                <p className="text-[10px] text-muted-foreground">Annual ROI</p>
                <p className="text-sm font-bold text-primary">
                  {data.roi_percentage.toFixed(0)}%
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
