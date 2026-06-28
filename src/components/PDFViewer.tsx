export interface PDFViewerProps {
  fileUrl: string;
  fileName: string;
  onClose?: () => void;
}

export function PDFViewer({ fileUrl }: PDFViewerProps) {
  return (
    <div className="w-full h-full">
      <iframe
        src={`${fileUrl}#toolbar=1&navpanes=0`}
        style={{
          width: "100%",
          height: "100%",
          border: "none",
        }}
        title="PDF Viewer"
      />
    </div>
  );
}
