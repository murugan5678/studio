'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useUser, useFirestore, useMemoFirebase, useDoc, setDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, serverTimestamp, getDocs } from 'firebase/firestore';
import type { Project, QualityGateConfig, DeploymentApproval, DeploymentApprovalHistory } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Check, X, ShieldCheck, Ban, HelpCircle } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useMemo, useState, useEffect } from 'react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';


const qualityGateSchema = z.object({
    minPassPercentage: z.coerce.number().min(0).max(100),
    maxCriticalBugs: z.coerce.number().min(0),
    maxHighBugs: z.coerce.number().min(0),
    maxMediumBugs: z.coerce.number().min(0),
});

const approvalSchema = z.object({
    comment: z.string().optional(),
});

const GateChecklistItem = ({ label, isMet, isLoading }: { label: string; isMet: boolean | null; isLoading: boolean }) => (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm">{label}</span>
      {isLoading ? <Skeleton className="h-5 w-5 rounded-full" /> : 
        isMet === null ? <HelpCircle className="h-5 w-5 text-gray-400" title="Metrics not available" /> :
        isMet ? <Check className="h-5 w-5 text-green-500" /> : <X className="h-5 w-5 text-destructive" />
      }
    </div>
  );

export default function QualityGateDetailsPage() {
    const router = useRouter();
    const params = useParams() as { projectId: string };
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [isApproving, setIsApproving] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [approvalAction, setApprovalAction] = useState<'approve' | 'block' | null>(null);

    const projectRef = useMemoFirebase(() => user && firestore ? doc(firestore, `users/${user.uid}/projects/${params.projectId}`) : null, [user, firestore, params.projectId]);
    const gateConfigRef = useMemoFirebase(() => user && firestore ? doc(firestore, `users/${user.uid}/projects/${params.projectId}/qualityGateConfig/${params.projectId}`) : null, [user, firestore, params.projectId]);
    const approvalRef = useMemoFirebase(() => user && firestore ? doc(firestore, `users/${user.uid}/projects/${params.projectId}/deploymentApproval/${params.projectId}`) : null, [user, firestore, params.projectId]);
    
    const { data: project, isLoading: isProjectLoading } = useDoc<Project>(projectRef);
    const { data: gateConfig, isLoading: isConfigLoading } = useDoc<QualityGateConfig>(gateConfigRef);
    const { data: approval, isLoading: isApprovalLoading } = useDoc<DeploymentApproval>(approvalRef);

    const form = useForm<z.infer<typeof qualityGateSchema>>({
        resolver: zodResolver(qualityGateSchema),
        defaultValues: { minPassPercentage: 90, maxCriticalBugs: 0, maxHighBugs: 5, maxMediumBugs: 20 },
    });

    const approvalForm = useForm<z.infer<typeof approvalSchema>>({
        resolver: zodResolver(approvalSchema),
        defaultValues: { comment: '' }
    });

    useEffect(() => {
        if (gateConfig) {
            form.reset(gateConfig);
        } else {
             form.reset({ minPassPercentage: 90, maxCriticalBugs: 0, maxHighBugs: 5, maxMediumBugs: 20 });
        }
    }, [gateConfig, form]);


    async function onSaveGate(values: z.infer<typeof qualityGateSchema>) {
        if (!gateConfigRef) return;
        setIsSaving(true);
        const data = { ...values, projectId: params.projectId, id: params.projectId };
        await setDocumentNonBlocking(gateConfigRef, data, { merge: true });
        toast({ title: 'Quality Gate Saved', description: 'Your configuration has been updated.' });
        setIsSaving(false);
    }
    
    async function onApproveOrBlock(values: z.infer<typeof approvalSchema>) {
        if (!approvalRef || !user) return;
        setIsApproving(true);

        const newStatus = approvalAction === 'approve' ? 'Approved for Deployment' : 'Blocked';
        const historyEntry: DeploymentApprovalHistory = {
            status: newStatus,
            changedBy: user.email || user.uid,
            changedAt: serverTimestamp() as any,
            comment: values.comment || '',
        };

        const currentHistory = approval?.history ?? [];
        const newHistory = [...currentHistory, historyEntry];

        const data = {
            id: params.projectId,
            projectId: params.projectId,
            status: newStatus,
            approvedBy: approvalAction === 'approve' ? (user.email || user.uid) : undefined,
            approvedAt: approvalAction === 'approve' ? serverTimestamp() : undefined,
            comments: values.comment,
            history: newHistory,
        };
        
        await setDocumentNonBlocking(approvalRef, data, { merge: true });
        
        toast({ title: `Project ${newStatus}`, description: `The project has been marked as ${newStatus}.` });
        setIsApproving(false);
        setIsDialogOpen(false);
        approvalForm.reset();
    }

    const isLoading = isProjectLoading || isConfigLoading || isApprovalLoading;

    if (isLoading) return (
        <div className="space-y-6">
            <Skeleton className="h-8 w-1/4 mb-4" />
            <Skeleton className="h-10 w-48" />
            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2"><CardHeader><Skeleton className="h-6 w-1/2"/></CardHeader><CardContent><Skeleton className="h-48 w-full"/></CardContent></Card>
                <Card className="lg:col-span-1"><CardHeader><Skeleton className="h-6 w-1/2"/></CardHeader><CardContent><Skeleton className="h-48 w-full"/></CardContent></Card>
            </div>
        </div>
    );

    // For now, we assume gates cannot be met until live data is re-integrated
    const allGatesPassed = false; 

    return (
        <div className="space-y-6">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm {approvalAction === 'approve' ? 'Approval' : 'Block'}</DialogTitle>
                        <DialogDescription>
                            Please provide a comment for this action. This will be recorded in the audit history.
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...approvalForm}>
                        <form onSubmit={approvalForm.handleSubmit(onApproveOrBlock)} className="space-y-4">
                            <FormField control={approvalForm.control} name="comment"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Comment</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Add reason or context for this decision..." {...field} />
                                    </FormControl>
                                </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={isApproving}>
                                    {isApproving ? 'Saving...' : `Confirm ${approvalAction === 'approve' ? 'Approval' : 'Block'}`}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            <div>
                <Button variant="outline" onClick={() => router.back()} className="mb-4"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
                <h1 className="text-3xl font-bold tracking-tight">Quality Gate: {project?.name}</h1>
                <p className="text-muted-foreground">Configure and view the production readiness for this project.</p>
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Quality Gate Configuration</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSaveGate)} className="space-y-4">
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <FormField control={form.control} name="minPassPercentage" render={({ field }) => ( <FormItem><FormLabel>Min. Pass %</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                        <FormField control={form.control} name="maxCriticalBugs" render={({ field }) => ( <FormItem><FormLabel>Max Critical Bugs</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                        <FormField control={form.control} name="maxHighBugs" render={({ field }) => ( <FormItem><FormLabel>Max High Bugs</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                        <FormField control={form.control} name="maxMediumBugs" render={({ field }) => ( <FormItem><FormLabel>Max Medium Bugs</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                    </div>
                                    <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Configuration'}</Button>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Approval History</CardTitle></CardHeader>
                        <CardContent>
                            {approval?.history && approval.history.length > 0 ? (
                                <ul className="space-y-4">
                                    {approval.history.slice().reverse().map((entry, index) => (
                                        <li key={index} className="flex items-start gap-4">
                                            <div className={`mt-1.5 h-2.5 w-2.5 rounded-full ${entry.status === 'Approved for Deployment' ? 'bg-green-500' : 'bg-destructive'}`} />
                                            <div>
                                                <p className="font-semibold">{entry.status} by {entry.changedBy}</p>
                                                <p className="text-sm text-muted-foreground">{(entry.changedAt as any)?.toDate().toLocaleString()}</p>
                                                {entry.comment && <p className="text-sm mt-1 p-2 bg-muted rounded-md">{entry.comment}</p>}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center">No approval history yet.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Deployment Approval</CardTitle>
                            <div className="flex items-center gap-2">
                                <span className="font-semibold">Status:</span>
                                {isApprovalLoading ? <Skeleton className="h-6 w-24" /> :
                                <Badge variant={approval?.status === 'Approved for Deployment' ? 'secondary' : approval?.status === 'Blocked' ? 'destructive' : 'outline'}>
                                    {approval?.status ?? 'Not Ready'}
                                </Badge>
                                }
                            </div>
                        </CardHeader>
                        <CardContent className="divide-y">
                            <GateChecklistItem label={`Test Pass Rate >= ${form.watch('minPassPercentage')}%`} isMet={null} isLoading={false} />
                            <GateChecklistItem label={`Critical Bugs <= ${form.watch('maxCriticalBugs')}`} isMet={null} isLoading={false} />
                            <GateChecklistItem label={`High Bugs <= ${form.watch('maxHighBugs')}`} isMet={null} isLoading={false} />
                            <GateChecklistItem label={`Medium Bugs <= ${form.watch('maxMediumBugs')}`} isMet={null} isLoading={false} />
                        </CardContent>
                        <CardFooter className="flex-col gap-2 pt-4">
                            <Button className="w-full" disabled={!allGatesPassed || isApproving} onClick={() => { setApprovalAction('approve'); setIsDialogOpen(true); }}>
                                <ShieldCheck className="mr-2 h-4 w-4" /> Approve for Deployment
                            </Button>
                            <Button variant="destructive" className="w-full" disabled={isApproving} onClick={() => { setApprovalAction('block'); setIsDialogOpen(true); }}>
                                <Ban className="mr-2 h-4 w-4" /> Block Deployment
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    );
}
