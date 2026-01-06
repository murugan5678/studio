import type { Timestamp } from 'firebase/firestore';

export interface Project {
    id: string;
    name: string;
    description: string;
    createdAt: Timestamp;
    userId: string;
}

export interface TestCase {
    id: string;
    projectId: string;
    title: string;
    module: string;
    priority: 'Low' | 'Medium' | 'High' | 'Critical';
    severity: string;
    preconditions: string;
    testSteps: string;
    expectedResult: string;
    tags?: string[];
    automationFeasibility: 'Manual' | 'Automatable';
    automationPriority?: string;
    type: 'Positive' | 'Negative' | 'Edge';
    subModule?: string;
    team?: string;
    sprint?: string;
    release?: string;
    testData?: string;
    createdBy: string;
    createdAt: Timestamp;
    updatedAt?: Timestamp;
    status: 'Pending' | 'Approved';
    ticketUrl?: string;
  }
  
export interface TestExecutionRun {
    id: string;
    projectId: string;
    title: string;
    createdAt: Timestamp;
    userId: string;
    results: TestExecutionResult[];
}

export interface TestExecutionResult {
    testCaseId: string;
    status: 'Passed' | 'Failed' | 'Blocked' | 'Deferred' | "Can't Test";
    comments?: string;
    evidenceLinks?: string[];
    evidenceFiles?: string[];
}

    
    