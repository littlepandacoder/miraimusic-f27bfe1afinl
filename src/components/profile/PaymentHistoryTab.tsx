import { Download, FileText, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useBillingPortal } from "@/hooks/useBillingPortal";

interface Payment {
  id: string;
  amount_cents: number;
  currency: string;
  status: string;
  description: string | null;
  invoice_url: string | null;
  receipt_url: string | null;
  created_at: string;
}

interface PaymentHistoryTabProps {
  payments: Payment[];
}

const PaymentHistoryTab = ({ payments }: PaymentHistoryTabProps) => {
  const { user } = useAuth();
  const { openPortal, loading: portalLoading } = useBillingPortal();

  if (!payments || payments.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-8">
        <div className="text-center space-y-4">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto" />
          <div>
            <h3 className="text-lg font-semibold mb-2">Payment History</h3>
            <p className="text-muted-foreground mb-6">
              View your complete payment history and download invoices in the Stripe Billing Portal
            </p>
            <Button
              onClick={() => user?.id && openPortal(user.id)}
              disabled={portalLoading || !user?.id}
              className="gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open Billing Portal
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-3 text-left text-sm font-semibold">Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Description</th>
                <th className="px-6 py-3 text-right text-sm font-semibold">Amount</th>
                <th className="px-6 py-3 text-center text-sm font-semibold">Status</th>
                <th className="px-6 py-3 text-center text-sm font-semibold">Invoice</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr
                  key={payment.id}
                  className="border-b border-border hover:bg-muted/30 transition-colors"
                >
                  <td className="px-6 py-4 text-sm">
                    {format(new Date(payment.created_at), "MMM d, yyyy")}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {payment.description || "Subscription"}
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-medium">
                    {(payment.amount_cents / 100).toFixed(2)} {payment.currency}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center">
                      {payment.status === "succeeded" ? (
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-xs font-medium">Paid</span>
                        </div>
                      ) : payment.status === "pending" ? (
                        <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
                          Pending
                        </span>
                      ) : (
                        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-xs font-medium">Failed</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {payment.invoice_url || payment.receipt_url ? (
                      <a
                        href={payment.invoice_url || payment.receipt_url || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline text-sm"
                      >
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Download</span>
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
        <p className="text-sm text-blue-900 dark:text-blue-200">
          <strong>Need an invoice?</strong> Your invoices are available above. If you need to
          update your billing information or view additional details, visit your Stripe billing
          portal.
        </p>
      </div>
    </div>
  );
};

export default PaymentHistoryTab;
