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
      <div className="bg-card rounded-lg border border-border p-4 md:p-8">
        <div className="text-center space-y-3 md:space-y-4">
          <FileText className="w-10 md:w-12 h-10 md:h-12 text-muted-foreground mx-auto" />
          <div>
            <h3 className="text-base md:text-lg font-semibold mb-2">Payment History</h3>
            <p className="text-xs md:text-sm text-muted-foreground mb-4 md:mb-6">
              View your complete payment history and download invoices in the Stripe Billing Portal
            </p>
            <Button
              onClick={() => user?.id && openPortal(user.id)}
              disabled={portalLoading || !user?.id}
              className="w-full sm:w-auto gap-2"
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
    <div className="space-y-4 md:space-y-6">
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs md:text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-3 md:px-6 py-2 md:py-3 text-left font-semibold">Date</th>
                <th className="px-3 md:px-6 py-2 md:py-3 text-left font-semibold hidden sm:table-cell">Description</th>
                <th className="px-3 md:px-6 py-2 md:py-3 text-right font-semibold">Amount</th>
                <th className="px-3 md:px-6 py-2 md:py-3 text-center font-semibold">Status</th>
                <th className="px-3 md:px-6 py-2 md:py-3 text-center font-semibold">Invoice</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr
                  key={payment.id}
                  className="border-b border-border hover:bg-muted/30 transition-colors"
                >
                  <td className="px-3 md:px-6 py-2 md:py-4">
                    {format(new Date(payment.created_at), "MMM d")}
                  </td>
                  <td className="px-3 md:px-6 py-2 md:py-4 hidden sm:table-cell">
                    {payment.description || "Subscription"}
                  </td>
                  <td className="px-3 md:px-6 py-2 md:py-4 text-right font-medium">
                    {(payment.amount_cents / 100).toFixed(2)}
                  </td>
                  <td className="px-3 md:px-6 py-2 md:py-4 text-center">
                    <div className="flex items-center justify-center">
                      {payment.status === "succeeded" ? (
                        <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                          <CheckCircle className="w-3 md:w-4 h-3 md:h-4" />
                          <span className="text-xs font-medium hidden sm:inline">Paid</span>
                        </div>
                      ) : payment.status === "pending" ? (
                        <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
                          Pending
                        </span>
                      ) : (
                        <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                          <AlertCircle className="w-3 md:w-4 h-3 md:h-4" />
                          <span className="text-xs font-medium hidden sm:inline">Failed</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-3 md:px-6 py-2 md:py-4 text-center">
                    {payment.invoice_url || payment.receipt_url ? (
                      <a
                        href={payment.invoice_url || payment.receipt_url || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline text-xs md:text-sm"
                      >
                        <Download className="w-3 md:w-4 h-3 md:h-4" />
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
      <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800 p-3 md:p-4">
        <p className="text-xs md:text-sm text-blue-900 dark:text-blue-200">
          <strong>Need an invoice?</strong> Your invoices are available above. If you need to
          update your billing information or view additional details, visit your Stripe billing
          portal.
        </p>
      </div>
    </div>
  );
};

export default PaymentHistoryTab;
