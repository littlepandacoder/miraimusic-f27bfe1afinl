import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Music, Search, Loader2, ChevronRight, Edit2 } from "lucide-react";
import { MusicSync } from "./MusicSync";

interface LibraryLesson {
  id: string;
  name: string;
  videos_count: number;
  video_url?: string;
  music_sync_data?: { musicxml_data: string | null; sync_points: any[] };
}

export const ResourceLibrary = () => {
  const { toast } = useToast();
  const [lessons, setLessons] = useState<LibraryLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLesson, setSelectedLesson] = useState<LibraryLesson | null>(null);
  const [selectedModule, setSelectedModule] = useState<LibraryLesson | null>(null);
  const [modules, setModules] = useState<LibraryLesson[]>([]);

  useEffect(() => {
    fetchLibraryItems();
  }, []);

  const fetchLibraryItems = async () => {
    setLoading(true);
    try {
      const { data: lessonsData } = await supabase
        .from("foundation_lessons")
        .select("id, title")
        .order("title");

      const { data: modulesData } = await supabase
        .from("course_modules")
        .select("id, title, video_url")
        .order("title");

      if (lessonsData) {
        const lessonsWithCount = await Promise.all(
          lessonsData.map(async (lesson: any) => {
            const { data: allVideos } = await supabase
              .from("lesson_videos")
              .select("id, url")
              .eq("lesson_id", lesson.id)
              .order("created_at", { ascending: true });

            return {
              id: lesson.id,
              name: lesson.title,
              videos_count: allVideos?.length || 0,
              video_url: allVideos?.[0]?.url,
              type: "lesson",
            };
          })
        );
        setLessons(lessonsWithCount);
      }

      if (modulesData) {
        const modulesWithData = modulesData.map((mod: any) => ({
          id: mod.id,
          name: mod.title,
          videos_count: mod.video_url ? 1 : 0,
          type: "module",
          video_url: mod.video_url,
        }));
        setModules(modulesWithData);
      }
    } catch (err) {
      toast({
        title: "Error loading library",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredLessons = lessons.filter((l) =>
    l.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredModules = modules.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {selectedLesson ? (
        <div>
          <Button
            variant="outline"
            onClick={() => setSelectedLesson(null)}
            className="mb-4"
          >
            ← Back to Library
          </Button>
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold">{selectedLesson.name}</h2>
              <p className="text-sm text-muted-foreground">
                {selectedLesson.videos_count} video{selectedLesson.videos_count !== 1 ? "s" : ""}
              </p>
            </div>
            {selectedLesson.videos_count > 0 && (
              <MusicSync
                lessonId={selectedLesson.id}
                videoUrl={selectedLesson.video_url || null}
                isFoundation={true}
                showUploadOnly={false}
              />
            )}
          </div>
        </div>
      ) : selectedModule ? (
        <div>
          <Button
            variant="outline"
            onClick={() => setSelectedModule(null)}
            className="mb-4"
          >
            ← Back to Library
          </Button>
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold">{selectedModule.name}</h2>
              <p className="text-sm text-muted-foreground">
                {selectedModule.videos_count} video{selectedModule.videos_count !== 1 ? "s" : ""}
              </p>
            </div>
            {selectedModule.videos_count > 0 && (
              <MusicSync
                moduleId={selectedModule.id}
                videoUrl={(selectedModule as any).video_url}
                isFoundation={false}
                showUploadOnly={false}
              />
            )}
          </div>
        </div>
      ) : (
        <>
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music className="w-5 h-5 text-primary" />
                Music Library
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Manage music sync and sheet music for all lessons and modules
              </p>
            </CardHeader>
          </Card>

          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search lessons and modules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading library...
            </div>
          ) : (
            <Tabs defaultValue="lessons" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="lessons">
                  Foundation Lessons ({filteredLessons.length})
                </TabsTrigger>
                <TabsTrigger value="modules">
                  Course Modules ({filteredModules.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="lessons" className="space-y-3">
                {filteredLessons.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No lessons found
                  </p>
                ) : (
                  <div className="grid gap-3">
                    {filteredLessons.map((lesson) => (
                      <Card
                        key={lesson.id}
                        className="cursor-pointer hover:bg-secondary transition-colors"
                        onClick={() => setSelectedLesson(lesson)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold truncate">{lesson.name}</h3>
                              <p className="text-xs text-muted-foreground">
                                {lesson.videos_count} video{lesson.videos_count !== 1 ? "s" : ""}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="shrink-0 ml-2"
                            >
                              <Edit2 className="w-4 h-4 mr-2" />
                              Edit
                            </Button>
                            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="modules" className="space-y-3">
                {filteredModules.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No modules found
                  </p>
                ) : (
                  <div className="grid gap-3">
                    {filteredModules.map((module) => (
                      <Card
                        key={module.id}
                        className="cursor-pointer hover:bg-secondary transition-colors"
                        onClick={() => setSelectedModule(module)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold truncate">{module.name}</h3>
                              <p className="text-xs text-muted-foreground">
                                {module.videos_count} video{module.videos_count !== 1 ? "s" : ""}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="shrink-0 ml-2"
                            >
                              <Edit2 className="w-4 h-4 mr-2" />
                              Edit
                            </Button>
                            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </>
      )}
    </div>
  );
};
