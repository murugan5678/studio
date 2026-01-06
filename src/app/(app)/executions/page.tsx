'use client';

import { useFirestore, useUser } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';
import type { TestExecutionRun, Project } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface FullExecutionRun extends TestExecutionRun {
    projectName: string;
}

export default function ExecutionsPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const [allRuns, setAllRuns] = useState<FullExecutionRun[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user || !firestore) {
            setIsLoading(false);
            return;
        }

        const fetchAllExecutions = async () => {
            setIsLoading(true);
            const projectsRef = collection(firestore, `users/${user.uid}/projects`);
            const projectsSnap = await getDocs(projectsRef);

            if (projectsSnap.empty) {
                setAllRuns([]);
                setIsLoading(false);
                return;
            }

            const projects = projectsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Project[];
            const projectMap = new Map(projects.map(p => [p.id, p.name]));

            const allRunsPromises = projects.map(async (project) => {
                const executionsRef = collection(firestore, `users/${user.uid}/projects/${project.id}/testExecutions`);
                const executionsSnap = await getDocs(executionsRef);
                return executionsSnap.docs.map(doc => {
                    const run = doc.data() as TestExecutionRun;
                    return {
                        ...run,
                        id: doc.id,
                        projectName: projectMap.get(run.projectId) || 'Unknown Project'
                    } as FullExecutionRun;
                });
            });

            const runsByProject = await Promise.all(allRunsPromises);
            const flattenedRuns = runsByProject.flat();

            if (flattenedRuns.length > 0 && flattenedRuns[0].createdAt) {
                flattenedRuns.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
            }

            setAllRuns(flattenedRuns);
            setIsLoading(false);
        };

        fetchAllExecutions();
    }, [user, firestore]);

    const getRunStats = (run: TestExecutionRun) => {
        const passed = run.results.filter(r => r.status === 'Passed').length;
        const failed = run.results.filter(r => r.status === 'Failed').length;
        const total = run.results.length;
        return { passed, failed, total };
    }

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-1/4" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                                <TableHead><Skeleton className="h-5 w-32" /></TableHead>
                                <TableHead><Skeleton className="h-5 w-20" /></TableHead>
                                <TableHead><Skeleton className="h-5 w-20" /></TableHead>
                                <TableHead><Skeleton className="h-5 w-20" /></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        )
    }


    return (
        <Card>
            <CardHeader>
                <CardTitle>All Test Executions</CardTitle>
                <CardDescription>A list of all test execution runs across all of your projects.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Run Title</TableHead>
                            <TableHead>Project</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Results</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {allRuns.length > 0 ? (
                            allRuns.map(run => {
                                const stats = getRunStats(run);
                                return (
                                    <TableRow key={run.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/projects/${run.projectId}/executions/${run.id}`)}>
                                        <TableCell className="font-medium">{run.title}</TableCell>
                                        <TableCell>
                                            <Link href={`/projects/${run.projectId}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
                                                {run.projectName}
                                            </Link>
                                        </TableCell>
                                        <TableCell>{run.createdAt?.toDate().toLocaleDateString() || 'N/A'}</TableCell>
                                        <TableCell>
                                            {stats.passed} Passed, {stats.failed} Failed ({stats.total} total)
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={stats.failed > 0 ? 'destructive' : 'secondary'}>
                                                {stats.failed > 0 ? 'Failed' : 'Passed'}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    No execution runs found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
