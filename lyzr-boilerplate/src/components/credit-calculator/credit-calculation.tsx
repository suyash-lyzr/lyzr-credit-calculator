"use client";

import * as React from "react";
import { IconCoins, IconLoader2 } from "@tabler/icons-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CreditCalculation as CreditCalculationType } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CreditCalculationProps {
  data: CreditCalculationType | null;
  isLoading: boolean;
}

export function CreditCalculation({ data, isLoading }: CreditCalculationProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  return (
    <Card className="flex-1 overflow-hidden border-0 shadow-none bg-transparent">
      <CardHeader className="py-2 px-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <IconCoins className="h-4 w-4 text-primary" />
          Credit Calculation
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2 h-[calc(100%-48px)] overflow-auto">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <IconLoader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : data ? (
          <div className="space-y-2">
            <div className="rounded-lg bg-muted/50 p-2">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="text-left font-medium py-1">Component</th>
                    <th className="text-right font-medium py-1">Qty</th>
                    <th className="text-right font-medium py-1">Unit</th>
                    <th className="text-right font-medium py-1">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.lineItems.map((item) => (
                    <tr key={item.id} className="border-t border-border/50">
                      <td className="py-1">
                        <div className="font-medium">{item.component}</div>
                        <div className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                          {item.description}
                        </div>
                      </td>
                      <td className="text-right py-1">{item.quantity}</td>
                      <td className="text-right py-1">{formatCurrency(item.unitCost)}</td>
                      <td className="text-right py-1 font-medium">{formatCurrency(item.totalCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Separator />

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-primary/10 p-2 text-center">
                <p className="text-[10px] text-muted-foreground">Per Run</p>
                <p className="text-sm font-bold text-primary">{formatCurrency(data.subtotal)}</p>
              </div>
              <div className="rounded-lg bg-primary/10 p-2 text-center">
                <p className="text-[10px] text-muted-foreground">Monthly Est.</p>
                <p className="text-sm font-bold text-primary">{formatCurrency(data.monthlyEstimate)}</p>
              </div>
              <div className="rounded-lg bg-primary/10 p-2 text-center">
                <p className="text-[10px] text-muted-foreground">Yearly Est.</p>
                <p className="text-sm font-bold text-primary">{formatCurrency(data.yearlyEstimate)}</p>
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
