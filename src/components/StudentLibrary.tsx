import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Download,
  FileText,
  Archive,
  Eye,
  Loader,
  AlertCircle,
} from "lucide-react";
import {
  getAvailableResources,
  recordDownload,
  type LibraryResource,
} from "@/lib/libraryService";

const CATEGORIES = [
  "Theory",
  "Technique",
  "Sheet Music",
  "Exercises",
  "Compositions",
  "Reference",
  "Other",
];

export function StudentLibrary() {
  const [resources, setResources] = useState<LibraryResource[]>([]);
  const [filteredResources, setFilteredResources] = useState<LibraryResource[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleViewPdf = (resource: LibraryResource) => {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/pdf-viewer?url=${encodeURIComponent(resource.file_url)}&name=${encodeURIComponent(resource.file_name)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Load resources on mount
  useEffect(() => {
    loadResources();
  }, []);

  // Filter resources based on category and search
  useEffect(() => {
    let filtered = resources;

    if (selectedCategory && selectedCategory !== "all") {
      filtered = filtered.filter((r) => r.category === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.title.toLowerCase().includes(query) ||
          r.description.toLowerCase().includes(query) ||
          r.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    setFilteredResources(filtered);
  }, [resources, selectedCategory, searchQuery]);

  async function loadResources() {
    try {
      setLoading(true);
      setError(null);
      const data = await getAvailableResources();
      setResources(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load resources");
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload(resource: LibraryResource) {
    try {
      setDownloading(resource.id);

      // Use simple approach: create link and click
      const link = document.createElement("a");
      link.href = resource.file_url;
      link.download = resource.file_name;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();

      // Wait a bit then remove
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);

      // Record the download in background (don't block if fails)
      recordDownload(resource.id).catch((err) => {
        console.warn("Failed to record download:", err);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloading(null);
    }
  }

  const getFileIcon = (resourceType: string) => {
    return resourceType === "pdf" ? (
      <FileText className="w-5 h-5 text-red-500" />
    ) : (
      <Archive className="w-5 h-5 text-blue-500" />
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="space-y-4 md:space-y-6 px-4 md:px-0">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2">Resource Library</h1>
        <p className="text-xs md:text-sm text-muted-foreground">
          Download practice materials, sheet music, and learning resources
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 md:w-5 h-4 md:h-5 text-muted-foreground" />
        <Input
          placeholder="Search resources..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 text-sm md:text-base"
        />
      </div>

      {/* Error */}
      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="pt-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-destructive">Error</p>
              <p className="text-sm text-destructive/90">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Sidebar - Categories */}
        <div className="lg:col-span-1">
          <Card className="mb-4 md:mb-6 lg:mb-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm md:text-base">Categories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`w-full text-left px-2 md:px-3 py-2 text-xs md:text-sm rounded-lg transition ${
                  selectedCategory === null
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-secondary"
                }`}
              >
                All Resources
              </button>
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`w-full text-left px-2 md:px-3 py-2 text-xs md:text-sm rounded-lg transition ${
                    selectedCategory === category
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-secondary"
                  }`}
                >
                  {category}
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Stats Card - Hidden on mobile */}
          <Card className="hidden md:block">
            <CardContent className="pt-4 md:pt-6">
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold">
                    Total Resources
                  </p>
                  <p className="text-xl md:text-2xl font-bold">{resources.length}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold">
                    Available in Category
                  </p>
                  <p className="text-xl md:text-2xl font-bold">{filteredResources.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content - Resources */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
                <p className="text-muted-foreground">Loading resources...</p>
              </div>
            </div>
          ) : filteredResources.length === 0 ? (
            <Card>
              <CardContent className="pt-12 text-center">
                <p className="text-muted-foreground mb-4">No resources found</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory(null);
                  }}
                >
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2 md:space-y-3">
              {filteredResources.map((resource) => (
                <Card
                  key={resource.id}
                  className="hover:shadow-lg transition overflow-hidden"
                >
                  <CardContent className="p-3 md:p-4">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-3 md:gap-4">
                      <div className="flex items-start gap-2 md:gap-4 flex-1 min-w-0">
                        <div className="p-2 md:p-3 bg-secondary rounded-lg flex-shrink-0 mt-0.5">
                          {getFileIcon(resource.resource_type)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm md:text-lg mb-1 truncate">
                            {resource.title}
                          </h3>
                          <p className="text-xs md:text-sm text-muted-foreground mb-2 md:mb-3 line-clamp-2">
                            {resource.description}
                          </p>

                          <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mb-2">
                            <span className="text-xs bg-primary/10 text-primary px-1.5 md:px-2 py-0.5 md:py-1 rounded">
                              {resource.category}
                            </span>
                            {resource.tags && resource.tags.length > 0 && (
                              <>
                                {resource.tags.slice(0, 2).map((tag, idx) => (
                                  <span
                                    key={idx}
                                    className="text-xs bg-secondary text-secondary-foreground px-1.5 md:px-2 py-0.5 md:py-1 rounded"
                                  >
                                    {tag}
                                  </span>
                                ))}
                                {resource.tags.length > 2 && (
                                  <span className="text-xs text-muted-foreground">
                                    +{resource.tags.length - 2}
                                  </span>
                                )}
                              </>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs text-muted-foreground">
                            <span>{formatFileSize(resource.file_size)}</span>
                            <span className="hidden sm:inline">
                              {resource.resource_type.toUpperCase()}
                            </span>
                            <span className="hidden sm:inline">↓ {resource.download_count}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-1.5 md:gap-2 flex-shrink-0 w-full sm:w-auto">
                        {resource.resource_type === "pdf" && (
                          <Button
                            variant="outline"
                            onClick={() => handleViewPdf(resource)}
                            className="gap-1.5 md:gap-2 text-xs md:text-sm h-8 md:h-10 flex-1 sm:flex-none"
                          >
                            <Eye className="w-3.5 md:w-4 h-3.5 md:h-4" />
                            <span className="hidden sm:inline">View</span>
                          </Button>
                        )}

                        <Button
                          onClick={() => handleDownload(resource)}
                          disabled={downloading === resource.id}
                          className="gap-1.5 md:gap-2 text-xs md:text-sm h-8 md:h-10 flex-1 sm:flex-none"
                        >
                          {downloading === resource.id ? (
                            <>
                              <Loader className="w-3.5 md:w-4 h-3.5 md:h-4 animate-spin" />
                              <span className="hidden sm:inline">Downloading</span>
                            </>
                          ) : (
                            <>
                              <Download className="w-3.5 md:w-4 h-3.5 md:h-4" />
                              <span className="hidden sm:inline">Download</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
