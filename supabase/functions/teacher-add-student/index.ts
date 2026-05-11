import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const accessToken = authHeader.split(" ")[1];

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is a teacher
    const { data: callerData, error: callerErr } = await admin.auth.getUser(accessToken);
    if (callerErr || !callerData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const teacherId = callerData.user.id;

    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", teacherId)
      .in("role", ["teacher", "admin"])
      .single();

    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden — teacher role required" }), { status: 403, headers: corsHeaders });
    }

    // Check seat availability
    const { data: seatInfo } = await admin.rpc("get_teacher_seat_info", { p_teacher_id: teacherId });
    const seat = Array.isArray(seatInfo) ? seatInfo[0] : seatInfo;
    if (!seat || seat.available_seats <= 0) {
      return new Response(JSON.stringify({ error: "No seats available. Purchase additional seats to add more students." }), { status: 409, headers: corsHeaders });
    }

    const { email, full_name, password } = await req.json();
    if (!email || !full_name) {
      return new Response(JSON.stringify({ error: "email and full_name are required" }), { status: 400, headers: corsHeaders });
    }

    let studentId: string;

    // Try to find existing user first
    const { data: existingList } = await admin.auth.admin.listUsers();
    const existing = existingList?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());

    if (existing) {
      studentId = existing.id;
    } else {
      // Create new student account
      if (!password) {
        return new Response(JSON.stringify({ error: "password is required for new students" }), { status: 400, headers: corsHeaders });
      }
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (createErr) throw createErr;
      studentId = created.user.id;

      // Assign student role
      await admin.from("user_roles").delete().eq("user_id", studentId);
      await admin.from("user_roles").insert({ user_id: studentId, role: "student" });

      // Create profile
      await admin.from("profiles").upsert({ user_id: studentId, email, full_name }, { onConflict: "user_id" });

      // Grant active subscription
      await admin.from("user_subscriptions").insert({
        user_id: studentId,
        subscription_id: `teacher-created-${teacherId}`,
        plan_id: "teacher-created",
        status: "active",
      });
    }

    // Link student to teacher roster
    const { error: linkErr } = await admin
      .from("teacher_students")
      .insert({ teacher_id: teacherId, student_id: studentId });

    if (linkErr) {
      if (linkErr.code === "23505") {
        return new Response(JSON.stringify({ error: "This student is already in your roster." }), { status: 409, headers: corsHeaders });
      }
      throw linkErr;
    }

    return new Response(JSON.stringify({ success: true, studentId, isNew: !existing }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
