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

const projects = [
  {
    name: 'Project Phoenix',
    status: 'In Progress',
    totalTests: 540,
    completion: 75,
  },
  {
    name: 'QuantumLeap CRM',
    status: 'Completed',
    totalTests: 1200,
    completion: 100,
  },
  {
    name: 'Nebula E-commerce',
    status: 'On Hold',
    totalTests: 350,
    completion: 20,
  },
  {
    name: 'Titan Analytics',
    status: 'In Progress',
    totalTests: 299,
    completion: 90,
  },
];

const statusVariant: { [key: string]: 'secondary' | 'default' | 'outline' | 'destructive' } = {
    'In Progress': 'secondary',
    'Completed': 'default',
    'On Hold': 'outline',
}

export function RecentProjects() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Projects</CardTitle>
        <CardDescription>An overview of your most recent projects.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead className="hidden sm:table-cell">Status</TableHead>
              <TableHead className="text-right">Test Cases</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((project) => (
              <TableRow key={project.name}>
                <TableCell>
                  <div className="font-medium">{project.name}</div>
                  <div className="hidden text-sm text-muted-foreground md:inline">
                    {project.completion}% complete
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge className="text-xs" variant={statusVariant[project.status] || 'default'}>
                    {project.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{project.totalTests}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
