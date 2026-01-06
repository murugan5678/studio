'use client';

import { useDoc, useFirestore, useUser, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import type { TestExecutionRun, TestCase } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Paperclip } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

const statusVariant: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
    Passed: 'secondary',
    Failed: 'destructive',
    Blocked: 'outline',
    Deferred: 'outline',
    "Can't Test": 'outline'
};

export default function ExecutionDetailsPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const params = useParams() as { projectId: string, executionId: string };

    const executionRunRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return doc(firestore, `users/${user.uid}/projects/${params.projectId}/testExecutions`, params.executionId);
    }, [user, firestore, params.projectId, params.executionId]);

    const { data: executionRun, isLoading: isExecutionLoading } = useDoc<TestExecutionRun>(executionRunRef);
    
    const testCasesQuery = useMemoFirebase(() => {
        if(!user || !firestore) return null;
        return collection(firestore, `users/${user.uid}/projects/${params.projectId}/testCases`);
      }, [user, firestore, params.projectId]);

    const { data: testCases, isLoading: areTestCasesLoading } = useCollection<TestCase>(testCasesQuery);

    const testCasesMap = useMemo(() => {
        if (!testCases) return new Map();
        return new Map(testCases.map(tc => [tc.id, tc]));
    }, [testCases]);

    const isLoading = isExecutionLoading || areTestCasesLoading;

    if (isLoading) {
        return (
            <div className='space-y-4'>
                <Skeleton className="h-8 w-1/4" />
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-1/2" />
                        <Skeleton className="h-4 w-3/4" />
                    </CardHeader>
                    <CardContent>
                         <Skeleton className="h-48 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!executionRun) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Execution Run Not Found</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>The test execution run you are looking for could not be found.</p>
                </CardContent>
            </Card>
        );
    }
    
    return (
        <div className="space-y-6">
            <div className='flex justify-start'>
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>{executionRun.title}</CardTitle>
                    <CardDescription>
                        Executed on {executionRun.createdAt.toDate().toLocaleString()}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Test Case</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Comments</TableHead>
                                <TableHead>Evidence</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {executionRun.results.map((result) => {
                                const testCase = testCasesMap.get(result.testCaseId);
                                return (
                                    <TableRow key={result.testCaseId}>
                                        <TableCell className="font-medium">{testCase?.title || 'Unknown Test Case'}</TableCell>
                                        <TableCell>
                                            <Badge variant={statusVariant[result.status]}>{result.status}</Badge>
                                        </TableCell>
                                        <TableCell>{result.comments || 'N/A'}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-2">
                                                {result.evidenceLinks && result.evidenceLinks.length > 0 && (
                                                     <div className="flex flex-wrap gap-2">
                                                        {result.evidenceLinks.map((link, i) => (
                                                            <Link key={i} href={link} target="_blank" rel="noopener noreferrer" className="w-24 h-24 relative">
                                                                <Image 
                                                                    src={link} 
                                                                    alt={`Evidence ${i + 1}`} 
                                                                    fill
                                                                    objectFit="cover"
                                                                    className="rounded-md hover:opacity-80 transition-opacity"
                                                                />
                                                            </Link>
                                                        ))}
                                                     </div>
                                                )}
                                                {result.evidenceFiles && result.evidenceFiles.length > 0 && (
                                                    <div className="flex flex-col gap-1 text-sm">
                                                         {result.evidenceFiles.map((file, i) => (
                                                            <div key={i} className="flex items-center text-muted-foreground">
                                                                <Paperclip className="mr-2 h-4 w-4" />
                                                                <span>{file}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                {(!result.evidenceLinks || result.evidenceLinks.length === 0) && (!result.evidenceFiles || result.evidenceFiles.length === 0) && (
                                                    <span className="text-sm text-muted-foreground">No evidence provided.</span>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
