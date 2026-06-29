import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { profileService } from "@/lib/profileService";
import AccountSettingsTab from "./profile/AccountSettingsTab";
import SubscriptionTab from "./profile/SubscriptionTab";

interface StudentProfileContentProps {
  userId: string;
}

const StudentProfileContent = ({ userId }: StudentProfileContentProps) => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("account");

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [profileData, subscriptionData, paymentsData] = await Promise.all([
          profileService.getProfile(userId),
          profileService.getSubscriptionInfo(userId),
          profileService.getPaymentHistory(userId),
        ]);

        setProfile(profileData);
        setSubscription(subscriptionData);
        setPayments(paymentsData);
      } catch (err: any) {
        console.error("Error loading profile data:", err);
        toast({
          title: "Error",
          description: err.message || "Failed to load profile data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userId, toast]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8 md:py-12">
        <Loader2 className="w-6 md:w-8 h-6 md:h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-4 md:mb-6">
        <TabsTrigger value="account" className="text-xs md:text-sm">Account</TabsTrigger>
        <TabsTrigger value="subscription" className="text-xs md:text-sm">Subscription</TabsTrigger>
      </TabsList>

      <TabsContent value="account" className="space-y-4 md:space-y-6">
        <AccountSettingsTab profile={profile} userId={userId} onProfileUpdate={setProfile} />
      </TabsContent>

      <TabsContent value="subscription" className="space-y-4 md:space-y-6">
        <SubscriptionTab subscription={subscription} userId={userId} />
      </TabsContent>
    </Tabs>
  );
};

export default StudentProfileContent;
