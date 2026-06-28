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
    <div className="w-screen h-screen bg-purple-50 flex flex-col">
      <div className="bg-purple-600 border-b p-3 flex justify-between items-center flex-shrink-0">
        <h1 className="font-semibold text-lg truncate flex-1 text-white">{decodeURIComponent(fileName)}</h1>
        <Button
          size="sm"
          onClick={() => window.close()}
          title="Close PDF viewer"
          className="bg-pink-500 hover:bg-pink-600 text-white flex-shrink-0 ml-4"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>
      <div className="flex-1 overflow-hidden">
        <PDFViewer
          fileUrl={decodeURIComponent(fileUrl)}
          fileName={decodeURIComponent(fileName)}
          onClose={() => window.close()}
        />
      </div>
    </div>
  );
}
