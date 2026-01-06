'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { useFirestore, useUser } from '@/firebase';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, CheckCircle, Upload, File, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

const EXPECTED_HEADERS = [
  "title", "module", "priority", "severity", "preconditions", "testSteps", 
  "expectedResult", "automationFeasibility", "type", "subModule", "team", 
  "sprint", "release", "testData", "automationPriority", "tags"
];

export default function UploadTestCasesPage({ params }: { params: { projectId: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [headerErrors, setHeaderErrors] = useState<string[]>([]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseCsv(selectedFile);
    }
  };

  const parseCsv = (fileToParse: File) => {
    Papa.parse(fileToParse, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const fileHeaders = results.meta.fields || [];
        setHeaders(fileHeaders);
        setParsedData(results.data);
        validateHeaders(fileHeaders);
      },
      error: (error: any) => {
        toast({
          variant: 'destructive',
          title: 'Parsing Error',
          description: error.message,
        });
      },
    });
  };
  
  const validateHeaders = (fileHeaders: string[]) => {
    const errors: string[] = [];
    EXPECTED_HEADERS.forEach(expectedHeader => {
      if (!fileHeaders.includes(expectedHeader)) {
        errors.push(expectedHeader);
      }
    });
    setHeaderErrors(errors);
  };


  const handleUpload = async () => {
    if (!user || !firestore || parsedData.length === 0 || headerErrors.length > 0) {
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: 'Please fix the errors before uploading.',
      });
      return;
    }

    setIsUploading(true);
    const testCasesCollection = collection(firestore, `users/${user.uid}/projects/${params.projectId}/testCases`);

    try {
      const uploadPromises = parsedData.map(row => {
        const testCaseData = {
          ...row,
          projectId: params.projectId,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
          tags: row.tags?.split(',').map((tag:string) => tag.trim()).filter(Boolean) || [],
          // Ensure enum fields have valid values or defaults
          priority: ['Low', 'Medium', 'High', 'Critical'].includes(row.priority) ? row.priority : 'Medium',
          automationFeasibility: ['Manual', 'Automatable'].includes(row.automationFeasibility) ? row.automationFeasibility : 'Manual',
          type: ['Positive', 'Negative', 'Edge'].includes(row.type) ? row.type : 'Positive',
        };
        return addDocumentNonBlocking(testCasesCollection, testCaseData);
      });

      await Promise.all(uploadPromises);

      toast({
        title: 'Upload Successful',
        description: `${parsedData.length} test cases have been imported.`,
      });
      router.push(`/projects/${params.projectId}`);
    } catch (error) {
      console.error('Error uploading test cases:', error);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: 'There was a problem saving your test cases.',
      });
    } finally {
      setIsUploading(false);
    }
  };

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
          <CardTitle>Upload Test Cases</CardTitle>
          <CardDescription>Upload a CSV file with your test cases. Ensure the column headers match the template.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <Input id="csv-file" type="file" accept=".csv" onChange={handleFileChange} className="max-w-sm" />
          </div>
           {file && (
             <div className="flex items-center text-sm text-muted-foreground">
                <File className="mr-2 h-4 w-4" />
                <span>{file.name} ({parsedData.length} rows)</span>
             </div>
           )}
        </CardContent>
      </Card>
      
      {parsedData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Validation & Preview</CardTitle>
            <CardDescription>Review your data before importing. Mismatched or missing headers are highlighted.</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            {headerErrors.length > 0 ? (
                <div className='p-4 rounded-md bg-destructive/10 text-destructive-foreground'>
                    <div className='flex items-center font-semibold'>
                        <AlertCircle className="mr-2 h-4 w-4" />
                        <span>Header Mismatch Found</span>
                    </div>
                    <p className='text-sm mt-2'>Your file is missing the following required columns: <span className='font-mono text-xs'>{headerErrors.join(', ')}</span>. Please correct your CSV and re-upload.</p>
                </div>
            ) : (
                <div className='p-4 rounded-md bg-green-600/10 text-green-800'>
                    <div className='flex items-center font-semibold'>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        <span>Headers look good!</span>
                    </div>
                    <p className='text-sm mt-2'>All required columns are present. You can proceed with the import.</p>
                </div>
            )}
            <ScrollArea className="h-72 w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    {headers.map(header => (
                      <TableHead 
                        key={header} 
                        className={cn(!EXPECTED_HEADERS.includes(header) && 'bg-destructive/20 text-destructive-foreground')}
                      >
                        {header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.slice(0, 10).map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {headers.map(header => (
                        <TableCell key={`${rowIndex}-${header}`} className="text-xs truncate max-w-[150px]">
                          {row[header]}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
             <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
                <Button 
                    onClick={handleUpload} 
                    disabled={isUploading || headerErrors.length > 0 || parsedData.length === 0}
                >
                    {isUploading ? 'Importing...' : `Import ${parsedData.length} Test Cases`}
                </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

    