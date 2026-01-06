import { KpiCards } from "@/components/dashboard/kpi-cards";
import { OverviewChart } from "@/components/dashboard/overview-chart";
import { RecentProjects } from "@/components/dashboard/recent-projects";

export default function DashboardPage() {
    return (
        <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <KpiCards />
            </div>
            <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
                <OverviewChart />
                <RecentProjects />
            </div>
        </>
    )
}