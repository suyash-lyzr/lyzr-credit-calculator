"use client";

import * as React from "react";
import { IconSchema, IconLoader2 } from "@tabler/icons-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArchitectureData } from "@/lib/types";
import mermaid from "mermaid";

interface ArchitectureDiagramProps {
  data: ArchitectureData | null;
  isLoading: boolean;
}

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
        fontSize: "12px",
      },
      flowchart: {
        curve: "basis",
        padding: 10,
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
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <IconSchema className="h-4 w-4 text-primary" />
          Agent Architecture
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2 h-[calc(100%-48px)]">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <IconLoader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : data ? (
          <div
            ref={containerRef}
            className="flex h-full items-center justify-center overflow-hidden"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
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
