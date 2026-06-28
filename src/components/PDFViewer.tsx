import { useState, useRef, useEffect } from "react";
import { Stage, Layer, Line } from "react-konva";
import * as pdfjsLib from "pdfjs-dist";
import {
  Download,
  X,
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

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleZoomOut}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium px-3">{Math.round(zoom * 100)}%</span>
          <Button size="sm" variant="outline" onClick={handleZoomIn}>
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>

        {/* Download */}
        <div className="flex justify-end">
          <Button size="sm" onClick={() => window.open(fileUrl, "_blank")}>
            <Download className="w-4 h-4 mr-1" />
            Download PDF
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
