"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { IconTrash, IconCpu, IconChartBar } from "@tabler/icons-react";
import { SavedTemplate } from "@/lib/types";

interface TemplateManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: SavedTemplate[];
  onLoadTemplate: (template: SavedTemplate) => void;
  onDeleteTemplate: (templateId: number) => void;
}

export function TemplateManagerModal({
  isOpen,
  onClose,
  templates,
  onLoadTemplate,
  onDeleteTemplate,
}: TemplateManagerModalProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const handleLoadTemplate = (template: SavedTemplate) => {
    onLoadTemplate(template);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconCpu className="h-5 w-5 text-primary" />
            Saved Estimations
          </DialogTitle>
        </DialogHeader>

        {templates.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <IconCpu className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No saved estimations yet</p>
            <p className="text-sm mt-1">
              Run a calculation and press Cmd+Shift+S to save it
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {templates.map((template) => (
              <div
                key={template.id}
                className="group relative flex flex-col p-4 rounded-xl border border-border bg-card hover:bg-muted/50 hover:border-primary/30 transition-all cursor-pointer"
                onClick={() => handleLoadTemplate(template)}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    template.architecture.complexity_profile === 'LOW' 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : template.architecture.complexity_profile === 'MEDIUM'
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {template.architecture.complexity_profile}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteTemplate(template.id);
                    }}
                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete template"
                  >
                    <IconTrash className="h-4 w-4" />
                  </button>
                </div>

                <h3 className="font-semibold text-sm mb-1 line-clamp-1">
                  {template.name}
                </h3>
                
                {template.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                    {template.description}
                  </p>
                )}

                <div className="mt-auto pt-3 border-t border-border/50">
                  <div className="text-xs text-muted-foreground mb-2 font-mono line-clamp-1">
                    {template.architecture.architecture_pattern} | {template.architecture.architecture_counts.n_agents} Agent{template.architecture.architecture_counts.n_agents !== 1 ? 's' : ''}
                    {template.architecture.architecture_counts.n_kb > 0 && ` | KB`}
                    {template.architecture.architecture_counts.n_tools > 0 && ` | ${template.architecture.architecture_counts.n_tools} Tools`}
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <IconChartBar className="h-3.5 w-3.5" />
                      <span>{formatCurrency(template.credits.combined_total || template.credits.total_annual_cost)}/yr</span>
                    </div>
                    <div className="text-green-600 dark:text-green-400 font-semibold">
                      {template.roi.comparison.savings_percentage.toFixed(0)}% savings
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 pt-4 border-t flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
