'use client';
import { KpiCards } from '@/components/dashboard/kpi-cards';
import { OverviewChart } from '@/components/dashboard/overview-chart';
import { RecentProjects } from '@/components/dashboard/recent-projects';
import { useCollection, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import type { Project } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
    const { user } = useUser();
    const firestore = useFirestore();

    const projectsQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return collection(firestore, `users/${user.uid}/projects`);
    }, [user, firestore]);

    const recentProjectsQuery = useMemoFirebase(() => {
        if (!projectsQuery) return null;
        return query(projectsQuery, orderBy('createdAt', 'desc'), limit(5));
    }, [projectsQuery]);

    const { data: projects, isLoading: areProjectsLoading } = useCollection<Project>(projectsQuery);
    const { data: recentProjects, isLoading: areRecentProjectsLoading } = useCollection<Project>(recentProjectsQuery);

    if (areProjectsLoading || areRecentProjectsLoading) {
        return (
            <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
                </div>
                <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3 mt-4">
                    <Skeleton className="h-96 w-full xl:col-span-2" />
                    <Skeleton className="h-96 w-full" />
                </div>
            </>
        )
    }
    
    return (
        <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <KpiCards projects={projects || []} />
            </div>
            <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
                <OverviewChart projects={projects || []} />
                <RecentProjects projects={recentProjects || []}/>
            </div>
        </>
    )
}
