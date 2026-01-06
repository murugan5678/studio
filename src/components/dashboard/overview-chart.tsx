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

const chartData = [
  { status: 'Passed', count: 1982, fill: 'hsl(var(--chart-2))' },
  { status: 'Failed', count: 321, fill: 'hsl(var(--chart-1))' },
  { status: 'Blocked', count: 45, fill: 'hsl(var(--chart-3))' },
  { status: 'Deferred', count: 41, fill: 'hsl(var(--chart-4))' },
  { status: "Can't Test", count: 20, fill: 'hsl(var(--chart-5))' },
];

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
  };

export function OverviewChart() {
  return (
    <Card className="xl:col-span-2">
      <CardHeader>
        <CardTitle>Execution Summary</CardTitle>
        <CardDescription>Aggregated test results across all projects</CardDescription>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
}
