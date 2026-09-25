import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Upload, Music, Volume2, Loader2, FileUp, Pencil } from "lucide-react";
import { NotationEditor } from "./NotationEditor";

interface MusicSyncData {
  id: string;
  lesson_id?: string;
  module_id?: string;
  musicxml_data: string | null;
  sync_points: Array<{ timestamp: number; measure: number }>;
  created_at: string;
  updated_at: string;
}

interface MusicSyncProps {
  moduleId?: string;
  lessonId?: string;
  videoUrl: string | null;
  isFoundation?: boolean;
  showUploadOnly?: boolean;
}

export const MusicSync = ({ moduleId, lessonId, videoUrl, isFoundation, showUploadOnly = true }: MusicSyncProps) => {
  const { toast } = useToast();
  const [syncData, setSyncData] = useState<MusicSyncData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"choose" | "upload" | "edit" | "notation">("choose");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [syncPoints, setSyncPoints] = useState<Array<{ timestamp: number; measure: number }>>([]);
  const [currentMeasure, setCurrentMeasure] = useState(1);

  const fetchMusicSync = async () => {
    const table = isFoundation ? "foundation_lesson_music_sync" : "module_music_sync";
    const field = isFoundation ? "lesson_id" : "module_id";
    const id = isFoundation ? lessonId : moduleId;

    const { data } = await supabase
      .from(table)
      .select("*")
      .eq(field, id)
      .single();

    if (data) {
      setSyncData(data);
      setSyncPoints(data.sync_points || []);
      setMode(data.musicxml_data ? "edit" : "choose");
    } else {
      setMode("choose");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMusicSync();
  }, [moduleId, lessonId, isFoundation]);

  const handleMusicXMLUpload = async (file: File) => {
    setUploading(true);
    try {
      const text = await file.text();
      const table = isFoundation ? "foundation_lesson_music_sync" : "module_music_sync";
      const field = isFoundation ? "lesson_id" : "module_id";
      const id = isFoundation ? lessonId : moduleId;
      const conflictField = isFoundation ? "lesson_id" : "module_id";

      const { error } = await supabase
        .from(table)
        .upsert(
          {
            [field]: id,
            musicxml_data: text,
            sync_points: syncData?.sync_points || [],
          },
          { onConflict: conflictField }
        );

      if (error) throw error;
      toast({ title: "MusicXML uploaded successfully" });
      fetchMusicSync();
    } catch (err) {
      toast({ title: "Error uploading file", description: (err as Error).message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleNotationSave = async (musicxml: string) => {
    try {
      const table = isFoundation ? "foundation_lesson_music_sync" : "module_music_sync";
      const field = isFoundation ? "lesson_id" : "module_id";
      const id = isFoundation ? lessonId : moduleId;
      const conflictField = isFoundation ? "lesson_id" : "module_id";

      const { error } = await supabase
        .from(table)
        .upsert(
          {
            [field]: id,
            musicxml_data: musicxml,
            sync_points: syncData?.sync_points || [],
          },
          { onConflict: conflictField }
        );

      if (error) throw error;
      toast({ title: "Notation saved successfully" });
      fetchMusicSync();
    } catch (err) {
      toast({ title: "Error saving notation", description: (err as Error).message, variant: "destructive" });
    }
  };

  const addSyncPoint = () => {
    const newPoint = { timestamp: currentTime, measure: currentMeasure };
    const updated = [...syncPoints, newPoint].sort((a, b) => a.timestamp - b.timestamp);
    setSyncPoints(updated);
    toast({ title: "Sync point added", description: `Measure ${currentMeasure} at ${currentTime.toFixed(2)}s` });
  };

  const removeSyncPoint = (index: number) => {
    setSyncPoints(syncPoints.filter((_, i) => i !== index));
  };

  const saveSyncPoints = async () => {
    try {
      const table = isFoundation ? "foundation_lesson_music_sync" : "module_music_sync";
      const field = isFoundation ? "lesson_id" : "module_id";
      const id = isFoundation ? lessonId : moduleId;

      const { error } = await supabase
        .from(table)
        .update({ sync_points: syncPoints })
        .eq(field, id);

      if (error) throw error;
      toast({ title: "Sync points saved successfully" });
      fetchMusicSync();
    } catch (err) {
      toast({ title: "Error saving sync points", description: (err as Error).message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex items-center justify-center py-8 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading...
        </CardContent>
      </Card>
    );
  }

  if (!videoUrl) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="text-center py-8 text-muted-foreground">
          ⚠️ Upload a video first before syncing music
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="w-5 h-5 text-primary" />
          Music Sync for Video
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Upload sheet music and sync it with the video audio timeline
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {mode === "notation" ? (
          <NotationEditor
            onSave={handleNotationSave}
            onCancel={() => setMode("choose")}
          />
        ) : mode === "choose" ? (
          <div className="grid grid-cols-2 gap-6">
            {/* Upload Option */}
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-lg hover:bg-secondary/50 transition-colors">
              <div className="mb-4 p-4 bg-secondary rounded-full">
                <FileUp className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Start with a file</h3>
              <p className="text-sm text-muted-foreground text-center mb-4">
                MusicXML, MuseScore, or other notation formats
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                variant="outline"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload File
                  </>
                )}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xml,.musicxml,.mxl,.mus"
                hidden
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleMusicXMLUpload(e.target.files[0]);
                  }
                }}
              />
            </div>

            {/* Create Manually Option */}
            {!showUploadOnly && (
              <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-lg hover:bg-secondary/50 transition-colors">
                <div className="mb-4 p-4 bg-secondary rounded-full">
                  <Pencil className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-1">Create manually</h3>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Create sheet music using our notation editor
                </p>
                <Button onClick={() => setMode("notation")} variant="outline">
                  <Pencil className="w-4 h-4 mr-2" />
                  Open Editor
                </Button>
              </div>
            )}
          </div>
        ) : mode === "edit" && syncData?.musicxml_data ? (
          <>
            {/* Music Loaded Info */}
            <div className="p-4 bg-secondary rounded-lg">
              <p className="text-sm font-medium text-green-500 flex items-center gap-2">
                ✓ Sheet Music Loaded
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {syncData.musicxml_data.length} bytes
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setMode("choose")}
              >
                Change File
              </Button>
            </div>

            {/* Video Player */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Video Preview</label>
              <video
                ref={videoRef}
                src={videoUrl || undefined}
                controls
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                className="w-full rounded-lg bg-black max-h-64"
              />
              <p className="text-xs text-muted-foreground text-right">
                Current time: {currentTime.toFixed(2)}s
              </p>
            </div>

            {/* Sync Point Controls */}
            <div className="space-y-3 p-4 bg-secondary rounded-lg">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium block mb-1">Current Time</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={currentTime.toFixed(2)}
                    onChange={(e) => {
                      const time = parseFloat(e.target.value);
                      if (videoRef.current) videoRef.current.currentTime = time;
                      setCurrentTime(time);
                    }}
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">Measure Number</label>
                  <Input
                    type="number"
                    min="1"
                    value={currentMeasure}
                    onChange={(e) => setCurrentMeasure(parseInt(e.target.value) || 1)}
                    className="text-sm"
                  />
                </div>
              </div>
              <Button onClick={addSyncPoint} className="w-full" size="sm">
                <Music className="w-4 h-4 mr-2" />
                Add Sync Point
              </Button>
            </div>

            {/* Sync Points List */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Sync Points ({syncPoints.length})</label>
              {syncPoints.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No sync points yet. Add your first one above.
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {syncPoints.map((point, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 bg-secondary rounded text-sm"
                    >
                      <span>
                        Measure <strong>{point.measure}</strong> @ <strong>{point.timestamp.toFixed(2)}s</strong>
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSyncPoint(idx)}
                      >
                        ✕
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button onClick={saveSyncPoints} className="w-full">
              <Volume2 className="w-4 h-4 mr-2" />
              Save Sync Points
            </Button>
          </>
        ) : mode === "edit" && !syncData?.musicxml_data ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No sheet music uploaded yet.</p>
            <Button onClick={() => setMode("choose")}>Go Back</Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};
