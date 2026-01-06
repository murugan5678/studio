'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import * as z from 'zod';
import { useRouter, useParams } from 'next/navigation';
import { useState } from 'react';

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, serverTimestamp } from 'firebase/firestore';
import type { TestCase } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft } from 'lucide-react';

const executionFormSchema = z.object({
  title: z.string().min(2, 'Title is required.'),
  testCaseIds: z.array(z.string()).min(1, 'Please select at least one test case.'),
});

const executionResultsSchema = z.object({
  executions: z.array(
    z.object({
      testCaseId: z.string(),
      status: z.enum(['Passed', 'Failed', 'Blocked', 'Deferred', "Can't Test"]),
      comments: z.string().optional(),
      evidenceLinks: z.string().optional(),
      evidenceFiles: z.custom<FileList>().optional(),
    })
  ),
});


export default function NewExecutionPage() {
  const router = useRouter();
  const params = useParams() as { projectId: string };
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const [step, setStep] = useState(1);
  const [selectedTestCases, setSelectedTestCases] = useState<TestCase[]>([]);

  const testCasesQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return collection(firestore, `users/${user.uid}/projects/${params.projectId}/testCases`);
  }, [user, firestore, params.projectId]);

  const { data: testCases, isLoading: areTestCasesLoading } = useCollection<TestCase>(testCasesQuery);

  const executionForm = useForm<z.infer<typeof executionFormSchema>>({
    resolver: zodResolver(executionFormSchema),
    defaultValues: {
      title: `Execution Run - ${new Date().toLocaleDateString()}`,
      testCaseIds: [],
    },
  });

  const resultsForm = useForm<z.infer<typeof executionResultsSchema>>({
    resolver: zodResolver(executionResultsSchema),
    defaultValues: {
        executions: []
    }
  });

  function onSelectTestCases(values: z.infer<typeof executionFormSchema>) {
    if (!testCases) return;
    const selected = testCases.filter(tc => values.testCaseIds.includes(tc.id));
    setSelectedTestCases(selected);
    
    // Populate the second form
    resultsForm.reset({
        executions: selected.map(tc => ({
            testCaseId: tc.id,
            status: 'Passed',
            comments: '',
            evidenceLinks: '',
        }))
    });

    setStep(2);
  }

  async function onRecordResults(values: z.infer<typeof executionResultsSchema>) {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Not authenticated.' });
      return;
    }

    const executionRunData = {
      title: executionForm.getValues('title'),
      projectId: params.projectId,
      userId: user.uid,
      createdAt: serverTimestamp(),
      results: values.executions.map(ex => {
        const links = ex.evidenceLinks ? ex.evidenceLinks.split(',').map(link => link.trim()).filter(Boolean) : [];
        const fileNames = ex.evidenceFiles ? Array.from(ex.evidenceFiles).map(file => file.name) : [];
        return {
          testCaseId: ex.testCaseId,
          status: ex.status,
          comments: ex.comments,
          evidenceLinks: [...links, ...fileNames],
        }
      }),
    };
    
    const testExecutionsCollection = collection(firestore, `users/${user.uid}/projects/${params.projectId}/testExecutions`);
    
    try {
        await addDocumentNonBlocking(testExecutionsCollection, executionRunData);
        toast({
            title: 'Execution Run Saved',
            description: 'The test execution results have been saved.',
        });
        router.push(`/projects/${params.projectId}`);
    } catch (error) {
        console.error("Error saving execution run:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not save execution results.' });
    }
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>New Test Execution Run</CardTitle>
        <CardDescription>
          {step === 1 ? 'Select test cases to include in this run.' : 'Record the results for each test case.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === 1 && (
          <Form {...executionForm}>
            <form onSubmit={executionForm.handleSubmit(onSelectTestCases)} className="space-y-6">
              <FormField
                control={executionForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Execution Run Title</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={executionForm.control}
                name="testCaseIds"
                render={() => (
                  <FormItem>
                    <FormLabel>Test Cases</FormLabel>
                    <Card className='p-4'>
                      <ScrollArea className="h-72">
                      {areTestCasesLoading ? (
                        <p>Loading test cases...</p>
                      ) : (
                        testCases?.map((item) => (
                          <FormField
                            key={item.id}
                            control={executionForm.control}
                            name="testCaseIds"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={item.id}
                                  className="flex flex-row items-start space-x-3 space-y-0 py-2"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(item.id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...(field.value || []), item.id])
                                          : field.onChange(
                                              field.value?.filter(
                                                (value) => value !== item.id
                                              )
                                            )
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal w-full cursor-pointer">
                                    {item.title}
                                  </FormLabel>
                                </FormItem>
                              )
                            }}
                          />
                        ))
                      )}
                      </ScrollArea>
                    </Card>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button type="submit">Next: Record Results</Button>
              </div>
            </form>
          </Form>
        )}
        {step === 2 && (
            <Form {...resultsForm}>
                <form onSubmit={resultsForm.handleSubmit(onRecordResults)} className="space-y-6">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className='w-[25%]'>Test Case</TableHead>
                                <TableHead className='w-[15%]'>Status</TableHead>
                                <TableHead className='w-[20%]'>Comments</TableHead>
                                <TableHead className='w-[40%]'>Evidence</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {selectedTestCases.map((tc, index) => (
                                <TableRow key={tc.id}>
                                    <TableCell className='font-medium'>{tc.title}</TableCell>
                                    <TableCell>
                                        <FormField
                                            control={resultsForm.control}
                                            name={`executions.${index}.status`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="Passed">Passed</SelectItem>
                                                            <SelectItem value="Failed">Failed</SelectItem>
                                                            <SelectItem value="Blocked">Blocked</SelectItem>
                                                            <SelectItem value="Deferred">Deferred</SelectItem>
                                                            <SelectItem value="Can't Test">Can't Test</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )}
                                        />
                                    </TableCell>
                                    <TableCell>
                                         <FormField
                                            control={resultsForm.control}
                                            name={`executions.${index}.comments`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Textarea placeholder="Add comments..." {...field} className="h-12"/>
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </TableCell>
                                    <TableCell className='space-y-2'>
                                         <FormField
                                            control={resultsForm.control}
                                            name={`executions.${index}.evidenceLinks`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Input placeholder="Paste URL (comma-separated)" {...field} />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={resultsForm.control}
                                            name={`executions.${index}.evidenceFiles`}
                                            render={({ field: { onChange, ...fieldProps} }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Input 
                                                            {...fieldProps}
                                                            type="file" 
                                                            multiple
                                                            onChange={(e) => onChange(e.target.files)}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setStep(1)}>
                           <ArrowLeft className="mr-2 h-4 w-4" />
                           Back
                        </Button>
                        <Button type="submit">Save Execution Run</Button>
                    </div>
                </form>
            </Form>
        )}
      </CardContent>
    </Card>
  );
}
