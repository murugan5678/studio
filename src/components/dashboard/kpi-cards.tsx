'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Folder, Beaker, CheckCircle, XCircle } from "lucide-react";
import type { Project, TestCase, TestExecutionRun } from '@/lib/types';
import { useMemo } from "react";
import Link from "next/link";

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
    { title: "Total Projects", value: (projects || []).length.toLocaleString(), icon: Folder, href: '/projects' },
    { title: "Total Test Cases", value: (testCases || []).length.toLocaleString(), icon: Beaker, href: '/projects' },
    { title: "Tests Passed", value: executionStats.passed.toLocaleString(), icon: CheckCircle, href: '/executions' },
    { title: "Tests Failed", value: executionStats.failed.toLocaleString(), icon: XCircle, href: '/executions' },
  ];

  return (
    <>
      {kpiData.map((item, index) => (
        <Link href={item.href} key={index}>
            <Card className="hover:border-primary transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
                <item.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{item.value}</div>
            </CardContent>
            </Card>
        </Link>
      ))}
    </>
  );
}
