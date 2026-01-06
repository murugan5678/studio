'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, serverTimestamp, writeBatch } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Lightbulb, Loader2, Sparkles } from 'lucide-react';
import { generateTestScenarios, type GenerateTestScenariosOutput } from '@/ai/flows/ai-test-scenario-generation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Project } from '@/lib/types';


const formSchema = z.object({
  projectId: z.string().min(1, { message: "Please select a project." }),
  textInput: z.string().optional(),
  fileInput: z.instanceof(File).optional(),
}).refine(data => data.textInput || data.fileInput, {
  message: 'Please provide either text input or a file.',
  path: ['textInput'],
});

type GeneratedTestCase = GenerateTestScenariosOutput['testCases'][0];
type GenerateTestScenariosInput = { inputData: string };

function fileToDataUri(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export default function AiScenarioGeneratorPage() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [generatedCases, setGeneratedCases] = useState<GeneratedTestCase[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const projectsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return collection(firestore, `users/${user.uid}/projects`);
  }, [user, firestore]);

  const { data: projects, isLoading: areProjectsLoading } = useCollection<Project>(projectsQuery);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsGenerating(true);
    setGeneratedCases([]);

    let inputForAI: GenerateTestScenariosInput;

    try {
        if (values.fileInput) {
            const dataUri = await fileToDataUri(values.fileInput);
            inputForAI = { inputData: dataUri };
        } else {
            inputForAI = { inputData: values.textInput! };
        }

        const result = await generateTestScenarios(inputForAI);
        setGeneratedCases(result.testCases);
        toast({
            title: 'Scenarios Generated!',
            description: `The AI has generated ${result.testCases.length} test cases for your review.`,
        });
    } catch (error) {
        console.error("Error generating scenarios:", error);
        toast({
            variant: 'destructive',
            title: 'Generation Failed',
            description: 'There was a problem generating test scenarios.',
        });
    } finally {
        setIsGenerating(false);
    }
  }

  async function handleSaveCases() {
    const projectId = form.getValues('projectId');
    if (!user || !firestore || !projectId || generatedCases.length === 0) {
        toast({ variant: 'destructive', title: 'Save Failed', description: 'Please select a project and generate cases first.' });
        return;
    }
    
    setIsGenerating(true); // Reuse loading state for saving

    const testCasesCollection = collection(firestore, `users/${user.uid}/projects/${projectId}/testCases`);
    const batch = writeBatch(firestore);

    generatedCases.forEach(tc => {
        const docRef = collection(testCasesCollection).doc(); // Auto-generate ID
        const newTestCase = {
            ...tc,
            id: docRef.id,
            projectId: projectId,
            createdBy: user.uid,
            createdAt: serverTimestamp(),
            testSteps: Array.isArray(tc.testSteps) ? tc.testSteps.join('\\n') : tc.testSteps,
            tags: Array.isArray(tc.tags) ? tc.tags : [],
        };
        batch.set(docRef, newTestCase);
    });

    try {
        await batch.commit();
        toast({
            title: 'Test Cases Saved!',
            description: `${generatedCases.length} test cases have been added to your project.`,
        });
        router.push(`/projects/${projectId}`);
    } catch (error) {
        console.error("Error saving test cases:", error);
        toast({
            variant: 'destructive',
            title: 'Save Failed',
            description: 'Could not save the generated test cases to the database.',
        });
    } finally {
        setIsGenerating(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div className='flex justify-start'>
          <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
          </Button>
       </div>
      <Card>
        <CardHeader>
          <CardTitle>AI Test Scenario Generator</CardTitle>
          <CardDescription>Upload a file (screenshot, doc) or provide a text description/link to have AI generate test cases for you.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={areProjectsLoading}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a project to add cases to" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projects?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="textInput"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Text Input</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Paste a feature description, user story, or a link to a Figma design..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fileInput"
                render={({ field: { onChange, value, ...rest } }) => (
                  <FormItem>
                    <FormLabel>File Upload</FormLabel>
                    <FormControl>
                      <Input 
                        type="file" 
                        onChange={(e) => onChange(e.target.files?.[0])}
                        {...rest}
                        />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isGenerating || areProjectsLoading} className="w-full">
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                {isGenerating ? 'Generating...' : 'Generate Scenarios'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {generatedCases.length > 0 && (
         <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Generated Test Cases</CardTitle>
                    <CardDescription>Review the test cases below. Click "Save Cases" to add them to your project.</CardDescription>
                </div>
                <Button onClick={handleSaveCases} disabled={isGenerating}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {isGenerating ? 'Saving...' : `Save ${generatedCases.length} Cases`}
                </Button>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[600px]">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Module</TableHead>
                                <TableHead>Priority</TableHead>
                                <TableHead>Type</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {generatedCases.map((tc) => (
                                <TableRow key={tc.testCaseId}>
                                    <TableCell className="font-medium">{tc.title}</TableCell>
                                    <TableCell>{tc.module}</TableCell>
                                    <TableCell>{tc.priority}</TableCell>
                                    <TableCell>{tc.type}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </CardContent>
         </Card>
      )}

      {isGenerating && generatedCases.length === 0 && (
        <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertTitle>AI is thinking...</AlertTitle>
            <AlertDescription>
                Please wait while the test scenarios are being generated. This might take a moment.
            </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
