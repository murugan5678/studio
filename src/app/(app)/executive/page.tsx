'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDown, ArrowUp, BarChart, FileWarning, Gauge, Shield, Siren } from "lucide-react";
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

const chartConfig = {
  score: { label: 'Score', color: 'hsl(var(--chart-2))' },
};

const healthScoreData = [
    { month: "Jan", score: 75 },
    { month: "Feb", score: 78 },
    { month: "Mar", score: 82 },
    { month: "Apr", score: 80 },
    { month: "May", score: 85 },
    { month: "Jun", score: 68 },
]

const flakyTests = [
    { id: "TC048", title: "User Profile - Avatar Upload", frequency: "15%", lastFailure: "Build #204" },
    { id: "TC102", title: "Checkout - Apply Coupon Code", frequency: "12%", lastFailure: "Build #201" },
    { id: "TC076", title: "Search - Filter by Date Range", frequency: "8%", lastFailure: "Build #205" },
]

export default function ExecutiveDashboardPage() {
    const qualityHealthScore = 68;
    const riskLevel = "High";
    const releaseReadiness = "At Risk";

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Executive Dashboard</h1>
                <p className="text-muted-foreground">A high-level overview of quality, risk, and release readiness.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 via-white to-purple-50">
                    <CardHeader className="items-center">
                        <Gauge className="h-10 w-10 text-primary" />
                        <CardTitle className="text-sm font-medium tracking-normal">Quality Health Score</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center">
                        <div className="flex items-baseline">
                            <p className="text-7xl font-bold">{qualityHealthScore}</p>
                            <span className="text-2xl text-muted-foreground">/100</span>
                        </div>
                        <div className="mt-2 flex items-center text-red-600 font-semibold">
                            <ArrowDown className="mr-1 h-4 w-4" />
                            <span>14% from last release</span>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                         <div className="flex items-center justify-between">
                            <CardTitle className="text-base">Risk Level</CardTitle>
                             <Siren className="h-6 w-6 text-destructive" />
                         </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold text-destructive">{riskLevel}</p>
                        <p className="text-xs text-muted-foreground mt-2">Based on open critical defects and high failure rates.</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                         <div className="flex items-center justify-between">
                            <CardTitle className="text-base">Release Readiness</CardTitle>
                             <Shield className="h-6 w-6 text-amber-500" />
                         </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold text-amber-500">{releaseReadiness}</p>
                        <p className="text-xs text-muted-foreground mt-2">Critical tests must pass before release.</p>
                    </CardContent>
                </Card>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Health Score Over Time</CardTitle>
                        <CardDescription>Project quality health score trend for the last 6 releases.</CardDescription>
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
                                    <TableHead>Frequency</TableHead>
                                    <TableHead>Last Failure</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {flakyTests.map(test => (
                                    <TableRow key={test.id}>
                                        <TableCell>
                                            <div className="font-medium">{test.title}</div>
                                            <div className="text-sm text-muted-foreground">{test.id}</div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="destructive">{test.frequency}</Badge>
                                        </TableCell>
                                        <TableCell>{test.lastFailure}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}