import type { Timestamp } from 'firebase/firestore';

export interface Project {
    id: string;
    name: string;
    description: string;
    createdAt: Timestamp;
    userId: string;
    releaseId?: string;
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
    status: 'Pending' | 'Approved' | 'Draft' | 'In Review' | 'Locked';
    ticketUrl?: string;
    flaky?: boolean;
    versionHistory?: any[]; // Simplified for now
    reviewComments?: string;
  }
  
export interface TestExecutionRun {
    id: string;
    projectId: string;
    title: string;
    createdAt: Timestamp;
    userId: string;
    results: TestExecutionResult[];
    environment?: string;
    buildVersion?: string;
}

export interface TestExecutionResult {
    testCaseId: string;
    status: 'Passed' | 'Failed' | 'Blocked' | 'Deferred' | "Can't Test";
    comments?: string;
    evidenceLinks?: string[];
    evidenceFiles?: string[];
}

export interface Defect {
    id: string;
    projectId: string;
    testCaseId?: string;
    title: string;
    description: string;
    severity: 'Low' | 'Medium' | 'High' | 'Critical';
    status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
    createdAt: Timestamp;
    reportedBy: string;
}

export interface Release {
    id: string;
    name: string;
    projectId: string;
    startDate: Timestamp;
    endDate: Timestamp;
}

export interface Requirement {
    id: string;
    projectId: string;
    title: string;
    description: string;
}

export interface RTMEntry {
    requirementId: string;
    testCaseId: string;
    testExecutionId?: string;
    defectId?: string;
}

export interface QualityGateConfig {
    id: string;
    projectId: string;
    minPassPercentage: number;
    maxCriticalBugs: number;
    maxHighBugs: number;
    maxMediumBugs: number;
}

export interface DeploymentApproval {
    id: string;
    projectId: string;
    status: 'Not Ready' | 'Ready for Production' | 'Approved for Deployment' | 'Blocked';
    approvedBy?: string;
    approvedAt?: Timestamp;
    comments?: string;
    history: DeploymentApprovalHistory[];
}

export interface DeploymentApprovalHistory {
    status: 'Not Ready' | 'Ready for Production' | 'Approved for Deployment' | 'Blocked';
    changedBy: string;
    changedAt: Timestamp;
    comment?: string;
}
    
    
