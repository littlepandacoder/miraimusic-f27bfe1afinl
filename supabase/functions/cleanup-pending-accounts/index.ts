import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: allUsers, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error("[cleanup-pending-accounts] Error listing users:", listError);
      return new Response(JSON.stringify({ error: listError.message }), { status: 500 });
    }

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    let deletedCount = 0;

    for (const user of allUsers.users || []) {
      const paymentStatus = user.user_metadata?.payment_status;
      const signupTimestamp = user.user_metadata?.signup_timestamp;

      if (paymentStatus === "pending_payment" && signupTimestamp) {
        const signupDate = new Date(signupTimestamp);
        if (signupDate < twentyFourHoursAgo) {
          console.log(`[cleanup-pending-accounts] Deleting unpaid user ${user.id} created at ${signupTimestamp}`);

          const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
          if (deleteError) {
            console.error(`[cleanup-pending-accounts] Failed to delete user ${user.id}:`, deleteError);
          } else {
            deletedCount++;
          }
        }
      }
    }

    console.log(`[cleanup-pending-accounts] Cleanup complete. Deleted ${deletedCount} unpaid accounts.`);

    return new Response(JSON.stringify({
      success: true,
      deletedCount,
      message: `Cleaned up ${deletedCount} pending accounts older than 24 hours`,
    }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error("[cleanup-pending-accounts] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
