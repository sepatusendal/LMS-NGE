import { Card, CardContent } from "@/components/ui/card";

export function SummaryCards({ items }: { items: { label: string; value: string | number }[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} size="sm">
          <CardContent>
            <p className="text-2xl font-semibold">{item.value}</p>
            <p className="text-muted-foreground text-xs">{item.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
