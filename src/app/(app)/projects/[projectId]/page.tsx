'use client';

import { useMemo, useState } from 'react';
import { useDoc, useFirestore, useUser, useMemoFirebase, useCollection } from '@/firebase';
import { collection, doc, writeBatch, query, where, orderBy, Timestamp } from 'firebase/firestore';
import type { Project, TestCase, TestExecutionRun, TestExecutionResult } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PlusCircle, Upload, CheckCircle, XCircle, PauseCircle, HelpCircle, PlayCircle, Download, Trash2, ShieldCheck, Link2, Ban, ShieldAlert, Bug } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useParams } from 'next/navigation';


const chartConfig = {
    passed: { label: 'Passed', color: 'hsl(var(--chart-2))' },
    failed: { label: 'Failed', color: 'hsl(var(--chart-1))' },
    blocked: { label: 'Blocked', color: 'hsl(var(--chart-3))' },
    deferred: { label: 'Deferred', color: 'hsl(var(--chart-4))' },
    "Can't Test": { label: "Can't Test", color: 'hsl(var(--chart-5))' },
};

const priorityVariant: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
  Low: 'outline',
  Medium: 'secondary',
  High: 'default',
  Critical: 'destructive',
};

const statusVariant: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
    Passed: 'secondary',
    Failed: 'destructive',
    Blocked: 'outline',
    Deferred: 'outline',
    "Can't Test": 'outline'
};


const TEST_CASE_CSV_HEADERS = "title,module,priority,severity,preconditions,testSteps,expectedResult,automationFeasibility,type,subModule,team,sprint,release,testData,automationPriority,tags,ticketUrl";

export default function ProjectDetailsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams() as { projectId: string };
  const [selectedTestCases, setSelectedTestCases] = useState<string[]>([]);

  const projectRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, `users/${user.uid}/projects`, params.projectId);
  }, [user, firestore, params.projectId]);

  const testCasesQuery = useMemoFirebase(() => {
    if(!user || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/projects/${params.projectId}/testCases`), where('status', '==', 'Approved'));
  }, [user, firestore, params.projectId]);

  const pendingTestCasesQuery = useMemoFirebase(() => {
    if(!user || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/projects/${params.projectId}/testCases`), where('status', '==', 'Pending'));
  }, [user, firestore, params.projectId]);

  const executionsQuery = useMemoFirebase(() => {
    if(!user || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/projects/${params.projectId}/testExecutions`), orderBy('createdAt', 'desc'));
  }, [user, firestore, params.projectId]);

  const { data: project, isLoading: isProjectLoading } = useDoc<Project>(projectRef);
  const { data: testCases, isLoading: areTestCasesLoading } = useCollection<TestCase>(testCasesQuery);
  const { data: pendingTestCases, isLoading: arePendingTestCasesLoading } = useCollection<TestCase>(pendingTestCasesQuery);
  const { data: executionRuns, isLoading: areExecutionsLoading } = useCollection<TestExecutionRun>(executionsQuery);

  const handleDownloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8," + TEST_CASE_CSV_HEADERS;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "testcase_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
const projectStats = useMemo(() => {
    const statusCounts: { [key: string]: number } = { Passed: 0, Failed: 0, Blocked: 0, Deferred: 0, "Can't Test": 0, NotRun: 0 };
    const latestResults = new Map<string, TestExecutionResult>();

    // Determine the latest result for each test case
    (executionRuns || []).forEach(run => {
        run.results.forEach(result => {
            const existing = latestResults.get(result.testCaseId);
            const runDate = (run.createdAt as Timestamp)?.toMillis();
            // This is a simplified check. A more robust solution would be to store execution date per result.
            // For now, we assume all results in a run have the same timestamp.
            const existingRun = executionRuns?.find(r => r.results.some(res => res.testCaseId === result.testCaseId));
            const existingDate = existingRun ? (existingRun.createdAt as Timestamp)?.toMillis() : 0;

            if (!existing || runDate > existingDate) {
                latestResults.set(result.testCaseId, result);
            }
        });
    });

    const approvedTestCases = testCases || [];
    approvedTestCases.forEach(tc => {
        const latestResult = latestResults.get(tc.id);
        if (latestResult) {
            if (statusCounts.hasOwnProperty(latestResult.status)) {
                statusCounts[latestResult.status]++;
            }
        } else {
            statusCounts.NotRun++;
        }
    });

    const totalTestCases = approvedTestCases.length;
    const executedCount = totalTestCases - statusCounts.NotRun;
    const completion = totalTestCases > 0 ? Math.round((executedCount / totalTestCases) * 100) : 0;

    return {
        totalTestCases,
        executedCount,
        ...statusCounts,
        completion
    }
}, [testCases, executionRuns]);

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
        description: `${selectedTestCases.length} test case(s) have been successfully deleted.`,
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
  };

  const getRunStats = (run: TestExecutionRun) => {
    const passed = run.results.filter(r => r.status === 'Passed').length;
    const failed = run.results.filter(r => r.status === 'Failed').length;
    const total = run.results.length;
    const hasBugs = run.results.some(r => r.bugLink && r.bugLink.trim() !== '');
    return { passed, failed, total, hasBugs };
  };

  const kpiData = [
    { title: "Total Cases", value: projectStats.totalTestCases.toLocaleString(), icon: HelpCircle },
    { title: "Passed", value: projectStats.Passed.toLocaleString(), icon: CheckCircle },
    { title: "Failed", value: projectStats.Failed.toLocaleString(), icon: XCircle },
    { title: "Blocked", value: projectStats.Blocked.toLocaleString(), icon: Ban },
    { title: "Deferred", value: projectStats.Deferred.toLocaleString(), icon: PauseCircle },
    { title: "Can't Test", value: projectStats['Can\'t Test'].toLocaleString(), icon: ShieldAlert },
  ];

  const chartData = useMemo(() => {
    const monthlyData: { [key: string]: { passed: number; failed: number; blocked: number; deferred: number; "Can't Test": number; } } = {};
    
    (executionRuns || []).forEach(run => {
        const date = run.createdAt.toDate();
        const month = date.toLocaleString('default', { month: 'short' });
        
        if(!monthlyData[month]) {
            monthlyData[month] = { passed: 0, failed: 0, blocked: 0, deferred: 0, "Can't Test": 0 };
        }

        run.results.forEach(result => {
            switch(result.status) {
                case 'Passed':
                    monthlyData[month].passed++;
                    break;
                case 'Failed':
                    monthlyData[month].failed++;
                    break;
                case 'Blocked':
                    monthlyData[month].blocked++;
                    break;
                case 'Deferred':
                    monthlyData[month].deferred++;
                    break;
                case "Can't Test":
                    monthlyData[month]["Can't Test"]++;
                    break;
            }
        })
    });

    return Object.entries(monthlyData).map(([date, counts]) => ({ date, ...counts }));

  }, [executionRuns]);


  if (isProjectLoading || areTestCasesLoading || areExecutionsLoading || arePendingTestCasesLoading) {
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

  const allTestCaseIds = testCases?.map(tc => tc.id) || [];
  const isAllSelected = selectedTestCases.length > 0 && selectedTestCases.length === allTestCaseIds.length;
  const isSomeSelected = selectedTestCases.length > 0 && !isAllSelected;
  const pendingCount = pendingTestCases?.length || 0;

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
                <item.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{item.value}</div>
            </CardContent>
            </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Execution Summary (Historical)</CardTitle>
            <CardDescription>Total test results over the last months for this project.</CardDescription>
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
                <Bar dataKey="passed" fill="var(--color-passed)" radius={4} stackId="a" />
                <Bar dataKey="failed" fill="var(--color-failed)" radius={4} stackId="a" />
                <Bar dataKey="blocked" fill="var(--color-blocked)" radius={4} stackId="a" />
                <Bar dataKey="deferred" fill="var(--color-deferred)" radius={4} stackId="a" />
                <Bar dataKey="Can't Test" fill="var(--color-Can't Test)" radius={4} stackId="a" />
              </BarChart>
            </ChartContainer>
        </CardContent>
      </Card>

      <Tabs defaultValue="test-cases">
        <div className="flex justify-between items-center">
            <TabsList>
                <TabsTrigger value="test-cases">Test Cases</TabsTrigger>
                <TabsTrigger value="executions">Test Execution</TabsTrigger>
            </TabsList>
            <div className='flex items-center gap-2'>
                {selectedTestCases.length > 0 && (
                  <AlertDialog>
                      <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete ({selectedTestCases.length})
                          </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                          <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the selected {selectedTestCases.length} test case(s).
                              </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={handleDeleteSelected}>Continue</AlertDialogAction>
                          </AlertDialogFooter>
                      </AlertDialogContent>
                  </AlertDialog>
                )}
                 {pendingCount > 0 && (
                    <Button asChild variant="secondary">
                        <Link href={`/projects/${params.projectId}/review`}>
                            <ShieldCheck className="mr-2 h-4 w-4" /> Review ({pendingCount})
                        </Link>
                    </Button>
                 )}
                <Button asChild variant="outline">
                    <Link href={`/projects/${params.projectId}/upload-test-cases`}>
                        <Upload className="mr-2 h-4 w-4" /> Upload Cases
                    </Link>
                </Button>
                 <Button variant="outline" onClick={handleDownloadTemplate}>
                    <Download className="mr-2 h-4 w-4" /> Download Template
                </Button>
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
                    <CardDescription>All approved test cases for the {project.name} project.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[40px]">
                                <Checkbox
                                    checked={selectedTestCases.length > 0 && selectedTestCases.length === allTestCaseIds.length}
                                    onCheckedChange={(value) => {
                                      if (value) {
                                        setSelectedTestCases(allTestCaseIds);
                                      } else {
                                        setSelectedTestCases([]);
                                      }
                                    }}
                                    aria-label="Select all"
                                    data-indeterminate={selectedTestCases.length > 0 && selectedTestCases.length < allTestCaseIds.length}
                                  />
                                </TableHead>
                                <TableHead>ID</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead>Module</TableHead>
                                <TableHead>Priority</TableHead>
                                <TableHead>Severity</TableHead>
                                <TableHead>Team</TableHead>
                                <TableHead>Automation</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Ticket</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                           {areTestCasesLoading && (
                            <TableRow>
                                <TableCell colSpan={10} className="h-24 text-center">
                                    Loading test cases...
                                </TableCell>
                            </TableRow>
                           )}
                           {!areTestCasesLoading && testCases && testCases.length > 0 ? (
                                testCases.map(tc => (
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
                                        <TableCell className='font-mono text-sm'>
                                          <Link href={`/projects/${params.projectId}/test-cases/${tc.id}/edit`} className='hover:underline'>
                                            {tc.id}
                                          </Link>
                                        </TableCell>
                                        <TableCell className='font-medium'>{tc.title}</TableCell>
                                        <TableCell>{tc.module}</TableCell>
                                        <TableCell>
                                            <Badge variant={priorityVariant[tc.priority]}>{tc.priority}</Badge>
                                        </TableCell>
                                        <TableCell>{tc.severity}</TableCell>
                                        <TableCell>{tc.team || 'N/A'}</TableCell>
                                        <TableCell>
                                          <Badge variant={tc.automationFeasibility === 'Automatable' ? 'secondary' : 'outline'}>
                                            {tc.automationFeasibility}
                                          </Badge>
                                        </TableCell>
                                        <TableCell>{tc.type}</TableCell>
                                        <TableCell>
                                          {tc.ticketUrl && (
                                            <a href={tc.ticketUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                              <Link2 className="h-4 w-4" />
                                            </a>
                                          )}
                                        </TableCell>
                                    </TableRow>
                                ))
                           ) : (
                            !areTestCasesLoading && (
                                <TableRow>
                                    <TableCell colSpan={10} className="h-24 text-center">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
