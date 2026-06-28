import { useState, useRef, useEffect } from "react";
import { Stage, Layer, Line } from "react-konva";
import * as pdfjsLib from "pdfjs-dist";
import {
  Download,
  Pen,
  Eraser,
  Highlighter,
  ChevronLeft,
  ChevronRight,
  X,
  Trash2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

type ToolType = "pen" | "eraser" | "highlighter" | "view";

interface DrawLine {
  points: number[];
  color: string;
  width: number;
  tool: ToolType;
}

export interface PDFViewerProps {
  fileUrl: string;
  fileName: string;
  onClose?: () => void;
}

export function PDFViewer({ fileUrl, fileName, onClose }: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<any>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lines, setLines] = useState<DrawLine[]>([]);
  const [tool, setTool] = useState<ToolType>("pen");
  const [color, setColor] = useState("#FF0000");
  const [brushWidth, setBrushWidth] = useState(2);
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    setLoading(false);
  }, [fileUrl]);

  const handleMouseDown = (e: any) => {
    if (tool === "view") return;
    setIsDrawing(true);
    const pos = e.target.getStage().getPointerPosition();
    setLines([
      ...lines,
      { points: [pos.x, pos.y], color, width: brushWidth, tool },
    ]);
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing || tool === "view") return;
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();

    const lastLine = lines[lines.length - 1];
    if (lastLine) {
      lastLine.points = lastLine.points.concat([point.x, point.y]);
      setLines(lines.slice(0, -1).concat(lastLine));
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    setLines([]);
  };

  const handleZoomIn = () => {
    setZoom((z) => Math.min(z + 0.2, 3));
  };

  const handleZoomOut = () => {
    setZoom((z) => Math.max(z - 0.2, 0.5));
  };

  const handleDownloadAnnotated = async () => {
    try {
      const stage = stageRef.current;
      if (!stage) return;

      const dataUrl = stage.toDataURL();
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${fileName.replace(".pdf", "")}-annotated-p${currentPage}.png`;
      link.click();
    } catch (err) {
      console.error("Failed to download:", err);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading PDF...</div>;
  }

  return (
    <div className="w-full h-full bg-white flex flex-col">
      {/* Toolbar */}
      <div className="bg-gray-50 border-b p-4 space-y-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">{fileName}</h3>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Tools */}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={tool === "pen" ? "default" : "outline"}
            onClick={() => setTool("pen")}
          >
            <Pen className="w-4 h-4 mr-1" />
            Pen
          </Button>

          <Button
            size="sm"
            variant={tool === "highlighter" ? "default" : "outline"}
            onClick={() => setTool("highlighter")}
          >
            <Highlighter className="w-4 h-4 mr-1" />
            Highlight
          </Button>

          <Button
            size="sm"
            variant={tool === "eraser" ? "default" : "outline"}
            onClick={() => setTool("eraser")}
          >
            <Eraser className="w-4 h-4 mr-1" />
            Eraser
          </Button>

          <Button
            size="sm"
            variant={tool === "view" ? "default" : "outline"}
            onClick={() => setTool("view")}
          >
            View
          </Button>

          <Button size="sm" variant="destructive" onClick={handleClear}>
            <Trash2 className="w-4 h-4 mr-1" />
            Clear
          </Button>

          <div className="flex items-center gap-1 ml-auto">
            <Button size="sm" variant="outline" onClick={handleZoomOut}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium px-3">{Math.round(zoom * 100)}%</span>
            <Button size="sm" variant="outline" onClick={handleZoomIn}>
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Options */}
        {tool !== "view" && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Color:</label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Size:</label>
              <input
                type="range"
                min="1"
                max="20"
                value={brushWidth}
                onChange={(e) => setBrushWidth(Number(e.target.value))}
                className="w-24"
              />
              <span className="text-xs">{brushWidth}px</span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handlePrevPage}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <span className="text-sm font-medium px-3">
              Page {currentPage} / {totalPages}
            </span>

            <Button
              size="sm"
              variant="outline"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <Button size="sm" onClick={handleDownloadAnnotated}>
            <Download className="w-4 h-4 mr-1" />
            Download
          </Button>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 bg-gray-100 overflow-auto flex items-center justify-center">
        {!loading && (
          <iframe
            src={`${fileUrl}#toolbar=1&navpanes=0`}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              transform: `scale(${zoom})`,
              transformOrigin: "top center",
            }}
            title="PDF Viewer"
          />
        )}
        {loading && (
          <div className="text-center">
            <p className="text-gray-600">Loading PDF...</p>
          </div>
        )}
      </div>
    </div>
  );
}
