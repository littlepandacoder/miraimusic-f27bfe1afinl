import { useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface CancellationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  isLoading: boolean;
}

const CANCELLATION_REASONS = [
  { value: "too-expensive", label: "Too expensive" },
  { value: "not-using", label: "Not using the features" },
  { value: "technical-issues", label: "Technical issues" },
  { value: "found-alternative", label: "Found a better alternative" },
  { value: "temporary", label: "Temporarily pausing" },
  { value: "other", label: "Other" },
];

const CancellationDialog = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: CancellationDialogProps) => {
  const [selectedReason, setSelectedReason] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [step, setStep] = useState<"reason" | "confirm">("reason");

  const handleNext = () => {
    if (!selectedReason) return;
    setStep("confirm");
  };

  const handleConfirm = async () => {
    const finalReason =
      selectedReason === "other"
        ? otherReason || "No reason provided"
        : selectedReason;

    await onConfirm(finalReason);
  };

  const handleClose = () => {
    setStep("reason");
    setSelectedReason("");
    setOtherReason("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        {step === "reason" ? (
          <>
            <DialogHeader>
              <DialogTitle>We'd love to know why</DialogTitle>
              <DialogDescription>
                Your feedback helps us improve. What's prompting you to cancel?
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
                {CANCELLATION_REASONS.map((reason) => (
                  <div key={reason.value} className="flex items-center space-x-2">
                    <RadioGroupItem
                      value={reason.value}
                      id={reason.value}
                      className="mt-0.5"
                    />
                    <Label
                      htmlFor={reason.value}
                      className="font-normal cursor-pointer flex-1"
                    >
                      {reason.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>

              {selectedReason === "other" && (
                <div className="pt-2">
                  <Textarea
                    placeholder="Please tell us more..."
                    value={otherReason}
                    onChange={(e) => setOtherReason(e.target.value)}
                    className="min-h-20"
                  />
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleClose}>
                Keep Subscription
              </Button>
              <Button onClick={handleNext} disabled={!selectedReason}>
                Next
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 mt-0.5 shrink-0" />
                <div>
                  <DialogTitle>Cancel subscription?</DialogTitle>
                  <DialogDescription>
                    Your access to premium features will end at the end of your current billing
                    period.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="py-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm font-medium mb-2">What happens next:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex gap-2">
                  <span>•</span>
                  <span>You'll keep full access until your billing period ends</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>No further charges will be made after cancellation</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>Your progress and data will be saved</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>You can reactivate anytime</span>
                </li>
              </ul>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setStep("reason")}
                disabled={isLoading}
              >
                Back
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirm}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Cancel Subscription
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CancellationDialog;
