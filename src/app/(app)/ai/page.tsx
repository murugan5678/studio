'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Lightbulb } from 'lucide-react';
import Link from 'next/link';

const aiTools = [
    {
        title: 'AI Scenario Generator',
        description: 'Upload a file (screenshot, doc) or provide a text description/link to have AI generate test cases for you.',
        icon: Lightbulb,
        href: '/ai/scenario-generator'
    },
    {
        title: 'AI Script Generator',
        description: 'Select test cases from a project and a framework to generate an automation script.',
        icon: Bot,
        href: '/ai/script-generator'
    }
]

export default function AiToolsPage() {
    return (
        <div className='space-y-6'>
             <div>
                <h1 className="text-3xl font-bold tracking-tight">AI Generation Tools</h1>
                <p className="text-muted-foreground">Leverage AI to accelerate your testing workflow.</p>
            </div>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                {aiTools.map(tool => (
                     <Link href={tool.href} key={tool.title}>
                        <Card className='h-full hover:border-primary transition-colors'>
                            <CardHeader className='flex-row gap-4 items-center'>
                                <tool.icon className='w-8 h-8 text-primary'/>
                                <div>
                                    <CardTitle>{tool.title}</CardTitle>
                                    <CardDescription>{tool.description}</CardDescription>
                                </div>
                            </CardHeader>
                        </Card>
                     </Link>
                ))}
            </div>
        </div>
    )
}
