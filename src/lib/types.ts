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
  }
  
