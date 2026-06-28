import { useSearchParams } from "react-router-dom";
import { PDFViewer } from "@/components/PDFViewer";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export default function PDFViewerPage() {
  const [searchParams] = useSearchParams();
  const fileUrl = searchParams.get("url");
  const fileName = searchParams.get("name") || "document.pdf";

  if (!fileUrl) {
    return (
      <div className="flex items-center justify-center w-full h-screen bg-gray-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">No PDF URL provided</h1>
          <p className="text-gray-600">Please open a PDF from the library to view it.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <div className="bg-white border-b p-3 flex justify-between items-center">
        <h1 className="font-semibold text-lg">{decodeURIComponent(fileName)}</h1>
        <Button
          size="sm"
          onClick={() => window.close()}
          title="Close PDF viewer"
          className="bg-pink-500 hover:bg-pink-600 text-white"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>
      <div className="p-4">
        <div className="max-w-6xl mx-auto">
          <PDFViewer
            fileUrl={decodeURIComponent(fileUrl)}
            fileName={decodeURIComponent(fileName)}
            onClose={() => window.close()}
          />
        </div>
      </div>
    </div>
  );
}
