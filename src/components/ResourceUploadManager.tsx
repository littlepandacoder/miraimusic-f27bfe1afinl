import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  FileText,
  Archive,
  Trash2,
  Edit2,
  Eye,
  Loader,
  Lock,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  uploadResource,
  deleteResource,
  updateResource,
  getUploadHistory,
  validateResourceMetadata,
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

const ACCESS_LEVELS = [
  { value: "public", label: "Public (Everyone)" },
  { value: "students", label: "Students Only" },
  { value: "premium", label: "Premium Members" },
];

interface UploadFormData {
  title: string;
  description: string;
  category: string;
  accessLevel: "public" | "students" | "premium";
  tags: string;
}

export function ResourceUploadManager() {
  const { user, hasRole } = useAuth();
  const [uploadHistory, setUploadHistory] = useState<LibraryResource[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<UploadFormData>({
    title: "",
    description: "",
    category: CATEGORIES[0],
    accessLevel: "students",
    tags: "",
  });
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check user permissions
  const isAdmin = hasRole("admin");
  const isTeacher = hasRole("teacher");
  const canUpload = isAdmin || isTeacher;

  // Load upload history on mount
  useEffect(() => {
    if (canUpload) {
      loadHistory();
    }
  }, [canUpload]);

  async function loadHistory() {
    try {
      const data = await getUploadHistory();
      setUploadHistory(data);
    } catch (err) {
      console.error("Failed to load history:", err);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["application/pdf", "application/zip", "application/x-zip-compressed"];
    if (!validTypes.includes(file.type)) {
      setUploadError("Only PDF and ZIP files are allowed");
      return;
    }

    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      setUploadError("File must be smaller than 100MB");
      return;
    }

    setSelectedFile(file);
    setUploadError(null);
  }

  async function handleUpload() {
    if (!selectedFile) {
      setUploadError("Please select a file");
      return;
    }

    // Validate metadata before upload
    const validation = validateResourceMetadata({
      title: formData.title,
      description: formData.description,
      category: formData.category,
      accessLevel: formData.accessLevel,
      tags: formData.tags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t),
    });

    if (!validation.valid) {
      setUploadError(validation.errors[0]);
      return;
    }

    try {
      setUploading(true);
      setUploadError(null);
      setUploadSuccess(false);

      await uploadResource(selectedFile, {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        accessLevel: formData.accessLevel,
        tags: formData.tags
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t),
      });

      setUploadSuccess(true);
      resetForm();
      await loadHistory();

      // Clear success message after 3 seconds
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this resource?")) return;

    try {
      setDeleting(id);
      await deleteResource(id);
      setUploadHistory((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(null);
    }
  }

  function resetForm() {
    setSelectedFile(null);
    setFormData({
      title: "",
      description: "",
      category: CATEGORIES[0],
      accessLevel: "students",
      tags: "",
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  // Permission check
  if (!canUpload) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Resource Manager</h1>
          <p className="text-muted-foreground">Upload and manage learning resources</p>
        </div>
        <Card className="border-amber-500/30 bg-amber-500/10">
          <CardContent className="pt-6 flex items-start gap-4">
            <Lock className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-amber-900 mb-1">Access Restricted</h3>
              <p className="text-sm text-amber-800">
                Only administrators and teachers can access the Resource Manager.
              </p>
              <p className="text-xs text-amber-700 mt-2">
                If you believe you should have access, please contact your administrator.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Resource Manager</h1>
        <p className="text-muted-foreground">
          Upload and manage learning resources {isAdmin && "(Admin)"} {isTeacher && "(Teacher)"}
        </p>
      </div>

      {/* Upload Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload New Resource
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-semibold mb-2">File</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.zip"
                onChange={handleFileSelect}
                className="hidden"
              />
              {selectedFile ? (
                <div className="space-y-2">
                  <p className="font-semibold">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(selectedFile.size)}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    Change File
                  </Button>
                </div>
              ) : (
                <div>
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="font-semibold">Click to upload or drag and drop</p>
                  <p className="text-sm text-muted-foreground">PDF or ZIP (Max 100MB)</p>
                </div>
              )}
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Title *</label>
              <Input
                placeholder="Resource title"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Category</label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, category: e.target.value }))
                }
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Description</label>
            <textarea
              placeholder="Describe the resource..."
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              rows={4}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Access Level</label>
              <select
                value={formData.accessLevel}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    accessLevel: e.target.value as any,
                  }))
                }
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              >
                {ACCESS_LEVELS.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                Tags (comma-separated)
              </label>
              <Input
                placeholder="e.g., scales, practice, beginner"
                value={formData.tags}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, tags: e.target.value }))
                }
              />
            </div>
          </div>

          {/* Messages */}
          {uploadSuccess && (
            <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <p className="text-sm text-green-600 font-medium">
                Resource uploaded successfully!
              </p>
            </div>
          )}

          {uploadError && (
            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-sm text-red-600">{uploadError}</p>
            </div>
          )}

          <Button onClick={handleUpload} disabled={uploading || !selectedFile} className="w-full">
            {uploading ? (
              <>
                <Loader className="w-4 h-4 animate-spin mr-2" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload Resource
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Upload History */}
      <Card>
        <CardHeader>
          <CardTitle>Upload History</CardTitle>
        </CardHeader>
        <CardContent>
          {uploadHistory.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No resources uploaded yet</p>
          ) : (
            <div className="space-y-3">
              {uploadHistory.map((resource) => (
                <div
                  key={resource.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-secondary/50 transition"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-2 bg-secondary rounded">{getFileIcon(resource.resource_type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{resource.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(resource.file_size)} • {resource.category}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                      {resource.access_level}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ↓ {resource.download_count}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingId(resource.id)}
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(resource.id)}
                      disabled={deleting === resource.id}
                      title="Delete"
                    >
                      {deleting === resource.id ? (
                        <Loader className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 text-red-500" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
