
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Check, X, ShieldCheck, Ban, HelpCircle } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useMemo, useState, useEffect } from 'react';

// --- Dummy Data ---
const dummyProject = { id: 'proj_1', name: 'Phoenix Project' };
const dummyGateConfig = {
  id: 'proj_1',
  projectId: 'proj_1',
  minPassPercentage: 95,
  maxCriticalBugs: 0,
  maxHighBugs: 2,
  maxMediumBugs: 10,
};
const dummyMetrics = {
    passPercentage: 98,
    openBugs: { critical: 0, high: 1, medium: 5 }
};
const dummyApproval = {
    id: 'proj_1',
    projectId: 'proj_1',
    status: 'Ready for Production' as const,
    history: [
        {
            status: 'Ready for Production' as const,
            changedBy: 'system@test.ai',
            changedAt: new Date(),
            comment: 'Initial state'
        }
    ]
};
// --- End Dummy Data ---

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
      {isLoading ? <div className="h-5 w-5 rounded-full bg-muted animate-pulse" /> : 
        isMet === null ? <HelpCircle className="h-5 w-5 text-gray-400" title="Metrics not available" /> :
        isMet ? <Check className="h-5 w-5 text-green-500" /> : <X className="h-5 w-5 text-destructive" />
      }
    </div>
  );

export default function QualityGateDetailsPage() {
    const router = useRouter();
    const params = useParams() as { projectId: string };
    const { toast } = useToast();
    
    // --- State Management with Dummy Data ---
    const [isSaving, setIsSaving] = useState(false);
    const [isApproving, setIsApproving] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [approvalAction, setApprovalAction] = useState<'approve' | 'block' | null>(null);

    // Use state to hold our dummy data so it can be updated
    const [project] = useState(dummyProject);
    const [gateConfig, setGateConfig] = useState(dummyGateConfig);
    const [approval, setApproval] = useState(dummyApproval);
    const [metrics] = useState(dummyMetrics);

    const form = useForm<z.infer<typeof qualityGateSchema>>({
        resolver: zodResolver(qualityGateSchema),
        defaultValues: gateConfig,
    });
     useEffect(() => {
        form.reset(gateConfig);
    }, [gateConfig, form]);

    const approvalForm = useForm<z.infer<typeof approvalSchema>>({
        resolver: zodResolver(approvalSchema),
        defaultValues: { comment: '' }
    });

    // --- Gate Logic using Dummy Data ---
    const gateChecklist = useMemo(() => {
        if (!gateConfig || !metrics) return null;
        return {
            passRateMet: metrics.passPercentage >= gateConfig.minPassPercentage,
            criticalBugsMet: metrics.openBugs.critical <= gateConfig.maxCriticalBugs,
            highBugsMet: metrics.openBugs.high <= gateConfig.maxHighBugs,
            mediumBugsMet: metrics.openBugs.medium <= gateConfig.maxMediumBugs,
        }
    }, [gateConfig, metrics]);
    
    const allGatesPassed = useMemo(() => {
        if (!gateChecklist) return false;
        return Object.values(gateChecklist).every(isMet => isMet === true);
    }, [gateChecklist]);

    async function onSaveGate(values: z.infer<typeof qualityGateSchema>) {
        setIsSaving(true);
        // Simulate saving
        await new Promise(resolve => setTimeout(resolve, 500));
        setGateConfig(values); // Update state with new values
        toast({ title: 'Quality Gate Saved', description: 'Your configuration has been updated.' });
        setIsSaving(false);
    }
    
    async function onApproveOrBlock(values: z.infer<typeof approvalSchema>) {
        setIsApproving(true);
        const newStatus = approvalAction === 'approve' ? 'Approved for Deployment' : 'Blocked';
        
        // Simulate saving
        await new Promise(resolve => setTimeout(resolve, 500));

        const newHistoryEntry = {
            status: newStatus,
            changedBy: 'qa.lead@test.ai',
            changedAt: new Date(),
            comment: values.comment || '',
        };

        setApproval({
            ...approval,
            status: newStatus,
            history: [...approval.history, newHistoryEntry]
        });
        
        toast({ title: `Project ${newStatus}`, description: `The project has been marked as ${newStatus}.` });
        setIsApproving(false);
        setIsDialogOpen(false);
        approvalForm.reset();
    }

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
                                        <FormField control={form.control} name="minPassPercentage" render={({ field }) => ( <FormItem><FormLabel>Min. Pass % ({metrics.passPercentage}%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                        <FormField control={form.control} name="maxCriticalBugs" render={({ field }) => ( <FormItem><FormLabel>Max Critical Bugs ({metrics.openBugs.critical})</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                        <FormField control={form.control} name="maxHighBugs" render={({ field }) => ( <FormItem><FormLabel>Max High Bugs ({metrics.openBugs.high})</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                        <FormField control={form.control} name="maxMediumBugs" render={({ field }) => ( <FormItem><FormLabel>Max Medium Bugs ({metrics.openBugs.medium})</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
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
                                                <p className="text-sm text-muted-foreground">{entry.changedAt.toLocaleString()}</p>
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
                                <Badge variant={approval?.status === 'Approved for Deployment' ? 'secondary' : approval?.status === 'Blocked' ? 'destructive' : 'outline'}>
                                    {approval?.status ?? 'Not Ready'}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="divide-y">
                            {gateChecklist && (
                                <>
                                <GateChecklistItem label={`Test Pass Rate >= ${gateConfig.minPassPercentage}%`} isMet={gateChecklist.passRateMet} isLoading={false} />
                                <GateChecklistItem label={`Critical Bugs <= ${gateConfig.maxCriticalBugs}`} isMet={gateChecklist.criticalBugsMet} isLoading={false} />
                                <GateChecklistItem label={`High Bugs <= ${gateConfig.maxHighBugs}`} isMet={gateChecklist.highBugsMet} isLoading={false} />
                                <GateChecklistItem label={`Medium Bugs <= ${gateConfig.maxMediumBugs}`} isMet={gateChecklist.mediumBugsMet} isLoading={false} />
                                </>
                            )}
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
