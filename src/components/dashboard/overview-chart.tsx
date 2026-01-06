'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { PieChart, Pie, Cell } from 'recharts';
import type { TestCase, TestExecutionResult } from '@/lib/types';
import { useMemo } from 'react';

interface OverviewChartProps {
    testCases: TestCase[];
    latestResults: Map<string, TestExecutionResult>;
}

const chartConfig = {
    count: {
      label: 'Count',
    },
    Passed: {
      label: 'Passed',
      color: 'hsl(var(--chart-2))',
    },
    Failed: {
      label: 'Failed',
      color: 'hsl(var(--chart-1))',
    },
    Blocked: {
      label: 'Blocked',
      color: 'hsl(var(--chart-3))',
    },
    Deferred: {
      label: 'Deferred',
      color: 'hsl(var(--chart-4))',
    },
    "Can't Test": {
      label: "Can't Test",
      color: 'hsl(var(--chart-5))',
    },
    'NotRun': {
        label: 'Not Run',
        color: 'hsl(var(--muted))'
    }
};

export function OverviewChart({ testCases, latestResults }: OverviewChartProps) {
  
  const { chartData, totalExecutions } = useMemo(() => {
    const statusCounts: { [key: string]: number } = {
        Passed: 0, Failed: 0, Blocked: 0, Deferred: 0, "Can't Test": 0, NotRun: 0
    };
    
    (testCases || []).forEach(tc => {
        const latestResult = latestResults.get(tc.id);
        if (latestResult) {
            if (statusCounts.hasOwnProperty(latestResult.status)) {
                statusCounts[latestResult.status]++;
            }
        } else {
            statusCounts.NotRun++;
        }
    });
    
    const dataForChart = Object.keys(chartConfig)
        .filter(key => key !== 'count')
        .map(status => ({
            status,
            count: statusCounts[status] || 0,
            fill: chartConfig[status as keyof typeof chartConfig].color,
        })).filter(item => item.count > 0);

    return { chartData: dataForChart, totalExecutions: testCases.length };
  }, [testCases, latestResults]);


  return (
    <Card className="xl:col-span-2">
      <CardHeader>
        <CardTitle>Execution Summary</CardTitle>
        <CardDescription>Aggregated test results across all projects</CardDescription>
      </CardHeader>
      <CardContent>
        {totalExecutions > 0 ? (
            <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[300px]">
            <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="status" hideLabel />} />
                <Pie data={chartData} dataKey="count" nameKey="status" innerRadius={60} strokeWidth={5}>
                {chartData.map((entry) => (
                    <Cell key={`cell-${entry.status}`} fill={entry.fill} />
                ))}
                </Pie>
                <ChartLegend
                content={<ChartLegendContent nameKey="status" />}
                className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
                />
            </PieChart>
            </ChartContainer>
        ) : (
            <div className="flex h-[300px] w-full items-center justify-center text-center">
                <p className="text-muted-foreground">No execution data available yet.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
