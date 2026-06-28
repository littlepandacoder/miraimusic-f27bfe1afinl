import { useState } from "react";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { profileService } from "@/lib/profileService";

interface AccountSettingsTabProps {
  profile: any;
  userId: string;
  onProfileUpdate: (profile: any) => void;
}

const AccountSettingsTab = ({
  profile,
  userId,
  onProfileUpdate,
}: AccountSettingsTabProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [formData, setFormData] = useState({
    firstName: profile?.first_name || "",
    lastName: profile?.last_name || "",
    email: profile?.email || "",
  });

  const [passwordData, setPasswordData] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  const { toast } = useToast();

  const handleNameChange = async () => {
    try {
      setIsSavingProfile(true);
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();

      const updated = await profileService.updateProfile(userId, {
        first_name: formData.firstName,
        last_name: formData.lastName,
        full_name: fullName,
      });

      onProfileUpdate(updated);
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordChange = async () => {
    try {
      if (passwordData.new !== passwordData.confirm) {
        toast({
          title: "Error",
          description: "New passwords do not match",
          variant: "destructive",
        });
        return;
      }

      if (passwordData.new.length < 6) {
        toast({
          title: "Error",
          description: "Password must be at least 6 characters",
          variant: "destructive",
        });
        return;
      }

      setIsChangingPassword(true);
      await profileService.changePassword(
        passwordData.current,
        passwordData.new
      );

      setPasswordData({ current: "", new: "", confirm: "" });
      setIsChangingPassword(false);

      toast({
        title: "Success",
        description: "Password changed successfully. Please sign in again.",
      });

      // Redirect to login after a delay
      setTimeout(() => {
        window.location.href = "/login";
      }, 1500);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to change password",
        variant: "destructive",
      });
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Name Settings */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold">Personal Information</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Update your name and email
            </p>
          </div>
          {!isEditing && (
            <Button
              variant="outline"
              onClick={() => setIsEditing(true)}
            >
              Edit
            </Button>
          )}
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">First Name</label>
              <Input
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                disabled={!isEditing}
                className="disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Last Name</label>
              <Input
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
                disabled={!isEditing}
                className="disabled:opacity-60"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <Input
              value={formData.email}
              disabled
              className="disabled:opacity-60"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Email changes require verification. Contact support if needed.
            </p>
          </div>

          {isEditing && (
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleNameChange}
                disabled={isSavingProfile}
                className="flex items-center gap-2"
              >
                {isSavingProfile && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Changes
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setFormData({
                    firstName: profile?.first_name || "",
                    lastName: profile?.last_name || "",
                    email: profile?.email || "",
                  });
                }}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Password Settings */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div>
          <h3 className="text-lg font-semibold mb-1">Change Password</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Update your password to keep your account secure
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Current Password
            </label>
            <div className="relative">
              <Input
                type={showPasswords.current ? "text" : "password"}
                value={passwordData.current}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, current: e.target.value })
                }
                placeholder="Enter your current password"
              />
              <button
                type="button"
                onClick={() =>
                  setShowPasswords({
                    ...showPasswords,
                    current: !showPasswords.current,
                  })
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPasswords.current ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">New Password</label>
            <div className="relative">
              <Input
                type={showPasswords.new ? "text" : "password"}
                value={passwordData.new}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, new: e.target.value })
                }
                placeholder="Enter a new password"
              />
              <button
                type="button"
                onClick={() =>
                  setShowPasswords({
                    ...showPasswords,
                    new: !showPasswords.new,
                  })
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPasswords.new ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <Input
                type={showPasswords.confirm ? "text" : "password"}
                value={passwordData.confirm}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, confirm: e.target.value })
                }
                placeholder="Confirm your new password"
              />
              <button
                type="button"
                onClick={() =>
                  setShowPasswords({
                    ...showPasswords,
                    confirm: !showPasswords.confirm,
                  })
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPasswords.confirm ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <Button
            onClick={handlePasswordChange}
            disabled={
              isChangingPassword ||
              !passwordData.current ||
              !passwordData.new ||
              !passwordData.confirm
            }
            className="w-full flex items-center justify-center gap-2"
          >
            {isChangingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
            Change Password
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AccountSettingsTab;
