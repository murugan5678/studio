'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Gauge, Siren, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Bar, BarChart as RechartsBarChart, CartesianGrid, XAxis } from 'recharts';
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import type { Project, TestCase, TestExecutionRun, Defect, TestExecutionResult } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


const chartConfig = {
  score: { label: 'Score', color: 'hsl(var(--chart-2))' },
};

interface AggregatedData {
    testCases: TestCase[];
    executions: TestExecutionRun[];
    defects: Defect[];
}

interface FlakyTest extends TestCase {
    failureRate: number;
    passCount: number;
    failCount: number;
}

export default function ExecutiveDashboardPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [aggregatedData, setAggregatedData] = useState<AggregatedData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedProjectId, setSelectedProjectId] = useState('all');

    const projectsQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return collection(firestore, `users/${user.uid}/projects`);
    }, [user, firestore]);

    const { data: projects, isLoading: areProjectsLoading } = useCollection<Project>(projectsQuery);

    useEffect(() => {
        if (areProjectsLoading) return;
        if (!projects || !user || !firestore) {
            setIsLoading(false);
            return;
        }

        const fetchData = async () => {
            setIsLoading(true);
            
            const projectsToFetch = selectedProjectId === 'all' 
                ? projects
                : projects.filter(p => p.id === selectedProjectId);

            if (projectsToFetch.length === 0 && selectedProjectId !== 'all') {
                setAggregatedData({ testCases: [], executions: [], defects: [] });
                setIsLoading(false);
                return;
            }
            
            const allTestCases: TestCase[] = [];
            const allExecutions: TestExecutionRun[] = [];
            const allDefects: Defect[] = [];

            try {
                for (const project of projectsToFetch) {
                    const tcQuery = query(collection(firestore, `users/${user.uid}/projects/${project.id}/testCases`), where('status', '==', 'Approved'));
                    const execQuery = query(collection(firestore, `users/${user.uid}/projects/${project.id}/testExecutions`));
                    const defectQuery = query(collection(firestore, `users/${user.uid}/projects/${project.id}/defects`), where('status', '==', 'Open'));
    
                    const [tcSnap, execSnap, defectSnap] = await Promise.all([
                        getDocs(tcQuery),
                        getDocs(execQuery),
                        getDocs(defectQuery),
                    ]);
    
                    allTestCases.push(...tcSnap.docs.map(d => ({ id: d.id, ...d.data() } as TestCase)));
                    allExecutions.push(...execSnap.docs.map(d => ({ id: d.id, ...d.data() } as TestExecutionRun)));
                    allDefects.push(...defectSnap.docs.map(d => ({ id: d.id, ...d.data() } as Defect)));
                }
                setAggregatedData({ testCases: allTestCases, executions: allExecutions, defects: allDefects });
            } catch (error) {
                console.error("Failed to fetch executive data:", error);
                setAggregatedData({ testCases: [], executions: [], defects: [] });
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, [projects, user, firestore, areProjectsLoading, selectedProjectId]);


    const executiveMetrics = useMemo(() => {
        if (!aggregatedData) return null;

        const { testCases, executions, defects } = aggregatedData;

        // --- Correctly determine the latest result for each test case ---
        const latestResults = new Map<string, TestExecutionResult & { executionDate: Timestamp }>();
        executions.forEach(run => {
            if (!run.createdAt || typeof run.createdAt.toMillis !== 'function') return;
            run.results.forEach(result => {
                const existing = latestResults.get(result.testCaseId);
                if (!existing || (run.createdAt.toMillis() > existing.executionDate.toMillis())) {
                    latestResults.set(result.testCaseId, { ...result, executionDate: run.createdAt });
                }
            });
        });

        // 1. Critical Test Pass Rate
        const criticalTestCases = testCases.filter(tc => tc.priority === 'Critical');
        let criticalPassed = 0;
        criticalTestCases.forEach(tc => {
            const latestResult = latestResults.get(tc.id);
            if (latestResult?.status === 'Passed') {
                criticalPassed++;
            }
        });
        const criticalPassRate = criticalTestCases.length > 0 ? (criticalPassed / criticalTestCases.length) * 100 : 100;
        
        // 2. Open High-Severity Defects (Defects are pre-filtered by 'Open' status in query)
        const openHighSeverityDefects = defects.filter(d => d.severity === 'High' || d.severity === 'Critical').length;

        // 3. Automation Coverage
        const automatedTestCases = testCases.filter(tc => tc.automationFeasibility === 'Automatable').length;
        const automationCoverage = testCases.length > 0 ? (automatedTestCases / testCases.length) * 100 : 0;
        
        // --- Quality Health Score Calculation ---
        let score = 0;
        score += (criticalPassRate / 100) * 50;
        const defectPenalty = Math.min(openHighSeverityDefects * 5, 30);
        score += (30 - defectPenalty);
        score += (automationCoverage / 100) * 20;
        const qualityHealthScore = Math.max(0, Math.min(100, Math.round(score)));

        // --- Risk & Readiness ---
        let riskLevel = "Low";
        if (openHighSeverityDefects > 5 || qualityHealthScore < 70) riskLevel = "Medium";
        if (openHighSeverityDefects > 10 || qualityHealthScore < 50) riskLevel = "High";
        
        let releaseReadiness = "Ready";
        if (riskLevel === "Medium") releaseReadiness = "At Risk";
        if (riskLevel === "High") releaseReadiness = "Blocked";

        // --- Flaky Test Detection ---
        const testExecutionStats: { [key: string]: { passes: number, fails: number }} = {};
        executions.forEach(run => {
            if (!run.results) return;
            run.results.forEach(res => {
                if (!testExecutionStats[res.testCaseId]) {
                    testExecutionStats[res.testCaseId] = { passes: 0, fails: 0 };
                }
                if (res.status === 'Passed') testExecutionStats[res.testCaseId].passes++;
                if (res.status === 'Failed') testExecutionStats[res.testCaseId].fails++;
            })
        });

        const flakyTests: FlakyTest[] = [];
        Object.entries(testExecutionStats).forEach(([testCaseId, stats]) => {
            if (stats.passes > 0 && stats.fails > 0) {
                const testCase = testCases.find(tc => tc.id === testCaseId);
                if (testCase) {
                    flakyTests.push({
                        ...testCase,
                        failureRate: (stats.fails / (stats.passes + stats.fails)) * 100,
                        passCount: stats.passes,
                        failCount: stats.fails,
                    });
                }
            }
        });

        return {
            qualityHealthScore,
            riskLevel,
            releaseReadiness,
            flakyTests: flakyTests.sort((a,b) => b.failureRate - a.failureRate).slice(0, 5),
        };

    }, [aggregatedData]);

    // Dummy data for chart until real historical data is implemented
    const healthScoreData = [
        { month: "Jan", score: 0 }, { month: "Feb", score: 0 }, { month: "Mar", score: 0 },
        { month: "Apr", score: 0 }, { month: "May", score: 0 }, { month: "Jun", score: executiveMetrics?.qualityHealthScore ?? 0 },
    ]

    const effectiveIsLoading = isLoading || areProjectsLoading;
    const { qualityHealthScore, riskLevel, releaseReadiness, flakyTests } = executiveMetrics || {};

    if (effectiveIsLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <Skeleton className="h-10 w-64" />
                        <Skeleton className="h-6 w-96 mt-2" />
                    </div>
                     <Skeleton className="h-10 w-64" />
                </div>
                <div className="grid gap-6 md:grid-cols-3">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-48 w-full" />
                </div>
                 <div className="grid gap-6 md:grid-cols-2">
                    <Skeleton className="h-96 w-full" />
                    <Skeleton className="h-96 w-full" />
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Executive Dashboard</h1>
                    <p className="text-muted-foreground">A high-level overview of quality, risk, and release readiness.</p>
                </div>
                <div className="w-64">
                    <Select value={selectedProjectId} onValueChange={setSelectedProjectId} disabled={!projects || projects.length === 0}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a project" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Projects</SelectItem>
                            {projects?.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 via-white to-purple-50">
                    <CardHeader className="items-center">
                        <Gauge className="h-10 w-10 text-primary" />
                        <CardTitle className="text-sm font-medium tracking-normal">Quality Health Score</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center">
                        <div className="flex items-baseline">
                            <p className="text-7xl font-bold">{qualityHealthScore ?? 0}</p>
                            <span className="text-2xl text-muted-foreground">/100</span>
                        </div>
                        <div className="mt-2 flex items-center text-muted-foreground font-semibold">
                            <BarChart className="mr-1 h-4 w-4" />
                            <span>Based on current data</span>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                         <div className="flex items-center justify-between">
                            <CardTitle className="text-base">Risk Level</CardTitle>
                             <Siren className={`h-6 w-6 ${riskLevel === 'High' ? 'text-destructive' : riskLevel === 'Medium' ? 'text-amber-500' : 'text-green-500'}`} />
                         </div>
                    </CardHeader>
                    <CardContent>
                        <p className={`text-4xl font-bold ${riskLevel === 'High' ? 'text-destructive' : riskLevel === 'Medium' ? 'text-amber-500' : 'text-green-500'}`}>{riskLevel || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground mt-2">Based on open critical defects and health score.</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                         <div className="flex items-center justify-between">
                            <CardTitle className="text-base">Release Readiness</CardTitle>
                             <ShieldAlert className={`h-6 w-6 ${releaseReadiness === 'Blocked' ? 'text-destructive' : releaseReadiness === 'At Risk' ? 'text-amber-500' : 'text-green-500'}`} />
                         </div>
                    </CardHeader>
                    <CardContent>
                        <p className={`text-4xl font-bold ${releaseReadiness === 'Blocked' ? 'text-destructive' : releaseReadiness === 'At Risk' ? 'text-amber-500' : 'text-green-500'}`}>{releaseReadiness || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground mt-2">Based on current risk level.</p>
                    </CardContent>
                </Card>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Health Score Over Time</CardTitle>
                        <CardDescription>Project quality health score trend for the last 6 releases (placeholder data).</CardDescription>
                    </CardHeader>
                    <CardContent>
                    <ChartContainer config={chartConfig} className="h-[250px] w-full">
                        <RechartsBarChart accessibilityLayer data={healthScoreData}>
                            <CartesianGrid vertical={false} />
                            <XAxis
                            dataKey="month"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                            />
                            <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent indicator="dashed" />}
                            />
                            <Bar dataKey="score" fill="var(--color-score)" radius={4} />
                        </RechartsBarChart>
                    </ChartContainer>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle>Flaky Test Detection</CardTitle>
                        <CardDescription>AI-detected tests with inconsistent outcomes.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Test Case</TableHead>
                                    <TableHead>Failure Rate</TableHead>
                                    <TableHead>Run History</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {flakyTests && flakyTests.length > 0 ? flakyTests.map(test => (
                                    <TableRow key={test.id}>
                                        <TableCell>
                                            <div className="font-medium">{test.title}</div>
                                            <div className="text-sm text-muted-foreground">{test.id}</div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="destructive">{test.failureRate.toFixed(0)}%</Badge>
                                        </TableCell>
                                        <TableCell>{test.passCount} Passed, {test.failCount} Failed</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center">
                                            No flaky tests detected.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
