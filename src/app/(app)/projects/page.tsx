'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCollection, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { PlusCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { Project, TestCase, TestExecutionRun } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface ProjectWithStats extends Project {
  stats: {
    totalTestCases: number;
    completion: number;
    status: string;
    variant: 'secondary' | 'default' | 'outline' | 'destructive';
  };
}

export default function ProjectsPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [projectsWithStats, setProjectsWithStats] = useState<ProjectWithStats[]>([]);
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  const projectsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return collection(firestore, `users/${user.uid}/projects`);
  }, [user, firestore]);

  const { data: projects, isLoading: areProjectsLoading } = useCollection<Project>(projectsQuery);

  useEffect(() => {
    if (areProjectsLoading || !projects || !user || !firestore) {
      setIsStatsLoading(false);
      return;
    };

    setIsStatsLoading(true);
    const fetchStatsForProjects = async () => {
      const enhancedProjects = await Promise.all(
        projects.map(async (project) => {
          const testCasesQuery = query(collection(firestore, `users/${user.uid}/projects/${project.id}/testCases`), where('status', '==', 'Approved'));
          const executionsRef = collection(firestore, `users/${user.uid}/projects/${project.id}/testExecutions`);

          const [testCasesSnap, executionsSnap] = await Promise.all([
            getDocs(testCasesQuery),
            getDocs(executionsRef)
          ]);

          const totalTestCases = testCasesSnap.size;
          const executedTestCaseIds = new Set<string>();
          let hasFailures = false;

          executionsSnap.forEach(doc => {
            const run = doc.data() as TestExecutionRun;
            run.results.forEach(result => {
              executedTestCaseIds.add(result.testCaseId);
              if (result.status === 'Failed') {
                hasFailures = true;
              }
            });
          });

          const completion = totalTestCases > 0 ? Math.round((executedTestCaseIds.size / totalTestCases) * 100) : 0;
          
          let status = "In Progress";
          let variant: ProjectWithStats['stats']['variant'] = 'secondary';
          
          if (totalTestCases === 0) {
            status = 'Not Started';
            variant = 'outline';
          } else if (completion === 100) {
            status = hasFailures ? 'Completed with Failures' : 'Completed';
            variant = hasFailures ? 'destructive' : 'default';
          }

          return {
            ...project,
            stats: {
              totalTestCases,
              completion,
              status,
              variant
            },
          };
        })
      );
      setProjectsWithStats(enhancedProjects);
      setIsStatsLoading(false);
    };

    fetchStatsForProjects();
  }, [projects, user, firestore, areProjectsLoading]);


  const handleCreateProject = async () => {
    if (!user || !firestore || !newProjectName.trim()) return;

    const projectData = {
      name: newProjectName,
      description: newProjectDescription,
      createdAt: serverTimestamp(),
      userId: user.uid,
    };

    if (projectsQuery) {
        addDocumentNonBlocking(projectsQuery, projectData);
    }
    
    setNewProjectName('');
    setNewProjectDescription('');
    setIsDialogOpen(false);
  };
  
  const isLoading = areProjectsLoading || isStatsLoading;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-5 w-5" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Give your new project a name and description.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="col-span-3"
                  placeholder="Project Phoenix"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  className="col-span-3"
                  placeholder="A project to rebuild our main application."
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateProject} type="submit">
                Create Project
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading && Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
                <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full mt-2" />
                </CardContent>
                <CardFooter>
                     <Skeleton className="h-8 w-full" />
                </CardFooter>
            </Card>
        ))}

        {!isLoading && projectsWithStats && projectsWithStats.length > 0 ? (
          projectsWithStats.map((project) => {
            const { stats } = project;
            return (
              <Card key={project.id} className="flex flex-col hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <Link href={`/projects/${project.id}`} className="hover:underline">
                      {project.name}
                    </Link>
                    <Badge variant={stats.variant}>{stats.status}</Badge>
                  </CardTitle>
                  <CardDescription className="line-clamp-2 h-[40px]">{project.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                    <div className="text-sm text-muted-foreground">
                        <span className="font-bold text-foreground">{stats.totalTestCases}</span> Test Cases
                    </div>
                    <div className="mt-2">
                        <Progress value={stats.completion} aria-label={`${stats.completion}% complete`} />
                        <p className="text-xs text-muted-foreground mt-1">{stats.completion}% complete</p>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button asChild className="w-full">
                        <Link href={`/projects/${project.id}`}>View Dashboard</Link>
                    </Button>
                </CardFooter>
              </Card>
            )
        })
        ) : (
          !isLoading && (
            <div className="col-span-full text-center py-12">
              <h3 className="text-xl font-semibold">No projects yet</h3>
              <p className="text-muted-foreground mb-4">Get started by creating your first project.</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <PlusCircle className="mr-2 h-5 w-5" />
                Create Project
              </Button>
            </div>
          )
        )}
      </div>
    </>
  );
}
