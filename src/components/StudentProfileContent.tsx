import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { profileService } from "@/lib/profileService";
import AccountSettingsTab from "./profile/AccountSettingsTab";
import SubscriptionTab from "./profile/SubscriptionTab";
import PaymentHistoryTab from "./profile/PaymentHistoryTab";

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
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-6">
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="subscription">Subscription</TabsTrigger>
        <TabsTrigger value="payments">Billing</TabsTrigger>
      </TabsList>

      <TabsContent value="account" className="space-y-6">
        <AccountSettingsTab profile={profile} userId={userId} onProfileUpdate={setProfile} />
      </TabsContent>

      <TabsContent value="subscription" className="space-y-6">
        <SubscriptionTab subscription={subscription} userId={userId} />
      </TabsContent>

      <TabsContent value="payments" className="space-y-6">
        <PaymentHistoryTab payments={payments} />
      </TabsContent>
    </Tabs>
  );
};

export default StudentProfileContent;
