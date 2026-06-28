import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Download,
  FileText,
  Archive,
  Filter,
  ChevronRight,
  Loader,
  AlertCircle,
} from "lucide-react";
import {
  getAvailableResources,
  getResourcesByCategory,
  searchResources,
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Resource Library</h1>
        <p className="text-muted-foreground">
          Download practice materials, sheet music, and learning resources
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Search resources by title, description, or tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Categories */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Filter className="w-5 h-5" />
                Categories
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`w-full text-left px-3 py-2 rounded-lg transition ${
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
                  className={`w-full text-left px-3 py-2 rounded-lg transition ${
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

          {/* Stats Card */}
          <Card className="mt-4">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold">
                    Total Resources
                  </p>
                  <p className="text-2xl font-bold">{resources.length}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold">
                    Available in Category
                  </p>
                  <p className="text-2xl font-bold">{filteredResources.length}</p>
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
            <div className="space-y-3">
              {filteredResources.map((resource) => (
                <Card
                  key={resource.id}
                  className="hover:shadow-lg transition overflow-hidden"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="p-3 bg-secondary rounded-lg flex-shrink-0 mt-1">
                          {getFileIcon(resource.resource_type)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg mb-1 truncate">
                            {resource.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {resource.description}
                          </p>

                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                              {resource.category}
                            </span>
                            {resource.tags && resource.tags.length > 0 && (
                              <>
                                {resource.tags.slice(0, 2).map((tag, idx) => (
                                  <span
                                    key={idx}
                                    className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded"
                                  >
                                    {tag}
                                  </span>
                                ))}
                                {resource.tags.length > 2 && (
                                  <span className="text-xs text-muted-foreground">
                                    +{resource.tags.length - 2} more
                                  </span>
                                )}
                              </>
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{formatFileSize(resource.file_size)}</span>
                            <span>
                              {resource.resource_type.toUpperCase()}
                            </span>
                            <span>↓ {resource.download_count} downloads</span>
                          </div>
                        </div>
                      </div>

                      <Button
                        onClick={() => handleDownload(resource)}
                        disabled={downloading === resource.id}
                        className="gap-2 flex-shrink-0"
                      >
                        {downloading === resource.id ? (
                          <>
                            <Loader className="w-4 h-4 animate-spin" />
                            Downloading...
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4" />
                            Download
                          </>
                        )}
                      </Button>
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
