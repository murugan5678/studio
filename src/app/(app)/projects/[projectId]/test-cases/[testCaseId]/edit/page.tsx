'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useRouter, useParams } from 'next/navigation';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { doc, serverTimestamp } from 'firebase/firestore';
import type { TestCase } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';

const formSchema = z.object({
  title: z.string().min(2, { message: 'Title must be at least 2 characters.' }),
  module: z.string().min(2, { message: 'Module must be at least 2 characters.' }),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']),
  severity: z.string().min(2, { message: 'Severity is required.' }),
  preconditions: z.string().optional(),
  testSteps: z.string().min(10, { message: 'Test steps are required.' }),
  expectedResult: z.string().min(5, { message: 'Expected result is required.' }),
  automationFeasibility: z.enum(['Manual', 'Automatable']),
  type: z.enum(['Positive', 'Negative', 'Edge']),
  subModule: z.string().optional(),
  team: z.string().optional(),
  sprint: z.string().optional(),
  release: z.string().optional(),
  testData: z.string().optional(),
  automationPriority: z.string().optional(),
  tags: z.string().optional(),
  ticketUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
});

export default function EditTestCasePage({ params }: { params: { projectId: string; testCaseId: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const testCaseRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, `users/${user.uid}/projects/${params.projectId}/testCases`, params.testCaseId);
  }, [user, firestore, params.projectId, params.testCaseId]);

  const { data: testCase, isLoading } = useDoc<TestCase>(testCaseRef);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        title: '',
        module: '',
        priority: 'Medium',
        severity: 'Medium',
        preconditions: '',
        testSteps: '',
        expectedResult: '',
        automationFeasibility: 'Manual',
        type: 'Positive',
        subModule: '',
        team: '',
        sprint: '',
        release: '',
        testData: '',
        automationPriority: '',
        tags: '',
        ticketUrl: '',
      },
  });

  useEffect(() => {
    if (testCase) {
      form.reset({
        ...testCase,
        tags: testCase.tags?.join(', ') || '',
        ticketUrl: testCase.ticketUrl || '',
      });
    }
  }, [testCase, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!testCaseRef) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Database not available. Please try again.',
      });
      return;
    }

    const testCaseData = {
      ...values,
      tags: values.tags?.split(',').map(tag => tag.trim()).filter(Boolean) || [],
      updatedAt: serverTimestamp(),
    };
    
    setDocumentNonBlocking(testCaseRef, testCaseData, { merge: true });

    toast({
      title: 'Test Case Updated',
      description: `Test case "${values.title}" has been successfully updated.`,
    });
    router.push(`/projects/${params.projectId}`);
  }
  
  if (isLoading) {
    return (
        <Card>
            <CardHeader>
                <Skeleton className='h-8 w-1/2' />
                <Skeleton className='h-4 w-3/4' />
            </CardHeader>
            <CardContent className='space-y-6'>
                <div className='grid grid-cols-2 gap-4'>
                    <Skeleton className='h-10 w-full' />
                    <Skeleton className='h-10 w-full' />
                </div>
                <Skeleton className='h-24 w-full' />
                <Skeleton className='h-10 w-full' />
                 <div className="flex justify-end gap-2">
                    <Skeleton className='h-10 w-24' />
                    <Skeleton className='h-10 w-24' />
                </div>
            </CardContent>
        </Card>
    )
  }

  if (!testCase) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Test Case Not Found</CardTitle>
            </CardHeader>
            <CardContent>
                <p>The test case you are looking for could not be found.</p>
                <Button onClick={() => router.back()} variant="link">Go back</Button>
            </CardContent>
        </Card>
    )
  }

  return (
    <Card>
        <CardHeader>
            <CardTitle>Edit Test Case</CardTitle>
            <CardDescription>Update the details for this test case.</CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Test Case Title</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., Verify user can log in with valid credentials" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="module"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Module / Feature</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., Authentication" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="subModule"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Sub-module</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., Login Page" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="preconditions"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Preconditions</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="e.g., User must be on the login page." {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="testSteps"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Test Steps</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="1. Navigate to the login page..." {...field} rows={5} />
                                </FormControl>
                                <FormDescription>Provide step-by-step instructions.</FormDescription>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="expectedResult"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Expected Result</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="User should be redirected to the dashboard." {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <div className="space-y-4">
                        <FormField
                            control={form.control}
                            name="priority"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Priority</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select priority" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    <SelectItem value="Low">Low</SelectItem>
                                    <SelectItem value="Medium">Medium</SelectItem>
                                    <SelectItem value="High">High</SelectItem>
                                    <SelectItem value="Critical">Critical</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="severity"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Severity</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., Major" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Test Case Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="Positive">Positive</SelectItem>
                                        <SelectItem value="Negative">Negative</SelectItem>
                                        <SelectItem value="Edge">Edge</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="team"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Team</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., QA Core" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="sprint"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Sprint / Release</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., Sprint 24.07" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="automationFeasibility"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Automation Feasibility</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select feasibility" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    <SelectItem value="Manual">Manual</SelectItem>
                                    <SelectItem value="Automatable">Automatable</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="automationPriority"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Automation Priority</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., P0" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="ticketUrl"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Ticket URL</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., https://jira.example.com/browse/PROJ-123" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="tags"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Tags / Labels</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., smoke, regression, login" {...field} />
                                </FormControl>
                                <FormDescription>Separate tags with commas.</FormDescription>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                    <Button type="submit">Save Changes</Button>
                </div>
            </form>
            </Form>
        </CardContent>
    </Card>
  );
}

    
    