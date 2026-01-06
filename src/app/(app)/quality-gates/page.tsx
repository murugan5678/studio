'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import type { Project, TestCase, TestExecutionRun, Defect, DeploymentApproval, QualityGateConfig } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Progress } from '@/components/ui/progress';

interface ProjectWithQualityData extends Project {
    quality: {
        passPercentage: number;
        openBugs: { critical: number, high: number, medium: number };
        approvalStatus: DeploymentApproval['status'];
    };
}

const statusVariant: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
  'Not Ready': 'outline',
  'Ready for Production': 'secondary',
  'Approved for Deployment': 'default',
  'Blocked': 'destructive',
};

export default function QualityGatesPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const [projectsData, setProjectsData] = useState<ProjectWithQualityData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const projectsQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return collection(firestore, `users/${user.uid}/projects`);
    }, [user, firestore]);

    const { data: projects, isLoading: areProjectsLoading } = useCollection<Project>(projectsQuery);

    useEffect(() => {
        if (areProjectsLoading) {
            setIsLoading(true);
            return;
        }
        if (!projects || projects.length === 0 || !user || !firestore) {
            setIsLoading(false);
            return;
        }

        const fetchProjectsData = async () => {
            setIsLoading(true);
            const enrichedData = await Promise.all(projects.map(async (project) => {
                const tcQuery = query(collection(firestore, `users/${user.uid}/projects/${project.id}/testCases`));
                const execQuery = query(collection(firestore, `users/${user.uid}/projects/${project.id}/testExecutions`));
                const defectQuery = query(collection(firestore, `users/${user.uid}/projects/${project.id}/defects`));
                const approvalQuery = query(collection(firestore, `users/${user.uid}/projects/${project.id}/deploymentApproval`));

                const [tcSnap, execSnap, defectSnap, approvalSnap] = await Promise.all([
                    getDocs(tcQuery),
                    getDocs(execSnap),
                    getDocs(defectQuery),
                    getDocs(approvalQuery)
                ]);

                const testCases = tcSnap.docs.map(d => d.data() as TestCase);
                const executions = execSnap.docs.map(d => d.data() as TestExecutionRun);
                const defects = defectSnap.docs.map(d => d.data() as Defect);
                const approvalDoc = approvalSnap.docs?.[0]?.data() as DeploymentApproval | undefined;
                
                let passed = 0;
                let totalExecuted = 0;
                executions.forEach(run => {
                    run.results.forEach(res => {
                        totalExecuted++;
                        if (res.status === 'Passed') passed++;
                    })
                });

                const openBugs = { critical: 0, high: 0, medium: 0 };
                defects.forEach(d => {
                    if (d.status === 'Open') {
                        if (d.severity === 'Critical') openBugs.critical++;
                        if (d.severity === 'High') openBugs.high++;
                        if (d.severity === 'Medium') openBugs.medium++;
                    }
                });

                return {
                    ...project,
                    quality: {
                        passPercentage: totalExecuted > 0 ? Math.round((passed / totalExecuted) * 100) : 0,
                        openBugs,
                        approvalStatus: approvalDoc?.status ?? 'Not Ready'
                    }
                } as ProjectWithQualityData;
            }));

            setProjectsData(enrichedData);
            setIsLoading(false);
        };
        fetchProjectsData();
    }, [projects, user, firestore, areProjectsLoading]);
    
    if (isLoading) {
        return (
            <Card>
                <CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>{Array.from({length: 4}).map((_, i) => <TableHead key={i}><Skeleton className="h-5 w-full"/></TableHead>)}</TableRow>
                        </TableHeader>
                        <TableBody>
                            {Array.from({length: 3}).map((_, i) => (
                                <TableRow key={i}>{Array.from({length: 4}).map((_, j) => <TableCell key={j}><Skeleton className="h-6 w-full"/></TableCell>)}</TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Quality Gates & Production Readiness</h1>
                <p className="text-muted-foreground">An overview of each project's readiness for deployment based on its quality gate.</p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Project Readiness Status</CardTitle>
                    <CardDescription>Click on a project to view and configure its quality gate and approval status.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Project</TableHead>
                                <TableHead>Pass Rate</TableHead>
                                <TableHead>Open Bugs</TableHead>
                                <TableHead>Readiness Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {projectsData.length > 0 ? projectsData.map(p => (
                                <TableRow key={p.id} className="cursor-pointer" onClick={() => router.push(`/quality-gates/${p.id}`)}>
                                    <TableCell className="font-medium">{p.name}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Progress value={p.quality.passPercentage} className="w-24 h-2"/>
                                            <span>{p.quality.passPercentage}%</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-xs">
                                           <Badge variant="destructive" className="px-1.5 py-0.5">{p.quality.openBugs.critical} C</Badge>
                                           <Badge variant="destructive" className="px-1.5 py-0.5 bg-amber-500 hover:bg-amber-600">{p.quality.openBugs.high} H</Badge>
                                           <Badge variant="secondary" className="px-1.5 py-0.5">{p.quality.openBugs.medium} M</Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={statusVariant[p.quality.approvalStatus]}>
                                            {p.quality.approvalStatus}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        No projects found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
