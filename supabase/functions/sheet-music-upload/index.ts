/**
 * sheet-music-upload
 *
 * Handles uploading MusicXML and MIDI files to Supabase Storage
 * and creating/updating the sheet_music_songs database entry.
 *
 * Required:
 * - Authentication: User must be admin or teacher
 * - Request: multipart/form-data with:
 *   - musicxmlFile: File (MusicXML)
 *   - midiFile: File (MIDI)
 *   - title: string
 *   - composer: string (optional)
 *   - description: string (optional)
 *   - difficulty: number (1-10)
 *   - base_bpm: number
 *   - isPublic: boolean
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

serve(async (req) => {
  // Only allow POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const token = authHeader.replace("Bearer ", "");

    // Create Supabase client with service role key
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify token and get user
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const userId = userData.user.id;

    // Check user role (admin or teacher)
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const hasAdminOrTeacher = roleData?.some((r: any) => r.role === "admin" || r.role === "teacher");

    if (!hasAdminOrTeacher) {
      return new Response(JSON.stringify({ error: "Only admins and teachers can upload" }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Parse form data
    const formData = await req.formData();
    const musicxmlFile = formData.get("musicxmlFile") as File;
    const midiFile = formData.get("midiFile") as File;
    const title = formData.get("title") as string;
    const composer = formData.get("composer") as string || null;
    const description = formData.get("description") as string || null;
    const difficulty = parseInt(formData.get("difficulty") as string) || 5;
    const baseBpm = parseInt(formData.get("base_bpm") as string) || 120;
    const isPublic = formData.get("isPublic") === "true";

    // Validate inputs
    if (!musicxmlFile || !midiFile || !title) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: musicxmlFile, midiFile, title" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate file types
    if (!musicxmlFile.type.includes("xml") && !musicxmlFile.name.endsWith(".musicxml")) {
      return new Response(
        JSON.stringify({ error: "musicxmlFile must be a MusicXML file" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!midiFile.type.includes("midi") && !midiFile.name.endsWith(".mid")) {
      return new Response(
        JSON.stringify({ error: "midiFile must be a MIDI file" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Generate song ID
    const songId = `${title.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now()}`;
    const folderPath = `songs/${songId}`;

    // Upload MusicXML
    const musicxmlBuffer = await musicxmlFile.arrayBuffer();
    const { error: musicxmlUploadError } = await supabase.storage
      .from("sheet-music")
      .upload(`${folderPath}/score.musicxml`, new Uint8Array(musicxmlBuffer), {
        contentType: "application/xml",
        upsert: false
      });

    if (musicxmlUploadError) {
      console.error("[sheet-music-upload] MusicXML upload failed:", musicxmlUploadError);
      return new Response(
        JSON.stringify({ error: `Failed to upload MusicXML: ${musicxmlUploadError.message}` }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Upload MIDI
    const midiBuffer = await midiFile.arrayBuffer();
    const { error: midiUploadError } = await supabase.storage
      .from("sheet-music")
      .upload(`${folderPath}/backing.mid`, new Uint8Array(midiBuffer), {
        contentType: "audio/midi",
        upsert: false
      });

    if (midiUploadError) {
      console.error("[sheet-music-upload] MIDI upload failed:", midiUploadError);
      // Clean up MusicXML if MIDI fails
      await supabase.storage.from("sheet-music").remove([`${folderPath}/score.musicxml`]);
      return new Response(
        JSON.stringify({ error: `Failed to upload MIDI: ${midiUploadError.message}` }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create database entry
    const { data: songData, error: dbError } = await supabase
      .from("sheet_music_songs")
      .insert({
        title,
        composer,
        description,
        difficulty,
        base_bpm: baseBpm,
        musicxml_path: `${folderPath}/score.musicxml`,
        midi_path: `${folderPath}/backing.mid`,
        is_public: isPublic,
        created_by: userId
      })
      .select()
      .single();

    if (dbError) {
      console.error("[sheet-music-upload] Database insert failed:", dbError);
      // Clean up uploaded files
      await supabase.storage
        .from("sheet-music")
        .remove([
          `${folderPath}/score.musicxml`,
          `${folderPath}/backing.mid`
        ]);
      return new Response(
        JSON.stringify({ error: `Failed to create database entry: ${dbError.message}` }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("[sheet-music-upload] Successfully uploaded song:", title);

    return new Response(
      JSON.stringify({
        success: true,
        song: songData,
        message: `Song "${title}" uploaded successfully!`
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[sheet-music-upload] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
