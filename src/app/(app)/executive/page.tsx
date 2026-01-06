'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";

export default function ExecutiveDashboardPage() {
    return (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
            <div className="flex flex-col items-center gap-1 text-center">
                <Shield className="h-16 w-16 text-muted-foreground" />
                <h3 className="text-2xl font-bold tracking-tight">
                    Executive Dashboard
                </h3>
                <p className="text-sm text-muted-foreground">
                    Quality Health Scores and Flaky Test Detection metrics are coming soon.
                </p>
            </div>
        </div>
    );
}
