import { ComplianceAlert } from "@/features/lesson-plans/compliance-alert";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Monitoring dan master data NGE English Course.
        </p>
      </div>

      <ComplianceAlert />
    </div>
  );
}
