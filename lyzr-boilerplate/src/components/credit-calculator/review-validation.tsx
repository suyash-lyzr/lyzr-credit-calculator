
"use client";

import * as React from "react";
import { IconLoader2, IconCircleCheck, IconAlertTriangle } from "@tabler/icons-react";
import { ReviewValidation as ReviewValidationType } from "@/lib/types";

interface ReviewValidationProps {
  data: ReviewValidationType | null;
  isLoading: boolean;
}

export function ReviewValidation({ data, isLoading }: ReviewValidationProps) {
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
          Quality review will appear here
        </p>
      </div>
    );
  }

  const isApproved = data.status === "approved";

  return (
    <div className="space-y-4">
      <div className={`flex items-start gap-3 p-4 rounded-lg border ${
        isApproved 
          ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900" 
          : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900"
      }`}>
        {isApproved ? (
          <IconCircleCheck className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
        ) : (
          <IconAlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
        )}
        <div className="flex-1">
          <h4 className={`text-sm font-semibold mb-1 ${
            isApproved ? "text-green-900 dark:text-green-100" : "text-amber-900 dark:text-amber-100"
          }`}>
            {isApproved ? "✓ Calculations Approved" : "⚠ Revisions Needed"}
          </h4>
          <p className={`text-sm ${
            isApproved ? "text-green-700 dark:text-green-300" : "text-amber-700 dark:text-amber-300"
          }`}>
            {data.summary}
          </p>
        </div>
      </div>

      {!isApproved && data.issues.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">
            Issues Found
          </h5>
          {data.issues.map((issue, index) => (
            <div key={index} className="p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-start gap-2 mb-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  issue.severity === "critical" 
                    ? "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300" 
                    : "bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300"
                }`}>
                  {issue.severity}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  {issue.artifact}
                </span>
              </div>
              <p className="text-sm text-foreground/80 mb-1">
                <span className="font-medium">Issue:</span> {issue.issue}
              </p>
              <p className="text-sm text-foreground/60">
                <span className="font-medium">Expected:</span> {issue.expected}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
