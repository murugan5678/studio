import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Folder, Beaker, CheckCircle, XCircle, Percent, PauseCircle } from "lucide-react";

const kpiData = [
  { title: "Total Projects", value: "12", icon: Folder, color: "text-sky-500" },
  { title: "Total Test Cases", value: "2,389", icon: Beaker, color: "text-amber-500" },
  { title: "Passed", value: "1,982", icon: CheckCircle, color: "text-green-500" },
  { title: "Failed", value: "321", icon: XCircle, color: "text-red-500" },
  { title: "Execution Completed", value: "85%", icon: Percent, color: "text-indigo-500" },
  { title: "Deferred / Blocked", value: "86", icon: PauseCircle, color: "text-gray-500" },
];

export function KpiCards() {
  return (
    <>
      {kpiData.slice(0, 4).map((item, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
            <item.icon className={`h-4 w-4 text-muted-foreground ${item.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{item.value}</div>
            <p className="text-xs text-muted-foreground">
                {/* Dummy data */}
                +20.1% from last month 
            </p>
          </CardContent>
        </Card>
      ))}
    </>
  );
}
