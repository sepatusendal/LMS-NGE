import { ComplianceAlert } from "@/features/lesson-plans/compliance-alert";

export default function MonitoringPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Monitoring</h1>
        <p className="text-muted-foreground text-sm">
          Pantau kepatuhan lesson plan dan kualitas pengajaran.
        </p>
      </div>

      <ComplianceAlert />
    </div>
  );
}
