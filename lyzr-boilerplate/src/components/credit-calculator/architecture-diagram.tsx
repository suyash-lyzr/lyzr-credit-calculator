"use client";

import * as React from "react";
import { IconLoader2, IconZoomIn, IconZoomOut, IconFocus2, IconMaximize, IconX } from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArchitectureData } from "@/lib/types";
import {
  TransformWrapper,
  TransformComponent,
  type ReactZoomPanPinchRef,
} from "react-zoom-pan-pinch";
import mermaid from "mermaid";
import { createPortal } from "react-dom";

interface ArchitectureDiagramProps {
  data: ArchitectureData | null;
  isLoading: boolean;
}

/**
 * A self-fitting, smoothly pan/zoom-able canvas for a rendered Mermaid SVG.
 *
 * The injected SVG keeps its small intrinsic size, so we read its viewBox, give it explicit
 * pixel dimensions, then compute a scale that fits it into the wrapper and center it. We refit
 * on container/window resize and whenever the diagram changes, so it's always fully visible
 * without manual zooming — in both the inline panel and the fullscreen modal.
 */
function DiagramCanvas({
  svgContent,
  padding = 0.06,
  minScale = 0.05,
  maxScale = 8,
}: {
  svgContent: string;
  padding?: number;
  minScale?: number;
  maxScale?: number;
}) {
  const apiRef = React.useRef<ReactZoomPanPinchRef | null>(null);
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const natSizeRef = React.useRef<{ w: number; h: number } | null>(null);

  // Normalize the injected SVG to a fixed pixel size taken from its viewBox so the fit math
  // and the zoom transform are exact.
  const measureSvg = React.useCallback(() => {
    const svg = contentRef.current?.querySelector("svg");
    if (!svg) return null;
    let w = 0;
    let h = 0;
    const vb = svg.getAttribute("viewBox");
    if (vb) {
      const parts = vb.split(/[\s,]+/).map(Number);
      w = parts[2];
      h = parts[3];
    }
    if (!w || !h) {
      const bbox = (svg as SVGSVGElement).getBBox?.();
      if (bbox) {
        w = bbox.width;
        h = bbox.height;
      }
    }
    if (!w || !h) return null;
    svg.style.maxWidth = "none";
    svg.style.maxHeight = "none";
    svg.setAttribute("width", String(w));
    svg.setAttribute("height", String(h));
    svg.style.width = `${w}px`;
    svg.style.height = `${h}px`;
    natSizeRef.current = { w, h };
    return { w, h };
  }, []);

  const fitToView = React.useCallback(
    (animationTime = 0) => {
      const api = apiRef.current;
      const viewport = viewportRef.current;
      if (!api || !viewport) return;
      const nat = natSizeRef.current ?? measureSvg();
      if (!nat) return;
      const cw = viewport.clientWidth;
      const ch = viewport.clientHeight;
      if (!cw || !ch) return;
      const scale = Math.min(cw / nat.w, ch / nat.h) * (1 - padding);
      const clamped = Math.max(minScale, Math.min(maxScale, scale));
      const x = (cw - nat.w * clamped) / 2;
      const y = (ch - nat.h * clamped) / 2;
      api.setTransform(x, y, clamped, animationTime);
    },
    [measureSvg, padding, minScale, maxScale]
  );

  // Refit whenever the diagram content changes (measure first, then fit on next frame so the
  // browser has laid out the new SVG).
  React.useEffect(() => {
    natSizeRef.current = null;
    const id = requestAnimationFrame(() => {
      measureSvg();
      requestAnimationFrame(() => fitToView(0));
    });
    return () => cancelAnimationFrame(id);
  }, [svgContent, measureSvg, fitToView]);

  // Refit on container/window resize.
  React.useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || typeof ResizeObserver === "undefined") return;
    let raf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => fitToView(0));
    });
    ro.observe(viewport);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [fitToView]);

  return (
    <div ref={viewportRef} className="relative h-full w-full overflow-hidden">
      <TransformWrapper
        ref={apiRef}
        minScale={minScale}
        maxScale={maxScale}
        initialScale={1}
        limitToBounds={false}
        centerZoomedOut={false}
        wheel={{ step: 0.12, smoothStep: 0.005 }}
        doubleClick={{ mode: "zoomIn", step: 0.7, animationTime: 200 }}
        panning={{ velocityDisabled: false }}
        onInit={() => fitToView(0)}
      >
        {({ zoomIn, zoomOut }) => (
          <>
            <div className="absolute top-2 right-2 z-10 flex gap-1">
              <Button
                variant="secondary"
                size="icon"
                className="h-7 w-7 bg-white/90 hover:bg-white shadow-sm"
                onClick={() => zoomIn(0.3)}
                title="Zoom In"
              >
                <IconZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="h-7 w-7 bg-white/90 hover:bg-white shadow-sm"
                onClick={() => zoomOut(0.3)}
                title="Zoom Out"
              >
                <IconZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="h-7 w-7 bg-white/90 hover:bg-white shadow-sm"
                onClick={() => fitToView(250)}
                title="Fit to screen"
              >
                <IconFocus2 className="h-4 w-4" />
              </Button>
            </div>
            <TransformComponent
              wrapperStyle={{ width: "100%", height: "100%" }}
              contentStyle={{ width: "max-content", height: "max-content" }}
            >
              <div
                ref={contentRef}
                className="cursor-grab active:cursor-grabbing"
                dangerouslySetInnerHTML={{ __html: svgContent }}
              />
            </TransformComponent>
            <div className="absolute bottom-2 left-2 text-[10px] text-muted-foreground bg-white/80 px-2 py-1 rounded">
              Drag to pan • Scroll to zoom • Double-click to zoom in
            </div>
          </>
        )}
      </TransformWrapper>
    </div>
  );
}

function DiagramModal({
  svgContent,
  title,
  summary,
  onClose,
}: {
  svgContent: string;
  title: string;
  summary: string;
  onClose: () => void;
}) {
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground">{summary}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <IconX className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex-1 relative overflow-hidden bg-white">
          <DiagramCanvas svgContent={svgContent} />
        </div>
      </div>
    </div>,
    document.body
  );
}

export function ArchitectureDiagram({ data, isLoading }: ArchitectureDiagramProps) {
  const [svgContent, setSvgContent] = React.useState<string>("");
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const renderCountRef = React.useRef(0);

  React.useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: "base",
      themeVariables: {
        primaryColor: "#673F1B",
        primaryTextColor: "#FAF6EE",
        primaryBorderColor: "#3D2510",
        lineColor: "#3D2510",
        secondaryColor: "#F5EFE3",
        tertiaryColor: "#FFFFFF",
        fontSize: "13px",
        fontFamily: "var(--font-sans), 'DM Sans', system-ui, sans-serif",
        edgeLabelBackground: "#F5EFE3",
      },
      // Make edge labels (yes/no, true/false) readable — dark text on a cream chip,
      // instead of the near-invisible light text the base theme produced.
      themeCSS: `
        .edgeLabel, .edgeLabel p { color: #3D2510 !important; fill: #3D2510 !important; background-color: #F5EFE3 !important; font-weight: 600; }
        .edgeLabel rect { fill: #F5EFE3 !important; opacity: 1 !important; }
        .edgeLabels .edgeLabel { padding: 1px 5px; border-radius: 4px; }
        .node rect, .node polygon, .node circle, .node path { stroke-width: 1.5px; }
        .cluster rect { fill: #FBF7EF !important; stroke: #D9C8AE !important; }
        .flowchart-link { stroke-width: 1.5px; }
      `,
      flowchart: {
        curve: "basis",
        padding: 18,
        nodeSpacing: 55,
        rankSpacing: 60,
        htmlLabels: true,
        // We size/fit the SVG ourselves in DiagramCanvas, so don't let mermaid cap the width.
        useMaxWidth: false,
      },
    });
  }, []);

  React.useEffect(() => {
    if (data?.mermaidCode) {
      const renderDiagram = async () => {
        try {
          renderCountRef.current += 1;
          const uniqueId = `mermaid-${renderCountRef.current}`;
          let cleanCode = data.mermaidCode
            .replace(/```mermaid\n?/g, "")
            .replace(/```\n?/g, "")
            .trim();
          // Brand consistency: strip any model-emitted colors/styling so EVERY diagram renders in
          // the Lyzr brown/cream theme (set via mermaid.initialize), regardless of run-to-run
          // variation. Removes classDef/style/linkStyle lines, inline ":::class" assignments, and
          // any %%{init}%% directive that would override our theme.
          cleanCode = cleanCode
            .replace(/%%\{[\s\S]*?\}%%/g, "")
            .replace(/^\s*classDef\s+.*$/gim, "")
            .replace(/^\s*style\s+.*$/gim, "")
            .replace(/^\s*linkStyle\s+.*$/gim, "")
            .replace(/:::[A-Za-z0-9_-]+/g, "")
            .replace(/\n{3,}/g, "\n\n")
            .trim();
          // Superflows should read left-to-right (like Lyzr Studio). If every workload is a
          // Superflow, force the top-level graph to LR. Manager/Single stay vertical (TD).
          const allComplex =
            !!data.workloads &&
            data.workloads.length > 0 &&
            data.workloads.every((w) => w.complexity === "complex");
          if (allComplex) {
            cleanCode = cleanCode.replace(/^graph\s+(TD|TB)\b/i, "graph LR");
          }
          const { svg } = await mermaid.render(uniqueId, cleanCode);
          setSvgContent(svg);
        } catch (error) {
          console.error("[Mermaid] Rendering error:", error);
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
      <CardContent className="p-1 flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <IconLoader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : data && svgContent ? (
          <div className="flex flex-col h-full">
            <div className="text-sm text-muted-foreground mb-2 px-1">
              <strong className="text-foreground">{data.title}:</strong> {data.summary}
            </div>
            {data.workloads && data.workloads.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2 px-1">
                {data.workloads.map((w, i) => {
                  const label =
                    w.complexity === "simple"
                      ? "Single Agent"
                      : w.complexity === "intermediate"
                        ? "Manager"
                        : w.complexity === "complex"
                          ? "Superflow"
                          : "Voice";
                  const cls =
                    w.complexity === "simple"
                      ? "bg-emerald-100 text-emerald-700"
                      : w.complexity === "intermediate"
                        ? "bg-amber-100 text-amber-700"
                        : w.complexity === "complex"
                          ? "bg-primary/15 text-primary"
                          : "bg-sky-100 text-sky-700";
                  return (
                    <span
                      key={i}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}
                      title={w.reasoning ?? ""}
                    >
                      <span className="font-semibold">{w.name}</span>
                      <span className="opacity-70">· {label}</span>
                    </span>
                  );
                })}
              </div>
            )}
            <div className="flex-1 relative border rounded-lg bg-white overflow-hidden">
              <Button
                variant="secondary"
                size="icon"
                className="absolute top-2 right-[6.75rem] z-20 h-7 w-7 bg-primary/90 hover:bg-primary text-white shadow-sm"
                onClick={() => setIsModalOpen(true)}
                title="View Full Screen"
              >
                <IconMaximize className="h-4 w-4" />
              </Button>
              <DiagramCanvas svgContent={svgContent} />
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
      {isModalOpen && data && svgContent && (
        <DiagramModal
          svgContent={svgContent}
          title={data.title}
          summary={data.summary}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </Card>
  );
}
