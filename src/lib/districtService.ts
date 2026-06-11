import { supabase } from "@/integrations/supabase/client";

export interface District {
  id: string;
  name: string;
  code: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DistrictMember {
  id: string;
  district_id: string;
  user_id: string;
  role: "teacher" | "student";
  assigned_at: string;
  assigned_by: string;
}

// Get all districts (admin only)
export async function getAllDistricts() {
  const { data, error } = await supabase
    .from("districts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as District[];
}

// Get districts for current user
export async function getUserDistricts() {
  const { data: session } = await supabase.auth.getSession();
  if (!session?.user?.id) return [];

  const { data, error } = await supabase
    .from("district_members")
    .select("districts(*)")
    .eq("user_id", session.user.id);

  if (error) throw error;
  return data?.map((m: any) => m.districts) || [];
}

// Create a new district
export async function createDistrict(
  name: string,
  code: string,
  description?: string
) {
  const { data: session } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("districts")
    .insert({
      name,
      code: code.toUpperCase(),
      description,
      created_by: session.user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data as District;
}

// Add member to district
export async function addDistrictMember(
  districtId: string,
  userId: string,
  role: "teacher" | "student"
) {
  const { data: session } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("district_members")
    .insert({
      district_id: districtId,
      user_id: userId,
      role,
      assigned_by: session.user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data as DistrictMember;
}

// Remove member from district
export async function removeDistrictMember(districtId: string, userId: string) {
  const { error } = await supabase
    .from("district_members")
    .delete()
    .eq("district_id", districtId)
    .eq("user_id", userId);

  if (error) throw error;
}

// Get district with members
export async function getDistrictWithMembers(districtId: string) {
  const { data: district, error: districtError } = await supabase
    .from("districts")
    .select("*")
    .eq("id", districtId)
    .single();

  if (districtError) throw districtError;

  const { data: members, error: membersError } = await supabase
    .from("district_members")
    .select("*, profiles(full_name, email)")
    .eq("district_id", districtId);

  if (membersError) throw membersError;

  return {
    district: district as District,
    members: members || [],
  };
}

// Get teacher's students in district
export async function getTeacherStudents(districtId: string) {
  const { data, error } = await supabase
    .from("district_members")
    .select("*, profiles(id, full_name, email)")
    .eq("district_id", districtId)
    .eq("role", "student");

  if (error) throw error;
  return data || [];
}

// Get district stats
export async function getDistrictStats(districtId: string) {
  const { data, error } = await supabase
    .from("district_members")
    .select("role")
    .eq("district_id", districtId);

  if (error) throw error;

  const stats = {
    totalMembers: data?.length || 0,
    teachers: data?.filter((m) => m.role === "teacher").length || 0,
    students: data?.filter((m) => m.role === "student").length || 0,
  };

  return stats;
}

// Delete district
export async function deleteDistrict(districtId: string) {
  const { error } = await supabase
    .from("districts")
    .delete()
    .eq("id", districtId);

  if (error) throw error;
}
