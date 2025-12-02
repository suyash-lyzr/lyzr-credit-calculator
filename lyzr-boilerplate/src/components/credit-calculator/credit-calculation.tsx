"use client";

import * as React from "react";
import { IconCoins, IconLoader2 } from "@tabler/icons-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CreditCalculation as CreditCalculationType } from "@/lib/types";

interface CreditCalculationProps {
  data: CreditCalculationType | null;
  isLoading: boolean;
}

export function CreditCalculation({ data, isLoading }: CreditCalculationProps) {
  const formatCurrency = (value: number, decimals: number = 2) => {
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
            <IconCoins className="h-4 w-4 text-primary" />
            Credit Calculation
          </CardTitle>
          {data && (
            <Badge variant="outline" className="text-[10px]">
              +{data.overhead_percentage}% overhead
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
              <div className="text-[10px] font-medium text-muted-foreground mb-1">Fixed Setup Costs (One-Time)</div>
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                <div className="flex justify-between">
                  <span>Agents ({data.fixed_costs.agents.count})</span>
                  <span className="font-medium">{formatCurrency(data.fixed_costs.agents.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Knowledge Base</span>
                  <span className="font-medium">{formatCurrency(data.fixed_costs.knowledge_bases.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Responsible AI</span>
                  <span className="font-medium">{formatCurrency(data.fixed_costs.responsible_ai.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tools ({data.fixed_costs.tools.count})</span>
                  <span className="font-medium">{formatCurrency(data.fixed_costs.tools.total)}</span>
                </div>
              </div>
              <div className="flex justify-between mt-1 pt-1 border-t border-border/50 text-xs font-medium">
                <span>Setup Total</span>
                <span className="text-primary">{formatCurrency(data.fixed_costs.subtotal)}</span>
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 p-2">
              <div className="text-[10px] font-medium text-muted-foreground mb-1">Variable Costs (Per Task)</div>
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                <div className="flex justify-between">
                  <span>Agent Runs ({data.variable_costs_per_run.agent_runs.count})</span>
                  <span className="font-medium">{formatCurrency(data.variable_costs_per_run.agent_runs.total, 3)}</span>
                </div>
                <div className="flex justify-between">
                  <span>KB Retrievals</span>
                  <span className="font-medium">{formatCurrency(data.variable_costs_per_run.kb_retrievals.total, 3)}</span>
                </div>
                <div className="flex justify-between">
                  <span>API Calls</span>
                  <span className="font-medium">{formatCurrency(data.variable_costs_per_run.api_calls.total, 3)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tool Executions</span>
                  <span className="font-medium">{formatCurrency(data.variable_costs_per_run.tool_executions.total, 3)}</span>
                </div>
                <div className="flex justify-between">
                  <span>RAI Checks</span>
                  <span className="font-medium">{formatCurrency(data.variable_costs_per_run.rai_checks.total, 3)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Model ({data.variable_costs_per_run.model_costs.model})</span>
                  <span className="font-medium">{formatCurrency(data.variable_costs_per_run.model_costs.total, 3)}</span>
                </div>
              </div>
              <div className="flex justify-between mt-1 pt-1 border-t border-border/50 text-xs">
                <span>Base Cost/Task</span>
                <span className="font-medium">{formatCurrency(data.cost_per_run, 3)}</span>
              </div>
              <div className="flex justify-between text-xs font-medium">
                <span>With {data.overhead_percentage}% Overhead</span>
                <span className="text-primary">{formatCurrency(data.cost_per_run_with_overhead, 3)}</span>
              </div>
            </div>

            <Separator />

            <div className="rounded-lg bg-muted/50 p-2">
              <div className="text-[10px] font-medium text-muted-foreground mb-1">
                Volume: {formatNumber(data.volume_estimates.tasks_per_day)}/day | {formatNumber(data.volume_estimates.tasks_per_month)}/month
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-primary/10 p-2 text-center">
                <p className="text-[10px] text-muted-foreground">Setup Cost</p>
                <p className="text-sm font-bold text-primary">{formatCurrency(data.total_costs.setup_cost)}</p>
              </div>
              <div className="rounded-lg bg-primary/10 p-2 text-center">
                <p className="text-[10px] text-muted-foreground">Monthly Variable</p>
                <p className="text-sm font-bold text-primary">{formatCurrency(data.total_costs.monthly_variable)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-primary/10 p-2 text-center">
                <p className="text-[10px] text-muted-foreground">Yearly Variable</p>
                <p className="text-sm font-bold text-primary">{formatCurrency(data.total_costs.yearly_variable)}</p>
              </div>
              <div className="rounded-lg bg-primary/20 p-2 text-center">
                <p className="text-[10px] text-muted-foreground">First Year Total</p>
                <p className="text-sm font-bold text-primary">{formatCurrency(data.total_costs.first_year_total)}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-center">
            <p className="text-xs text-muted-foreground">
              Credit calculation will appear here
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
