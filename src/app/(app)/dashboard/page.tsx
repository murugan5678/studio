'use client';
import { KpiCards } from '@/components/dashboard/kpi-cards';
import { OverviewChart } from '@/components/dashboard/overview-chart';
import { RecentProjects } from '@/components/dashboard/recent-projects';
import { useCollection, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import type { Project, TestCase, TestExecutionRun } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';

interface ProjectData {
    testCases: TestCase[];
    executions: TestExecutionRun[];
}

export default function DashboardPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [allProjectsData, setAllProjectsData] = useState<ProjectData>({ testCases: [], executions: [] });
    const [isDataLoading, setIsDataLoading] = useState(true);

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

    useEffect(() => {
        if (!projects || !user || !firestore) {
            if(!areProjectsLoading) setIsDataLoading(false);
            return;
        };

        setIsDataLoading(true);
        const fetchAllData = async () => {
            const testCasesPromises = projects.map(p => getDocs(collection(firestore, `users/${user.uid}/projects/${p.id}/testCases`)));
            const executionsPromises = projects.map(p => getDocs(collection(firestore, `users/${user.uid}/projects/${p.id}/testExecutions`)));

            const testCasesSnaps = await Promise.all(testCasesPromises);
            const executionsSnaps = await Promise.all(executionsPromises);

            const allTestCases = testCasesSnaps.flatMap(snap => snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TestCase)));
            const allExecutions = executionsSnaps.flatMap(snap => snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TestExecutionRun)));

            setAllProjectsData({
                testCases: allTestCases,
                executions: allExecutions
            });
            setIsDataLoading(false);
        };
        
        fetchAllData();

    }, [projects, user, firestore, areProjectsLoading]);


    if (areProjectsLoading || areRecentProjectsLoading || isDataLoading) {
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
                <KpiCards projects={projects || []} testCases={allProjectsData.testCases} executions={allProjectsData.executions} />
            </div>
            <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
                <OverviewChart executions={allProjectsData.executions} />
                <RecentProjects projects={recentProjects || []}/>
            </div>
        </>
    )
}
