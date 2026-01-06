'use client';
import { KpiCards } from '@/components/dashboard/kpi-cards';
import { OverviewChart } from '@/components/dashboard/overview-chart';
import { RecentProjects } from '@/components/dashboard/recent-projects';
import { useCollection, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, getDocs, Timestamp, where } from 'firebase/firestore';
import type { Project, TestCase, TestExecutionRun, TestExecutionResult } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState, useMemo } from 'react';

interface AggregatedData {
    testCases: TestCase[];
    executions: TestExecutionRun[];
    latestResults: Map<string, TestExecutionResult>;
}

export default function DashboardPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [allProjectsData, setAllProjectsData] = useState<AggregatedData>({ testCases: [], executions: [], latestResults: new Map() });
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
        if (areProjectsLoading) return; // Wait until projects are loaded
        if (!projects || !user || !firestore) {
            setIsDataLoading(false);
            setAllProjectsData({ testCases: [], executions: [], latestResults: new Map() });
            return;
        };

        if (projects.length === 0) {
            setIsDataLoading(false);
            setAllProjectsData({ testCases: [], executions: [], latestResults: new Map() });
            return;
        }

        setIsDataLoading(true);
        const fetchAllData = async () => {
            const testCasesPromises = projects.map(p => getDocs(query(collection(firestore, `users/${user.uid}/projects/${p.id}/testCases`), where('status', '==', 'Approved'))));
            const executionsPromises = projects.map(p => getDocs(query(collection(firestore, `users/${user.uid}/projects/${p.id}/testExecutions`))));

            const testCasesSnaps = await Promise.all(testCasesPromises);
            const executionsSnaps = await Promise.all(executionsPromises);

            const allTestCases = testCasesSnaps.flatMap(snap => snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TestCase)));
            const allExecutions = executionsSnaps.flatMap(snap => snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TestExecutionRun)));
            
            const latestResults = new Map<string, TestExecutionResult & { executionDate: Timestamp }>();
            allExecutions.forEach(run => {
                if (!run.createdAt || typeof run.createdAt.toMillis !== 'function') return;
                run.results.forEach(result => {
                    const existing = latestResults.get(result.testCaseId);
                    if (!existing || (existing.executionDate && typeof existing.executionDate.toMillis === 'function' && run.createdAt.toMillis() > existing.executionDate.toMillis())) {
                        latestResults.set(result.testCaseId, { ...result, executionDate: run.createdAt });
                    }
                });
            });

            const finalLatestResults = new Map<string, TestExecutionResult>();
            latestResults.forEach((value, key) => {
                const { executionDate, ...result } = value;
                finalLatestResults.set(key, result);
            });


            setAllProjectsData({
                testCases: allTestCases,
                executions: allExecutions,
                latestResults: finalLatestResults,
            });
            setIsDataLoading(false);
        };
        
        fetchAllData();

    }, [projects, user, firestore, areProjectsLoading]);
    
    const isLoading = areProjectsLoading || areRecentProjectsLoading || isDataLoading;

    if (isLoading) {
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
                <KpiCards 
                    projects={projects || []} 
                    testCases={allProjectsData.testCases} 
                    latestResults={allProjectsData.latestResults} 
                />
            </div>
            <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
                <OverviewChart testCases={allProjectsData.testCases} latestResults={allProjectsData.latestResults} />
                <RecentProjects projects={recentProjects || []}/>
            </div>
        </>
    )
}
