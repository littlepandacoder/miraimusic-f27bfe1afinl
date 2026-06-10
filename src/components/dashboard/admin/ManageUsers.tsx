import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Loader2, Pencil, Trash2, Pause, Play } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface UserWithRole {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
}

interface SubscriptionInfo {
  id: string;
  status: string;
  paused_at: string | null;
  pause_reason: string | null;
}

const ManageUsers = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [subscriptions, setSubscriptions] = useState<Record<string, SubscriptionInfo>>({});
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", full_name: "", password: "", role: "student" });
  const [isCreating, setIsCreating] = useState(false);

  // Edit dialog state
  const [editTarget, setEditTarget] = useState<UserWithRole | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", email: "", password: "" });
  const [isSaving, setIsSaving] = useState(false);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<UserWithRole | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Pause/Resume dialog state
  const [pauseTarget, setPauseTarget] = useState<UserWithRole | null>(null);
  const [pauseReason, setPauseReason] = useState("");
  const [isPauseLoading, setIsPauseLoading] = useState(false);

  const { toast } = useToast();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Use the admin RPC to get all user roles (bypasses RLS without recursion)
      const { data: roleRows, error: roleError } = await (supabase as any)
        .rpc("admin_get_all_user_roles");

      if (roleError) {
        console.error("Error fetching roles:", roleError);
        toast({ title: "Error loading users", description: roleError.message, variant: "destructive" });
        setLoading(false);
        return;
      }

      // Fetch profiles for display names
      const { data: profiles } = await (supabase as any)
        .from("profiles")
        .select("user_id, email, full_name, created_at");

      const profileMap: Record<string, any> = {};
      (profiles || []).forEach((p: any) => { profileMap[p.user_id] = p; });

      // Fetch subscriptions
      const { data: subs } = await (supabase as any)
        .from("user_subscriptions")
        .select("id, user_id, status, paused_at, pause_reason");

      const subsMap: Record<string, SubscriptionInfo> = {};
      (subs || []).forEach((s: any) => { subsMap[s.user_id] = s; });
      setSubscriptions(subsMap);

      // Merge roles with profile info
      const merged: UserWithRole[] = (roleRows || []).map((r: any) => {
        const profile = profileMap[r.user_id];
        return {
          id: r.user_id,
          email: profile?.email || r.user_id,
          full_name: profile?.full_name || "—",
          role: r.role,
          created_at: profile?.created_at || new Date().toISOString(),
        };
      });

      // Deduplicate by user_id, keeping highest-privilege role
      const roleOrder: Record<string, number> = { admin: 3, teacher: 2, student: 1 };
      const deduped: Record<string, UserWithRole> = {};
      for (const u of merged) {
        if (!deduped[u.id] || (roleOrder[u.role] || 0) > (roleOrder[deduped[u.id].role] || 0)) {
          deduped[u.id] = u;
        }
      }

      setUsers(Object.values(deduped));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.full_name || !newUser.password) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: { email: newUser.email, password: newUser.password, full_name: newUser.full_name, role: newUser.role },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "User created", description: `Account created for ${newUser.email}` });
      setNewUser({ email: "", full_name: "", password: "", role: "student" });
      setIsDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast({ title: "Error creating user", description: error.message, variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      // Use admin RPC functions — direct writes to user_roles are blocked by RLS
      await (supabase as any).rpc("admin_remove_role", { _user_id: userId, _role: users.find(u => u.id === userId)?.role || "student" });
      const { error } = await (supabase as any).rpc("admin_assign_role", { _user_id: userId, _role: newRole });
      if (error) throw error;

      toast({ title: "Role updated" });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (error: any) {
      toast({ title: "Error updating role", description: error.message, variant: "destructive" });
    }
  };

  const openEdit = (user: UserWithRole) => {
    setEditTarget(user);
    setEditForm({ full_name: user.full_name === "—" ? "" : user.full_name, email: user.email, password: "" });
  };

  const handleEditUser = async () => {
    if (!editTarget) return;
    setIsSaving(true);
    try {
      const body: Record<string, string> = { userId: editTarget.id };
      if (editForm.full_name) body.full_name = editForm.full_name;
      if (editForm.email) body.email = editForm.email;
      if (editForm.password) body.password = editForm.password;

      const { data, error } = await supabase.functions.invoke("update-user", { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "User updated" });
      setEditTarget(null);
      fetchUsers();
    } catch (error: any) {
      toast({ title: "Error updating user", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-user", { body: { userId: deleteTarget.id } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "User deleted" });
      setDeleteTarget(null);
      setUsers(prev => prev.filter(u => u.id !== deleteTarget.id));
    } catch (error: any) {
      toast({ title: "Error deleting user", description: error.message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePauseMembership = async () => {
    if (!pauseTarget) return;
    setIsPauseLoading(true);
    try {
      const isPaused = subscriptions[pauseTarget.id]?.paused_at !== null;
      const { data, error } = await (supabase as any).rpc("admin_pause_membership", {
        _user_id: pauseTarget.id,
        _pause: !isPaused,
        _reason: pauseReason || null,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: data.message || (isPaused ? "Membership resumed" : "Membership paused") });
      setPauseTarget(null);
      setPauseReason("");
      fetchUsers();
    } catch (error: any) {
      toast({ title: "Error updating membership", description: error.message, variant: "destructive" });
    } finally {
      setIsPauseLoading(false);
    }
  };

  const handleGrantSubscription = async (userId: string) => {
    try {
      const { error } = await (supabase as any).from("user_subscriptions").insert({
        user_id: userId,
        subscription_id: "admin-granted",
        plan_id: "admin-granted",
        status: "active",
      });

      if (error) throw error;

      toast({ title: "Subscription granted", description: "Student now has active membership" });
      fetchUsers();
    } catch (error: any) {
      toast({ title: "Error granting subscription", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <h2 className="text-xl font-semibold">User Management</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-primary">
              <UserPlus className="w-4 h-4 mr-2" />
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  placeholder="John Doe"
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="john@example.com"
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Temporary password"
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v })}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateUser} disabled={isCreating} className="w-full btn-primary">
                {isCreating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : "Create User"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading users...
            </div>
          ) : users.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No users found.</p>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <div className="min-w-[480px] px-6">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Membership</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => {
                      const sub = subscriptions[user.id];
                      const isPaused = sub?.paused_at !== null;
                      return (
                        <TableRow key={user.id} className="border-border">
                          <TableCell className="font-medium">{user.full_name}</TableCell>
                          <TableCell className="max-w-[160px] truncate">{user.email}</TableCell>
                          <TableCell>
                            <Select value={user.role} onValueChange={(v) => handleChangeRole(user.id, v)}>
                              <SelectTrigger className="w-28 bg-secondary border-border">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="student">Student</SelectItem>
                                <SelectItem value="teacher">Teacher</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            {isPaused ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100 rounded text-xs font-medium">
                                <Pause className="w-3 h-3" />
                                Paused
                              </span>
                            ) : sub ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100 rounded text-xs font-medium">
                                <Play className="w-3 h-3" />
                                Active
                              </span>
                            ) : user.role === "student" ? (
                              <span className="text-xs text-muted-foreground">Pending subscription</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 rounded text-xs font-medium">
                                <Play className="w-3 h-3" />
                                Staff Access
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground whitespace-nowrap">
                            {new Date(user.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {sub && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className={`h-8 w-8 ${isPaused ? "text-green-600 hover:text-green-700" : "text-yellow-600 hover:text-yellow-700"}`}
                                  onClick={() => setPauseTarget(user)}
                                  title={isPaused ? "Resume membership" : "Pause membership"}
                                >
                                  {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                                </Button>
                              )}
                              {!sub && user.role === "student" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  onClick={() => handleGrantSubscription(user.id)}
                                  title="Grant subscription"
                                >
                                  Grant
                                </Button>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                onClick={() => openEdit(user)}
                                title="Edit user"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => setDeleteTarget(user)}
                                title="Delete user"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                placeholder="Full name"
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                placeholder="Email"
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>New Password <span className="text-muted-foreground text-xs">(leave blank to keep current)</span></Label>
              <Input
                type="password"
                value={editForm.password}
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                placeholder="New password"
                className="bg-secondary border-border"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={handleEditUser} disabled={isSaving} className="flex-1 btn-primary">
                {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Save Changes"}
              </Button>
              <Button variant="outline" onClick={() => setEditTarget(null)} className="flex-1">Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to permanently delete <span className="text-foreground font-medium">{deleteTarget?.email}</span>? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                variant="destructive"
                onClick={handleDeleteUser}
                disabled={isDeleting}
                className="flex-1"
              >
                {isDeleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting...</> : "Delete User"}
              </Button>
              <Button variant="outline" onClick={() => setDeleteTarget(null)} className="flex-1">Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pause/Resume Membership Dialog */}
      <Dialog open={!!pauseTarget} onOpenChange={(open) => { if (!open) { setPauseTarget(null); setPauseReason(""); } }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>
              {subscriptions[pauseTarget?.id!]?.paused_at ? "Resume Membership" : "Pause Membership"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              {subscriptions[pauseTarget?.id!]?.paused_at
                ? `Resume membership for ${pauseTarget?.email}? They will regain access to courses.`
                : `Pause membership for ${pauseTarget?.email}? They will lose access to courses.`}
            </p>
            {!subscriptions[pauseTarget?.id!]?.paused_at && (
              <div className="space-y-2">
                <Label htmlFor="pauseReason">Pause Reason (optional)</Label>
                <Textarea
                  id="pauseReason"
                  value={pauseReason}
                  onChange={(e) => setPauseReason(e.target.value)}
                  placeholder="e.g., Student requested, Temporary freeze..."
                  className="bg-secondary border-border"
                  rows={3}
                />
              </div>
            )}
            <div className="flex gap-3">
              <Button
                onClick={handlePauseMembership}
                disabled={isPauseLoading}
                className={subscriptions[pauseTarget?.id!]?.paused_at ? "flex-1 bg-green-600 hover:bg-green-700" : "flex-1 btn-primary"}
              >
                {isPauseLoading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Updating...</>
                ) : subscriptions[pauseTarget?.id!]?.paused_at ? (
                  <>Resume Membership</>
                ) : (
                  <>Pause Membership</>
                )}
              </Button>
              <Button variant="outline" onClick={() => { setPauseTarget(null); setPauseReason(""); }} className="flex-1">Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageUsers;
