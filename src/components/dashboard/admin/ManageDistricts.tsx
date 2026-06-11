import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Users, BookOpen, GraduationCap } from "lucide-react";
import {
  getAllDistricts,
  getDistrictWithMembers,
  createDistrict,
  deleteDistrict,
  addDistrictMember,
  removeDistrictMember,
  getDistrictStats,
} from "@/lib/districtService";
import { supabase } from "@/integrations/supabase/client";

interface User {
  id: string;
  email: string;
  full_name?: string;
  role?: string;
}

interface DistrictData {
  id: string;
  name: string;
  code: string;
  description?: string;
}

interface DistrictMemberData {
  user_id: string;
  role: string;
  profiles?: {
    full_name?: string;
    email?: string;
  };
}

export default function ManageDistricts() {
  const [districts, setDistricts] = useState<DistrictData[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [members, setMembers] = useState<DistrictMemberData[]>([]);
  const [stats, setStats] = useState({ totalMembers: 0, teachers: 0, students: 0 });
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [newDistrictName, setNewDistrictName] = useState("");
  const [newDistrictCode, setNewDistrictCode] = useState("");
  const [newDistrictDesc, setNewDistrictDesc] = useState("");
  const [selectedUserRole, setSelectedUserRole] = useState("student");
  const [selectedUserId, setSelectedUserId] = useState("");

  useEffect(() => {
    loadDistricts();
    loadUsers();
  }, []);

  useEffect(() => {
    if (selectedDistrict) {
      loadDistrictDetails();
    }
  }, [selectedDistrict]);

  async function loadDistricts() {
    try {
      const data = await getAllDistricts();
      setDistricts(data);
    } catch (error) {
      console.error("Error loading districts:", error);
    }
  }

  async function loadUsers() {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name");

      if (!error && data) {
        setUsers(data);
      }
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadDistrictDetails() {
    if (!selectedDistrict) return;

    try {
      const { district, members: districtMembers } = await getDistrictWithMembers(
        selectedDistrict
      );
      setMembers(districtMembers);

      const districtStats = await getDistrictStats(selectedDistrict);
      setStats(districtStats);
    } catch (error) {
      console.error("Error loading district details:", error);
    }
  }

  async function handleCreateDistrict(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createDistrict(newDistrictName, newDistrictCode, newDistrictDesc);
      setNewDistrictName("");
      setNewDistrictCode("");
      setNewDistrictDesc("");
      await loadDistricts();
    } catch (error) {
      console.error("Error creating district:", error);
    }
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDistrict || !selectedUserId) return;

    try {
      await addDistrictMember(
        selectedDistrict,
        selectedUserId,
        selectedUserRole as "teacher" | "student"
      );
      setSelectedUserId("");
      await loadDistrictDetails();
    } catch (error) {
      console.error("Error adding member:", error);
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!selectedDistrict) return;
    if (!confirm("Remove this member from the district?")) return;

    try {
      await removeDistrictMember(selectedDistrict, userId);
      await loadDistrictDetails();
    } catch (error) {
      console.error("Error removing member:", error);
    }
  }

  async function handleDeleteDistrict(districtId: string) {
    if (!confirm("Delete this district? This will remove all members.")) return;

    try {
      await deleteDistrict(districtId);
      if (selectedDistrict === districtId) {
        setSelectedDistrict(null);
      }
      await loadDistricts();
    } catch (error) {
      console.error("Error deleting district:", error);
    }
  }

  return (
    <div className="space-y-6">
      {/* Create District */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" /> Create New District
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateDistrict} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>District Name</Label>
                <Input
                  placeholder="e.g., Downtown Elementary"
                  value={newDistrictName}
                  onChange={(e) => setNewDistrictName(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>District Code</Label>
                <Input
                  placeholder="e.g., DTE-001"
                  value={newDistrictCode}
                  onChange={(e) => setNewDistrictCode(e.target.value.toUpperCase())}
                  maxLength={20}
                  required
                />
              </div>
              <div>
                <Label>Description (Optional)</Label>
                <Input
                  placeholder="e.g., Main campus"
                  value={newDistrictDesc}
                  onChange={(e) => setNewDistrictDesc(e.target.value)}
                />
              </div>
            </div>
            <Button type="submit" className="w-full">
              Create District
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Districts List */}
        <Card>
          <CardHeader>
            <CardTitle>Districts ({districts.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {districts.map((district) => (
              <div
                key={district.id}
                className={`p-3 rounded-lg border cursor-pointer transition ${
                  selectedDistrict === district.id
                    ? "bg-primary/10 border-primary"
                    : "bg-secondary/50 hover:border-primary"
                }`}
                onClick={() => setSelectedDistrict(district.id)}
              >
                <div className="font-semibold">{district.name}</div>
                <div className="text-xs text-muted-foreground">{district.code}</div>
                {district.description && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {district.description}
                  </div>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  className="w-full mt-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteDistrict(district.id);
                  }}
                >
                  <Trash2 className="w-3 h-3 mr-1" /> Delete
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* District Details */}
        <Card className="lg:col-span-2">
          {selectedDistrict ? (
            <>
              <CardHeader>
                <CardTitle>District Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-cyan/10 rounded-lg p-3 text-center">
                    <Users className="w-5 h-5 mx-auto mb-2 text-cyan" />
                    <div className="font-bold text-xl">{stats.totalMembers}</div>
                    <div className="text-xs text-muted-foreground">Total Members</div>
                  </div>
                  <div className="bg-purple/10 rounded-lg p-3 text-center">
                    <BookOpen className="w-5 h-5 mx-auto mb-2 text-purple" />
                    <div className="font-bold text-xl">{stats.teachers}</div>
                    <div className="text-xs text-muted-foreground">Teachers</div>
                  </div>
                  <div className="bg-pink/10 rounded-lg p-3 text-center">
                    <GraduationCap className="w-5 h-5 mx-auto mb-2 text-pink" />
                    <div className="font-bold text-xl">{stats.students}</div>
                    <div className="text-xs text-muted-foreground">Students</div>
                  </div>
                </div>

                {/* Add Member */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Add Member</h3>
                  <form onSubmit={handleAddMember} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>User</Label>
                        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select user" />
                          </SelectTrigger>
                          <SelectContent className="max-h-48">
                            {users.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.full_name || user.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Role</Label>
                        <Select value={selectedUserRole} onValueChange={setSelectedUserRole}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="teacher">Teacher</SelectItem>
                            <SelectItem value="student">Student</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button type="submit" className="w-full">
                      Add Member
                    </Button>
                  </form>
                </div>

                {/* Members List */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Members ({members.length})</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {members.map((member) => (
                      <div
                        key={member.user_id}
                        className="flex items-center justify-between p-2 bg-secondary/50 rounded"
                      >
                        <div className="min-w-0">
                          <div className="font-sm">
                            {member.profiles?.full_name || "Unknown"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {member.profiles?.email}
                          </div>
                          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded inline-block mt-1">
                            {member.role}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRemoveMember(member.user_id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Select a district to view details</p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
