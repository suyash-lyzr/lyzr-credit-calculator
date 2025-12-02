"use client";

import * as React from "react";
import { IconSchema, IconLoader2 } from "@tabler/icons-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArchitectureData } from "@/lib/types";
import mermaid from "mermaid";

interface ArchitectureDiagramProps {
  data: ArchitectureData | null;
  isLoading: boolean;
}

const complexityColors = {
  LOW: "bg-green-100 text-green-700 border-green-300",
  MEDIUM: "bg-yellow-100 text-yellow-700 border-yellow-300",
  HIGH: "bg-red-100 text-red-700 border-red-300",
};

export function ArchitectureDiagram({ data, isLoading }: ArchitectureDiagramProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = React.useState<string>("");

  React.useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: "base",
      themeVariables: {
        primaryColor: "#603BFC",
        primaryTextColor: "#fff",
        primaryBorderColor: "#A94FA1",
        lineColor: "#A94FA1",
        secondaryColor: "#f0f0f0",
        tertiaryColor: "#fff",
        fontSize: "11px",
      },
      flowchart: {
        curve: "basis",
        padding: 8,
        nodeSpacing: 30,
        rankSpacing: 30,
      },
    });
  }, []);

  React.useEffect(() => {
    if (data?.mermaidCode && containerRef.current) {
      const renderDiagram = async () => {
        try {
          const id = `mermaid-${Date.now()}`;
          const { svg } = await mermaid.render(id, data.mermaidCode);
          setSvgContent(svg);
        } catch (error) {
          console.error("Mermaid rendering error:", error);
          setSvgContent("");
        }
      };
      renderDiagram();
    }
  }, [data?.mermaidCode]);

  return (
    <Card className="flex-1 overflow-hidden border-0 shadow-none bg-transparent">
      <CardHeader className="py-2 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <IconSchema className="h-4 w-4 text-primary" />
            Agent Architecture
          </CardTitle>
          {data && (
            <Badge variant="outline" className={`text-[10px] ${complexityColors[data.complexity_profile]}`}>
              {data.complexity_profile} Complexity
            </Badge>
          )}
        </div>
        {data && (
          <div className="mt-1 flex gap-2 text-[10px] text-muted-foreground">
            <span>Pattern: {data.architecture_pattern}</span>
            <span>|</span>
            <span>KB: {data.connection_analysis.knowledge_bases}</span>
            <span>DC: {data.connection_analysis.data_connectors}</span>
            <span>Tools: {data.connection_analysis.tools}</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-2 h-[calc(100%-60px)]">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <IconLoader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : data ? (
          <div className="flex flex-col h-full">
            <div className="text-[10px] text-muted-foreground mb-1 px-1">
              {data.title}: {data.summary}
            </div>
            <div
              ref={containerRef}
              className="flex flex-1 items-center justify-center overflow-hidden [&_svg]:max-w-full [&_svg]:max-h-full [&_svg]:w-auto [&_svg]:h-auto"
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-center">
            <p className="text-xs text-muted-foreground">
              Architecture diagram will appear here
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
