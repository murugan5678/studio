import type { Timestamp } from 'firebase/firestore';

export interface Project {
    id: string;
    name: string;
    description: string;
    createdAt: Timestamp;
    userId: string;
}
