'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, serverTimestamp, writeBatch, doc, getDocs } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, Lightbulb, Loader2 } from 'lucide-react';
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
    const projectId = values.projectId;

    let inputForAI: GenerateTestScenariosInput;

    try {
        if (values.fileInput) {
            const dataUri = await fileToDataUri(values.fileInput);
            inputForAI = { inputData: dataUri };
        } else {
            inputForAI = { inputData: values.textInput! };
        }

        const result = await generateTestScenarios(inputForAI);
        
        if (!user || !firestore || !projectId || result.testCases.length === 0) {
            toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not generate or save test cases.' });
            setIsGenerating(false);
            return;
        }

        const testCasesCollection = collection(firestore, `users/${user.uid}/projects/${projectId}/testCases`);
        const batch = writeBatch(firestore);

        const existingCasesSnap = await getDocs(testCasesCollection);
        let nextIdCounter = existingCasesSnap.size;

        result.testCases.forEach(tc => {
            nextIdCounter++;
            const testCaseId = `TC${String(nextIdCounter).padStart(4, '0')}`;
            const docRef = doc(testCasesCollection, testCaseId);
            
            const newTestCase = {
                ...tc,
                id: testCaseId,
                projectId: projectId,
                createdBy: user.uid,
                createdAt: serverTimestamp(),
                testSteps: Array.isArray(tc.testSteps) ? tc.testSteps.join('\n') : tc.testSteps,
                tags: Array.isArray(tc.tags) ? tc.tags : [],
                status: 'Pending',
            };
            batch.set(docRef, newTestCase);
        });

        await batch.commit();

        toast({
            title: 'Scenarios Generated!',
            description: `${result.testCases.length} test cases are ready for your review.`,
        });
        router.push(`/projects/${projectId}/review`);
    } catch (error) {
        console.error("Error generating or saving scenarios:", error);
        toast({
            variant: 'destructive',
            title: 'Generation Failed',
            description: 'There was a problem generating or saving test scenarios.',
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
                {isGenerating ? 'Generating...' : 'Generate and Review Scenarios'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {isGenerating && (
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
