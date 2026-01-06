'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Folder, Beaker, CheckCircle, XCircle } from "lucide-react";
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, collectionGroup, getDocs, query, where } from 'firebase/firestore';
import type { Project, TestCase, TestExecutionRun } from '@/lib/types';
import { useEffect, useState } from "react";

interface KpiCardsProps {
  projects: Project[];
}

export function KpiCards({ projects }: KpiCardsProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const [testCaseCount, setTestCaseCount] = useState(0);
  const [executionStats, setExecutionStats] = useState({ passed: 0, failed: 0 });

  useEffect(() => {
    if (!user || !firestore || projects.length === 0) return;

    const fetchCounts = async () => {
      // 1. Fetch all test cases for all projects
      const allTestCases: TestCase[] = [];
      const testCasesPromises = projects.map(p => getDocs(collection(firestore, `users/${user.uid}/projects/${p.id}/testCases`)));
      const testCasesSnapshots = await Promise.all(testCasesPromises);
      testCasesSnapshots.forEach(snap => {
        snap.forEach(doc => {
          allTestCases.push(doc.data() as TestCase);
        });
      });
      setTestCaseCount(allTestCases.length);

      // 2. Fetch all execution runs
      const allExecutions: TestExecutionRun[] = [];
      const executionsPromises = projects.map(p => getDocs(collection(firestore, `users/${user.uid}/projects/${p.id}/testExecutions`)));
      const executionsSnapshots = await Promise.all(executionsPromises);
      let passed = 0;
      let failed = 0;
      executionsSnapshots.forEach(snap => {
        snap.forEach(doc => {
          const run = doc.data() as TestExecutionRun;
          run.results.forEach(result => {
            if (result.status === 'Passed') passed++;
            if (result.status === 'Failed') failed++;
          });
        });
      });
      setExecutionStats({ passed, failed });
    };

    fetchCounts();

  }, [projects, user, firestore]);

  const kpiData = [
    { title: "Total Projects", value: projects.length.toLocaleString(), icon: Folder, color: "text-sky-500" },
    { title: "Total Test Cases", value: testCaseCount.toLocaleString(), icon: Beaker, color: "text-amber-500" },
    { title: "Passed", value: executionStats.passed.toLocaleString(), icon: CheckCircle, color: "text-green-500" },
    { title: "Failed", value: executionStats.failed.toLocaleString(), icon: XCircle, color: "text-red-500" },
  ];

  return (
    <>
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
    </>
  );
}
