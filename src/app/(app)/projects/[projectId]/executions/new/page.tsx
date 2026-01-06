'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import * as z from 'zod';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, serverTimestamp } from 'firebase/firestore';
import type { TestCase } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Trash2, Info, Loader2 } from 'lucide-react';

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
      evidenceLinks: z.string().optional(), // For URLs
      evidenceDataUris: z.array(z.string()).optional(), // For file previews
    })
  ),
});


function fileToDataUri(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}


export default function NewExecutionPage() {
  const router = useRouter();
  const params = useParams() as { projectId: string };
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const [step, setStep] = useState(1);
  const [selectedTestCases, setSelectedTestCases] = useState<TestCase[]>([]);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);


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

  const { fields, update } = useFieldArray({
    control: resultsForm.control,
    name: 'executions',
  });

  function onSelectTestCases(values: z.infer<typeof executionFormSchema>) {
    if (!testCases) return;
    const selected = testCases.filter(tc => values.testCaseIds.includes(tc.id));
    setSelectedTestCases(selected);
    
    resultsForm.reset({
        executions: selected.map(tc => ({
            testCaseId: tc.id,
            status: 'Passed',
            comments: '',
            evidenceLinks: '',
            evidenceDataUris: [],
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
        const urlLinks = ex.evidenceLinks ? ex.evidenceLinks.split(',').map(link => link.trim()).filter(Boolean) : [];
        const allLinks = [...urlLinks, ...(ex.evidenceDataUris || [])];
        return {
          testCaseId: ex.testCaseId,
          status: ex.status,
          comments: ex.comments || '',
          evidenceLinks: allLinks,
          evidenceFiles: [], // Deprecating direct file handling for now in favor of data URIs
        }
      }),
    };
    
    const testExecutionsCollection = collection(firestore, `users/${user.uid}/projects/${params.projectId}/testExecutions`);
    
    addDocumentNonBlocking(testExecutionsCollection, executionRunData);

    toast({
        title: 'Execution Run Saved',
        description: 'The test execution results have been saved.',
    });
    router.push(`/projects/${params.projectId}`);
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const files = e.target.files;
    if (files) {
      setIsProcessingFiles(true);
      try {
        const dataUriPromises = Array.from(files).map(fileToDataUri);
        const dataUris = await Promise.all(dataUriPromises);
        
        const currentExecution = resultsForm.getValues(`executions.${index}`);
        const existingUris = currentExecution.evidenceDataUris || [];

        update(index, { 
          ...currentExecution, 
          evidenceDataUris: [...existingUris, ...dataUris]
        });
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'File Error',
          description: 'Could not process one or more files.',
        });
      } finally {
        setIsProcessingFiles(false);
         if (fileInputRefs.current[index]) {
            fileInputRefs.current[index]!.value = '';
        }
      }
    }
  };

  const removeDataUri = (index: number, uriIndex: number) => {
    const currentExecution = resultsForm.getValues(`executions.${index}`);
    const updatedUris = [...(currentExecution.evidenceDataUris || [])];
    updatedUris.splice(uriIndex, 1);
    update(index, { ...currentExecution, evidenceDataUris: updatedUris });
  };
  
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
                  <TooltipProvider>
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
                            {fields.map((field, index) => {
                                const testCase = selectedTestCases.find(tc => tc.id === field.testCaseId);
                                if (!testCase) return null;
                                
                                const evidenceDataUris = resultsForm.watch(`executions.${index}.evidenceDataUris`) || [];

                                return (
                                <TableRow key={field.id}>
                                    <TableCell className='font-medium'>{testCase.title}</TableCell>
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
                                                        <Textarea placeholder="Add comments..." {...field} value={field.value || ''} className="h-24"/>
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </TableCell>
                                    <TableCell className='space-y-2'>
                                        <div className='flex items-start gap-1'>
                                         <FormField
                                            control={resultsForm.control}
                                            name={`executions.${index}.evidenceLinks`}
                                            render={({ field }) => (
                                                <FormItem className='flex-1'>
                                                    <FormControl>
                                                        <Input placeholder="Paste URL (comma-separated)" {...field} value={field.value || ''} />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        </div>
                                        <div className='flex items-start gap-1'>
                                          <FormItem className='flex-1'>
                                              <div className='flex items-center gap-1'>
                                              <FormControl>
                                                  <Input
                                                      type="file" 
                                                      multiple
                                                      accept="image/*,video/*"
                                                      disabled={isProcessingFiles}
                                                      onChange={(e) => handleFileChange(e, index)}
                                                      ref={el => fileInputRefs.current[index] = el}
                                                  />
                                              </FormControl>
                                                {isProcessingFiles && <Loader2 className='h-4 w-4 animate-spin'/>}
                                              </div>
                                          </FormItem>
                                        </div>
                                        {(evidenceDataUris.length > 0) && (
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {evidenceDataUris.map((uri, uriIndex) => (
                                                    <div key={uriIndex} className="relative w-20 h-20 group">
                                                        {uri.startsWith('data:image') ? (
                                                            <Image src={uri} alt={`Preview ${uriIndex}`} layout="fill" objectFit="cover" className="rounded-md"/>
                                                        ) : (
                                                            <video src={uri} className="w-20 h-20 rounded-md object-cover" />
                                                        )}
                                                        <Button 
                                                          size="icon" 
                                                          variant="destructive" 
                                                          className="absolute -top-2 -right-2 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                          onClick={() => removeDataUri(index, uriIndex)}
                                                          type='button'
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                  </TooltipProvider>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setStep(1)}>
                           <ArrowLeft className="mr-2 h-4 w-4" />
                           Back
                        </Button>
                        <Button type="submit" disabled={isProcessingFiles}>
                          {isProcessingFiles ? 'Processing...' : 'Save Execution Run'}
                        </Button>
                    </div>
                </form>
            </Form>
        )}
      </CardContent>
    </Card>
  );
}
