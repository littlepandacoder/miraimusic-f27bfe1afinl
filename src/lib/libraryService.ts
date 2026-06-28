import { supabase } from "@/integrations/supabase/client";

export type ResourceType = "pdf" | "zip" | "document" | "video" | "audio";
export type AccessLevel = "public" | "students" | "premium";

const VALID_CATEGORIES = [
  "Theory",
  "Technique",
  "Sheet Music",
  "Exercises",
  "Compositions",
  "Reference",
  "Other",
];

/**
 * Validate resource metadata
 */
export function validateResourceMetadata(data: {
  title: string;
  description?: string;
  category: string;
  accessLevel: AccessLevel;
  tags?: string[];
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate title
  if (!data.title || typeof data.title !== "string") {
    errors.push("Title is required");
  } else if (data.title.length < 1) {
    errors.push("Title cannot be empty");
  } else if (data.title.length > 255) {
    errors.push("Title must be 255 characters or less");
  } else if (/<[^>]*>/g.test(data.title)) {
    errors.push("Title contains invalid characters");
  }

  // Validate description
  if (data.description) {
    if (typeof data.description !== "string") {
      errors.push("Description must be text");
    } else if (data.description.length > 2000) {
      errors.push("Description must be 2000 characters or less");
    }
  }

  // Validate category
  if (!data.category || !VALID_CATEGORIES.includes(data.category)) {
    errors.push("Invalid category selected");
  }

  // Validate access level
  if (!["public", "students", "premium"].includes(data.accessLevel)) {
    errors.push("Invalid access level");
  }

  // Validate tags
  if (data.tags) {
    if (!Array.isArray(data.tags)) {
      errors.push("Tags must be an array");
    } else if (data.tags.length > 10) {
      errors.push("Maximum 10 tags allowed");
    } else {
      for (const tag of data.tags) {
        if (typeof tag !== "string" || tag.length > 50) {
          errors.push("Each tag must be 50 characters or less");
          break;
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize search query to prevent injection
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query || typeof query !== "string") {
    return "";
  }

  // Limit length to prevent DoS
  const limited = query.slice(0, 100).trim();

  // Remove SQL special characters that could cause issues
  const sanitized = limited
    .replace(/['";\\]/g, "") // Remove quotes and backslashes
    .replace(/--/g, "") // Remove SQL comments
    .replace(/\/\*/g, "") // Remove comment starts
    .trim();

  return sanitized;
}

export interface LibraryResource {
  id: string;
  title: string;
  description: string;
  file_url: string;
  file_name: string;
  file_size: number;
  resource_type: ResourceType;
  access_level: AccessLevel;
  category: string;
  uploaded_by: string;
  uploaded_by_name: string;
  created_at: string;
  updated_at: string;
  download_count: number;
  tags: string[];
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

/**
 * Fetch all available resources for students
 */
export async function getAvailableResources(accessLevel?: AccessLevel) {
  let query = supabase
    .from("library_resources")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (accessLevel) {
    query = query.in("access_level", [accessLevel, "public"]);
  } else {
    query = query.in("access_level", ["public", "students"]);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as LibraryResource[];
}

/**
 * Get resources by category
 */
export async function getResourcesByCategory(category: string) {
  const { data, error } = await supabase
    .from("library_resources")
    .select("*")
    .eq("category", category)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as LibraryResource[];
}

/**
 * Search resources
 */
export async function searchResources(query: string) {
  if (!query || query.length < 1) {
    return [];
  }

  // Sanitize query to prevent injection
  const sanitized = sanitizeSearchQuery(query);

  if (!sanitized) {
    return [];
  }

  const { data, error } = await supabase
    .from("library_resources")
    .select("*")
    .eq("is_active", true)
    .or(`title.ilike.%${sanitized}%,description.ilike.%${sanitized}%`)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as LibraryResource[];
}

/**
 * Get resource by ID
 */
export async function getResourceById(id: string) {
  const { data, error } = await supabase
    .from("library_resources")
    .select("*")
    .eq("id", id)
    .eq("is_active", true)
    .single();

  if (error) throw error;
  return data as LibraryResource;
}

/**
 * Sanitize filename to prevent path traversal attacks
 */
function sanitizeFilename(filename: string): string {
  // Remove path traversal sequences
  let sanitized = filename.replace(/\.\./g, "").replace(/[/\\]/g, "");

  // Remove special characters except dots, hyphens, underscores
  sanitized = sanitized.replace(/[^\w\s.-]/g, "");

  // Remove multiple consecutive dots (prevents ../ bypass)
  sanitized = sanitized.replace(/\.{2,}/g, ".");

  // Limit to 255 characters
  return sanitized.slice(0, 255).trim();
}

/**
 * Upload a resource file
 */
export async function uploadResource(
  file: File,
  metadata: {
    title: string;
    description: string;
    category: string;
    accessLevel: AccessLevel;
    tags?: string[];
  },
  onProgress?: (progress: UploadProgress) => void
) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error("User not authenticated");

  // Validate metadata
  const validation = validateResourceMetadata(metadata);
  if (!validation.valid) {
    throw new Error(validation.errors[0]);
  }

  // Validate file
  const validTypes = ["application/pdf", "application/zip", "application/x-zip-compressed"];
  if (!validTypes.includes(file.type)) {
    throw new Error("Only PDF and ZIP files are allowed");
  }

  const maxSize = 100 * 1024 * 1024; // 100MB
  if (file.size > maxSize) {
    throw new Error("File size exceeds 100MB limit");
  }

  // Generate unique file path with sanitized filename
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(7);
  const sanitizedFilename = sanitizeFilename(file.name);
  const filePath = `resources/${timestamp}-${randomStr}-${sanitizedFilename}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("library-resources")
    .upload(filePath, file, {
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) throw uploadError;

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("library-resources")
    .getPublicUrl(filePath);

  // Create database entry
  const { data: resourceData, error: dbError } = await supabase
    .from("library_resources")
    .insert([
      {
        title: metadata.title,
        description: metadata.description,
        file_url: urlData.publicUrl,
        file_name: file.name,
        file_size: file.size,
        resource_type: file.type === "application/pdf" ? "pdf" : "zip",
        access_level: metadata.accessLevel,
        category: metadata.category,
        uploaded_by: user.id,
        tags: metadata.tags || [],
        download_count: 0,
        is_active: true,
      },
    ])
    .select();

  if (dbError) {
    // Clean up uploaded file if DB insert fails
    await supabase.storage.from("library-resources").remove([filePath]);
    throw dbError;
  }

  return resourceData[0] as LibraryResource;
}

/**
 * Delete a resource
 */
export async function deleteResource(id: string) {
  const { data: resource, error: fetchError } = await supabase
    .from("library_resources")
    .select("file_name")
    .eq("id", id)
    .single();

  if (fetchError) throw fetchError;

  // Delete file from storage
  if (resource?.file_name) {
    await supabase.storage.from("library-resources").remove([resource.file_name]);
  }

  // Delete database entry
  const { error: dbError } = await supabase
    .from("library_resources")
    .update({ is_active: false })
    .eq("id", id);

  if (dbError) throw dbError;
}

/**
 * Update resource metadata
 */
export async function updateResource(
  id: string,
  updates: Partial<{
    title: string;
    description: string;
    category: string;
    accessLevel: AccessLevel;
    tags: string[];
  }>
) {
  const { error } = await supabase
    .from("library_resources")
    .update({
      title: updates.title,
      description: updates.description,
      category: updates.category,
      access_level: updates.accessLevel,
      tags: updates.tags,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
}

/**
 * Increment download count
 */
export async function recordDownload(id: string) {
  const { error } = await supabase.rpc("increment_download_count", {
    resource_id: id,
  });

  if (error) throw error;
}

/**
 * Get upload history for admin/teacher
 */
export async function getUploadHistory(uploadedBy?: string) {
  let query = supabase.from("library_resources").select("*");

  if (uploadedBy) {
    query = query.eq("uploaded_by", uploadedBy);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) throw error;
  return data as LibraryResource[];
}

/**
 * Get resource statistics
 */
export async function getResourceStats() {
  const { data, error } = await supabase
    .from("library_resources")
    .select("resource_type, category, download_count")
    .eq("is_active", true);

  if (error) throw error;

  const stats = {
    totalResources: data.length,
    byType: {} as Record<string, number>,
    byCategory: {} as Record<string, number>,
    totalDownloads: 0,
  };

  data.forEach((resource: any) => {
    stats.byType[resource.resource_type] = (stats.byType[resource.resource_type] || 0) + 1;
    stats.byCategory[resource.category] = (stats.byCategory[resource.category] || 0) + 1;
    stats.totalDownloads += resource.download_count || 0;
  });

  return stats;
}
