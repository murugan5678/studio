'use client';

import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Project } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PlusCircle, Upload } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function ProjectDetailsPage({ params }: { params: { projectId: string } }) {
  const { user } = useUser();
  const firestore = useFirestore();

  const projectRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, `users/${user.uid}/projects`, params.projectId);
  }, [user, firestore, params.projectId]);

  const { data: project, isLoading } = useDoc<Project>(projectRef);

  if (isLoading) {
    return (
        <div className="space-y-4">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-6 w-2/3" />
            <div className="flex space-x-4">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
            </div>
            <Skeleton className="h-96 w-full" />
        </div>
    );
  }

  if (!project) {
    return <div>Project not found or you do not have access.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
        <p className="text-muted-foreground">{project.description}</p>
      </div>

      <Tabs defaultValue="test-cases">
        <div className="flex justify-between items-center">
            <TabsList>
                <TabsTrigger value="test-cases">Test Cases</TabsTrigger>
                <TabsTrigger value="executions">Executions</TabsTrigger>
                <TabsTrigger value="automation">Automation</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            <div className='flex items-center gap-2'>
                <Button variant="outline"><Upload className="mr-2 h-4 w-4" /> Import</Button>
                <Button><PlusCircle className="mr-2 h-4 w-4" /> New Test Case</Button>
            </div>
        </div>
        <TabsContent value="test-cases">
            <Card>
                <CardHeader>
                    <CardTitle>Test Cases</CardTitle>
                    <CardDescription>All test cases for the {project.name} project.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Module</TableHead>
                                <TableHead>Priority</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                           {/* Placeholder for test cases */}
                           <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    No test cases yet.
                                </TableCell>
                           </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="executions">
        <Card>
                <CardHeader>
                    <CardTitle>Test Executions</CardTitle>
                    <CardDescription>Execution history for this project.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>Execution history will be displayed here.</p>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
