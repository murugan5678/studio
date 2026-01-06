'use client';

import { useDoc, useFirestore, useUser, useMemoFirebase, useCollection } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { Project, TestCase } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PlusCircle, Upload, CheckCircle, XCircle, PauseCircle, HelpCircle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';
import Link from 'next/link';

const kpiData = [
    { title: "Total Test Cases", value: "2,389", icon: HelpCircle, color: "text-blue-500" },
    { title: "Executed", value: "2030", icon: CheckCircle, color: "text-green-500" },
    { title: "Passed", value: "1,982", icon: CheckCircle, color: "text-green-500" },
    { title: "Failed", value: "48", icon: XCircle, color: "text-red-500" },
    { title: "Deferred", value: "86", icon: PauseCircle, color: "text-gray-500" },
    { title: "Completion", value: "85%", icon: CheckCircle, color: "text-indigo-500" },
  ];

const chartData = [
  { date: 'Jan', passed: 150, failed: 10 },
  { date: 'Feb', passed: 200, failed: 15 },
  { date: 'Mar', passed: 180, failed: 25 },
  { date: 'Apr', passed: 220, failed: 5 },
  { date: 'May', passed: 250, failed: 12 },
  { date: 'Jun', passed: 300, failed: 8 },
];
  
const chartConfig = {
    passed: { label: 'Passed', color: 'hsl(var(--chart-2))' },
    failed: { label: 'Failed', color: 'hsl(var(--chart-1))' },
};

const priorityVariant: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
  Low: 'outline',
  Medium: 'secondary',
  High: 'default',
  Critical: 'destructive',
};

export default function ProjectDetailsPage({ params }: { params: { projectId: string } }) {
  const { user } = useUser();
  const firestore = useFirestore();

  const projectRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, `users/${user.uid}/projects`, params.projectId);
  }, [user, firestore, params.projectId]);

  const testCasesQuery = useMemoFirebase(() => {
    if(!user || !firestore) return null;
    return collection(firestore, `users/${user.uid}/projects/${params.projectId}/testCases`);
  }, [user, firestore, params.projectId]);

  const { data: project, isLoading: isProjectLoading } = useDoc<Project>(projectRef);
  const { data: testCases, isLoading: areTestCasesLoading } = useCollection<TestCase>(testCasesQuery);

  if (isProjectLoading) {
    return (
        <div className="space-y-6">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-6 w-2/3" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
                {Array.from({length: 6}).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
            </div>
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
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpiData.map((item, index) => (
            <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
                <item.icon className={`h-4 w-4 text-muted-foreground ${item.color}`} />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{item.value}</div>
            </CardContent>
            </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Execution Summary</CardTitle>
            <CardDescription>Test results over the last 6 months for this project.</CardDescription>
        </CardHeader>
        <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <BarChart accessibilityLayer data={chartData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => value.slice(0, 3)}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dashed" />}
                />
                <Bar dataKey="passed" fill="var(--color-passed)" radius={4} />
                <Bar dataKey="failed" fill="var(--color-failed)" radius={4} />
              </BarChart>
            </ChartContainer>
        </CardContent>
      </Card>

      <Tabs defaultValue="test-cases">
        <div className="flex justify-between items-center">
            <TabsList>
                <TabsTrigger value="test-cases">Test Cases Management</TabsTrigger>
                <TabsTrigger value="executions">Test Execution Management</TabsTrigger>
            </TabsList>
            <div className='flex items-center gap-2'>
                <Button variant="outline"><Upload className="mr-2 h-4 w-4" /> Import</Button>
                <Button asChild>
                    <Link href={`/projects/${params.projectId}/new-test-case`}>
                        <PlusCircle className="mr-2 h-4 w-4" /> New Test Case
                    </Link>
                </Button>
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
                                <TableHead>ID</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead>Module</TableHead>
                                <TableHead>Priority</TableHead>
                                <TableHead>Type</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                           {areTestCasesLoading && (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    Loading test cases...
                                </TableCell>
                            </TableRow>
                           )}
                           {!areTestCasesLoading && testCases && testCases.length > 0 ? (
                                testCases.map(tc => (
                                    <TableRow key={tc.id}>
                                        <TableCell className='font-mono text-xs'>{tc.id.substring(0, 8)}...</TableCell>
                                        <TableCell className='font-medium'>{tc.title}</TableCell>
                                        <TableCell>{tc.module}</TableCell>
                                        <TableCell>
                                            <Badge variant={priorityVariant[tc.priority]}>{tc.priority}</Badge>
                                        </TableCell>
                                        <TableCell>{tc.type}</TableCell>
                                    </TableRow>
                                ))
                           ) : (
                            !areTestCasesLoading && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        No test cases yet. Start by creating one.
                                    </TableCell>
                                </TableRow>
                            )
                           )}
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
