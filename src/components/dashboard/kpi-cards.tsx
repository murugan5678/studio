'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Folder, Beaker, CheckCircle, XCircle } from "lucide-react";
import type { Project, TestCase, TestExecutionRun } from '@/lib/types';
import { useMemo } from "react";

interface KpiCardsProps {
  projects: Project[];
  testCases: TestCase[];
  executions: TestExecutionRun[];
}

export function KpiCards({ projects, testCases, executions }: KpiCardsProps) {

  const executionStats = useMemo(() => {
    let passed = 0;
    let failed = 0;
    if (executions) {
        executions.forEach(run => {
            run.results.forEach(result => {
                if (result.status === 'Passed') passed++;
                if (result.status === 'Failed') failed++;
            });
        });
    }
    return { passed, failed };
  }, [executions]);


  const kpiData = [
    { title: "Total Projects", value: (projects || []).length.toLocaleString(), icon: Folder, color: "text-sky-500" },
    { title: "Total Test Cases", value: (testCases || []).length.toLocaleString(), icon: Beaker, color: "text-amber-500" },
    { title: "Tests Passed", value: executionStats.passed.toLocaleString(), icon: CheckCircle, color: "text-green-500" },
    { title: "Tests Failed", value: executionStats.failed.toLocaleString(), icon: XCircle, color: "text-red-500" },
  ];

  return (
    <>
      {kpiData.map((item, index) => (
        <Card key={index} className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{item.title}</CardTitle>
            <item.icon className={`h-5 w-5 ${item.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{item.value}</div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}
