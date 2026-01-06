'use client';

import { useState } from 'react';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, where, writeBatch, doc } from 'firebase/firestore';
import type { TestCase } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, ShieldCheck, Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useParams } from 'next/navigation';

export default function ReviewTestCasesPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams() as { projectId: string };
  const [selectedTestCases, setSelectedTestCases] = useState<string[]>([]);

  const pendingTestCasesQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, `users/${user.uid}/projects/${params.projectId}/testCases`),
      where('status', '==', 'Pending')
    );
  }, [user, firestore, params.projectId]);

  const { data: pendingTestCases, isLoading } = useCollection<TestCase>(pendingTestCasesQuery);
  
  const allPendingTestCaseIds = pendingTestCases?.map(tc => tc.id) || [];
  const isAllSelected = selectedTestCases.length > 0 && selectedTestCases.length === allPendingTestCaseIds.length;
  const isSomeSelected = selectedTestCases.length > 0 && !isAllSelected;

  const handleApproveSelected = async () => {
    if (!firestore || !user || selectedTestCases.length === 0) return;

    const batch = writeBatch(firestore);
    selectedTestCases.forEach(id => {
      const docRef = doc(firestore, `users/${user.uid}/projects/${params.projectId}/testCases`, id);
      batch.update(docRef, { status: 'Approved' });
    });

    try {
      await batch.commit();
      toast({
        title: 'Test Cases Approved',
        description: `${selectedTestCases.length} test case(s) have been approved and added to the project.`,
      });
      setSelectedTestCases([]);
    } catch (error) {
      console.error("Error approving test cases:", error);
      toast({
        variant: 'destructive',
        title: 'Approval Failed',
        description: 'There was a problem approving the test cases.',
      });
    }
  };

  const handleDeleteSelected = async () => {
     if (!firestore || !user || selectedTestCases.length === 0) return;

    const batch = writeBatch(firestore);
    selectedTestCases.forEach(id => {
      const docRef = doc(firestore, `users/${user.uid}/projects/${params.projectId}/testCases`, id);
      batch.delete(docRef);
    });

    try {
      await batch.commit();
      toast({
        title: 'Test Cases Deleted',
        description: `${selectedTestCases.length} pending test case(s) have been deleted.`,
      });
      setSelectedTestCases([]);
    } catch (error) {
      console.error("Error deleting test cases:", error);
      toast({
        variant: 'destructive',
        title: 'Deletion Failed',
        description: 'There was a problem deleting the test cases.',
      });
    }
  }

  return (
    <div className="space-y-6">
        <div className='flex justify-start'>
            <Button variant="outline" onClick={() => router.push(`/projects/${params.projectId}`)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Project
            </Button>
       </div>
        <Card>
            <CardHeader className='flex-row items-center justify-between'>
                <div>
                    <CardTitle>Review Pending Test Cases</CardTitle>
                    <CardDescription>Approve or delete the AI-generated test cases below.</CardDescription>
                </div>
                 <div className='flex items-center gap-2'>
                    {selectedTestCases.length > 0 && (
                        <>
                         <Button variant="destructive" onClick={handleDeleteSelected}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete ({selectedTestCases.length})
                        </Button>
                        <Button onClick={handleApproveSelected}>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Approve ({selectedTestCases.length})
                        </Button>
                        </>
                    )}
                 </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[40px]">
                                <Checkbox
                                    checked={isAllSelected}
                                    onCheckedChange={(value) => {
                                      if (value) {
                                        setSelectedTestCases(allPendingTestCaseIds);
                                      } else {
                                        setSelectedTestCases([]);
                                      }
                                    }}
                                    aria-label="Select all"
                                    data-indeterminate={isSomeSelected}
                                  />
                            </TableHead>
                            <TableHead>ID</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Module</TableHead>
                            <TableHead>Priority</TableHead>
                            <TableHead>Type</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    <Skeleton className="h-4 w-1/4 mx-auto" />
                                </TableCell>
                            </TableRow>
                        )}
                        {!isLoading && pendingTestCases && pendingTestCases.length > 0 ? (
                            pendingTestCases.map(tc => (
                                <TableRow key={tc.id} data-state={selectedTestCases.includes(tc.id) && "selected"}>
                                    <TableCell>
                                        <Checkbox
                                        checked={selectedTestCases.includes(tc.id)}
                                        onCheckedChange={(value) => {
                                            if (value) {
                                            setSelectedTestCases([...selectedTestCases, tc.id]);
                                            } else {
                                            setSelectedTestCases(selectedTestCases.filter(id => id !== tc.id));
                                            }
                                        }}
                                        aria-label={`Select test case ${tc.title}`}
                                        />
                                    </TableCell>
                                    <TableCell className="font-mono text-sm">{tc.id}</TableCell>
                                    <TableCell className="font-medium">{tc.title}</TableCell>
                                    <TableCell>{tc.module}</TableCell>
                                    <TableCell>{tc.priority}</TableCell>
                                    <TableCell>{tc.type}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            !isLoading && (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        No pending test cases to review.
                                    </TableCell>
                                </TableRow>
                            )
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
  );
}
