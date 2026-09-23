import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export default async (req: Request) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const { data: authUsers, error: authError } = await supabase
      .from("auth.users")
      .select("id, email");

    if (authError) throw authError;

    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, full_name");

    if (profileError) throw profileError;

    const profileMap = new Map(
      (profiles || []).map((p: any) => [p.user_id, p.full_name])
    );

    const result = (authUsers || []).map((u: any) => ({
      user_id: u.id,
      email: u.email,
      full_name: profileMap.get(u.id) || null,
    }));

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
};
