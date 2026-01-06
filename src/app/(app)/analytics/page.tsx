'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart } from "lucide-react";

export default function AnalyticsPage() {
    return (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
            <div className="flex flex-col items-center gap-1 text-center">
                <BarChart className="h-16 w-16 text-muted-foreground" />
                <h3 className="text-2xl font-bold tracking-tight">
                    Analytics Coming Soon
                </h3>
                <p className="text-sm text-muted-foreground">
                    This page is under construction. Check back later for detailed analytics.
                </p>
            </div>
        </div>
    );
}