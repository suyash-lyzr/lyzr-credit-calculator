"use client";

import * as React from "react";
import { IconSchema, IconLoader2, IconZoomIn, IconZoomOut, IconFocus2 } from "@tabler/icons-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArchitectureData } from "@/lib/types";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
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
        fontSize: "12px",
      },
      flowchart: {
        curve: "basis",
        padding: 15,
        nodeSpacing: 40,
        rankSpacing: 40,
      },
    });
  }, []);

  React.useEffect(() => {
    if (data?.mermaidCode) {
      console.log("[Mermaid] Attempting to render diagram:", data.mermaidCode.substring(0, 100) + "...");
      const renderDiagram = async () => {
        try {
          const id = `mermaid-${Date.now()}`;
          const cleanCode = data.mermaidCode
            .replace(/```mermaid\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();
          console.log("[Mermaid] Clean code:", cleanCode.substring(0, 100) + "...");
          const { svg } = await mermaid.render(id, cleanCode);
          console.log("[Mermaid] Render successful, SVG length:", svg.length);
          setSvgContent(svg);
        } catch (error) {
          console.error("[Mermaid] Rendering error:", error);
          console.error("[Mermaid] Failed code:", data.mermaidCode);
          setSvgContent(`<div class="text-red-500 p-4 text-center">
            <p class="font-medium">Diagram rendering failed</p>
            <p class="text-xs mt-1">Please try again</p>
          </div>`);
        }
      };
      renderDiagram();
    }
  }, [data?.mermaidCode]);

  return (
    <Card className="flex flex-col h-full overflow-hidden border-0 shadow-none bg-transparent">
      <CardHeader className="py-2 px-3 shrink-0">
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
      <CardContent className="p-2 flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <IconLoader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : data && svgContent ? (
          <div className="flex flex-col h-full">
            <div className="text-[11px] text-muted-foreground mb-2 px-1">
              <strong>{data.title}:</strong> {data.summary}
            </div>
            <div className="flex-1 relative border rounded-lg bg-white overflow-hidden" ref={containerRef}>
              <TransformWrapper
                initialScale={0.8}
                minScale={0.3}
                maxScale={3}
                centerOnInit={true}
                wheel={{ step: 0.1 }}
                panning={{ velocityDisabled: true }}
              >
                {({ zoomIn, zoomOut, resetTransform }) => (
                  <>
                    <div className="absolute top-2 right-2 z-10 flex gap-1">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-7 w-7 bg-white/90 hover:bg-white shadow-sm"
                        onClick={() => zoomIn()}
                        title="Zoom In"
                      >
                        <IconZoomIn className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-7 w-7 bg-white/90 hover:bg-white shadow-sm"
                        onClick={() => zoomOut()}
                        title="Zoom Out"
                      >
                        <IconZoomOut className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-7 w-7 bg-white/90 hover:bg-white shadow-sm"
                        onClick={() => resetTransform()}
                        title="Reset View"
                      >
                        <IconFocus2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <TransformComponent
                      wrapperStyle={{
                        width: "100%",
                        height: "100%",
                      }}
                      contentStyle={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <div
                        className="[&_svg]:max-w-none [&_svg]:max-h-none cursor-grab active:cursor-grabbing p-4"
                        dangerouslySetInnerHTML={{ __html: svgContent }}
                      />
                    </TransformComponent>
                    <div className="absolute bottom-2 left-2 text-[10px] text-muted-foreground bg-white/80 px-2 py-1 rounded">
                      Drag to pan • Scroll to zoom
                    </div>
                  </>
                )}
              </TransformWrapper>
            </div>
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
