'use client';

import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
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
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PlayCircle, Bug } from 'lucide-react';

export default function ProjectExecutionsPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const params = useParams() as { projectId: string };

    const executionsQuery = useMemoFirebase(() => {
        if (!user || !firestore || !params.projectId) return null;
        return query(collection(firestore, `users/${user.uid}/projects/${params.projectId}/testExecutions`), orderBy('createdAt', 'desc'));
    }, [user, firestore, params.projectId]);

    const { data: executionRuns, isLoading: areExecutionsLoading } = useCollection<TestExecutionRun>(executionsQuery);

    const getRunStats = (run: TestExecutionRun) => {
        const passed = run.results.filter(r => r.status === 'Passed').length;
        const failed = run.results.filter(r => r.status === 'Failed').length;
        const total = run.results.length;
        const hasBugs = run.results.some(r => r.bugLink && r.bugLink.trim() !== '');
        return { passed, failed, total, hasBugs };
    };

    if (areExecutionsLoading) {
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
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
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
            <CardHeader className='flex-row items-center justify-between'>
                <div>
                    <CardTitle>Test Executions</CardTitle>
                    <CardDescription>Execution history for this project.</CardDescription>
                </div>
                 <Button asChild>
                    <Link href={`/projects/${params.projectId}/executions/new`}>
                        <PlayCircle className="mr-2 h-4 w-4" /> New Execution Run
                    </Link>
                </Button>
            </CardHeader>
            <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Run Title</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Results</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Bugs</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {areExecutionsLoading && (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                Loading execution runs...
                            </TableCell>
                        </TableRow>
                    )}
                    {!areExecutionsLoading && executionRuns && executionRuns.length > 0 ? (
                        executionRuns.map(run => {
                            const stats = getRunStats(run);
                            return (
                                <TableRow key={run.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/projects/${params.projectId}/executions/${run.id}`)}>
                                    <TableCell className="font-medium">{run.title}</TableCell>
                                    <TableCell>{run.createdAt.toDate().toLocaleDateString()}</TableCell>
                                    <TableCell>
                                        {stats.passed} Passed, {stats.failed} Failed ({stats.total} total)
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={stats.failed > 0 ? 'destructive' : 'secondary'}>
                                            {stats.failed > 0 ? 'Failed' : 'Passed'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {stats.hasBugs && (
                                            <Link href={`/projects/${params.projectId}/executions/${run.id}`} className="flex items-center text-primary hover:underline">
                                                <Bug className="h-4 w-4" />
                                            </Link>
                                        )}
                                    </TableCell>
                                </TableRow>
                            )
                        })
                    ) : (
                        !areExecutionsLoading && (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    No execution runs yet.
                                </TableCell>
                            </TableRow>
                        )
                    )}
                </TableBody>
            </Table>
            </CardContent>
        </Card>
    );
}
