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
  const [pdf, setPdf] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pageWidth, setPageWidth] = useState(800);
  const [pageHeight, setPageHeight] = useState(1000);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lines, setLines] = useState<DrawLine[]>([]);
  const [tool, setTool] = useState<ToolType>("pen");
  const [color, setColor] = useState("#FF0000");
  const [brushWidth, setBrushWidth] = useState(2);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPdf = async () => {
      try {
        const pdf = await pdfjsLib.getDocument(fileUrl).promise;
        setPdf(pdf);
        setTotalPages(pdf.numPages);
        renderPage(1, pdf);
      } catch (err) {
        console.error("Failed to load PDF:", err);
      } finally {
        setLoading(false);
      }
    };
    loadPdf();
  }, [fileUrl]);

  const renderPage = async (pageNum: number, pdfDoc: any) => {
    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      setPageWidth(viewport.width);
      setPageHeight(viewport.height);

      const context = canvas.getContext("2d");
      if (context) {
        await page.render({ canvasContext: context, viewport }).promise;
      }
      setLines([]);
    } catch (err) {
      console.error("Failed to render page:", err);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1 && pdf) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      renderPage(newPage, pdf);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages && pdf) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      renderPage(newPage, pdf);
    }
  };

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
    <div className="w-full bg-white rounded-lg border border-gray-200">
      {/* Toolbar */}
      <div className="bg-gray-50 border-b p-4 space-y-3">
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
      <div className="flex justify-center bg-gray-100 p-4 overflow-auto max-h-[600px]">
        <div className="relative bg-white shadow">
          <canvas
            ref={canvasRef}
            style={{ display: "block", maxWidth: "100%" }}
          />

          <Stage
            ref={stageRef}
            width={pageWidth}
            height={pageHeight}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              cursor: tool === "eraser" ? "grab" : "crosshair",
            }}
          >
            <Layer>
              {lines.map((line, idx) => (
                <Line
                  key={idx}
                  points={line.points}
                  stroke={
                    line.tool === "eraser"
                      ? "rgba(255,255,255,0.8)"
                      : line.color
                  }
                  strokeWidth={line.width}
                  lineCap="round"
                  lineJoin="round"
                  opacity={line.tool === "highlighter" ? 0.3 : 1}
                  globalCompositeOperation={
                    line.tool === "eraser" ? "destination-out" : "source-over"
                  }
                />
              ))}
            </Layer>
          </Stage>
        </div>
      </div>
    </div>
  );
}
