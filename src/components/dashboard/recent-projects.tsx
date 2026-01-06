'use client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Project } from '@/lib/types';
import Link from 'next/link';

interface RecentProjectsProps {
  projects: Project[];
}

const statusVariant: { [key: string]: 'secondary' | 'default' | 'outline' | 'destructive' } = {
    'In Progress': 'secondary',
    'Completed': 'default',
    'On Hold': 'outline',
}

export function RecentProjects({ projects }: RecentProjectsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Projects</CardTitle>
        <CardDescription>An overview of your most recent projects.</CardDescription>
      </CardHeader>
      <CardContent>
        {projects.length > 0 ? (
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Project</TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
                <TableHead className="text-right">View</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {projects.map((project) => (
                <TableRow key={project.id}>
                    <TableCell>
                    <Link href={`/projects/${project.id}`} className="font-medium hover:underline">{project.name}</Link>
                    <div className="hidden text-sm text-muted-foreground md:inline">
                        {project.description}
                    </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                    <Badge className="text-xs" variant={'secondary'}>
                        In Progress
                    </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                    <Link href={`/projects/${project.id}`} className='text-sm hover:underline'>Details</Link>
                    </TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
        ) : (
            <div className="flex h-48 w-full items-center justify-center text-center">
                <p className="text-muted-foreground">No recent projects to display.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
