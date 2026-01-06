'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Folder, Beaker, CheckCircle, XCircle } from "lucide-react";
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, collectionGroup, query } from 'firebase/firestore';
import type { Project, TestCase, TestExecutionRun } from '@/lib/types';
import { useMemo } from "react";

interface KpiCardsProps {
  projects: Project[];
}

export function KpiCards({ projects }: KpiCardsProps) {
  const { user } = useUser();
  const firestore = useFirestore();

  const allTestCasesQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collectionGroup(firestore, 'testCases'));
  }, [user, firestore]);

  const allExecutionsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collectionGroup(firestore, 'testExecutions'));
  }, [user, firestore]);

  const { data: allTestCases } = useCollection<TestCase>(allTestCasesQuery);
  const { data: allExecutions } = useCollection<TestExecutionRun>(allExecutionsQuery);

  const userTestCases = useMemo(() => {
    if (!allTestCases || !user) return [];
    // Firestore collection group queries are not user-specific, so we filter client-side
    // This is less efficient but necessary without more complex rules/queries
    return allTestCases.filter(tc => tc.createdBy === user.uid);
  }, [allTestCases, user]);
  
  const userExecutions = useMemo(() => {
    if (!allExecutions || !user) return [];
    return allExecutions.filter(ex => ex.userId === user.uid);
  }, [allExecutions, user]);


  const executionStats = useMemo(() => {
    let passed = 0;
    let failed = 0;
    if (userExecutions) {
        userExecutions.forEach(run => {
            run.results.forEach(result => {
                if (result.status === 'Passed') passed++;
                if (result.status === 'Failed') failed++;
            });
        });
    }
    return { passed, failed };
  }, [userExecutions]);


  const kpiData = [
    { title: "Total Projects", value: (projects || []).length.toLocaleString(), icon: Folder, color: "text-sky-500" },
    { title: "Total Test Cases", value: (userTestCases || []).length.toLocaleString(), icon: Beaker, color: "text-amber-500" },
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
