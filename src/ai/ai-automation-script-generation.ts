'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating automation scripts from test cases using AI.
 *
 * The flow takes in test cases and an automation framework, and outputs an automation script.
 *
 * - generateAutomationScript - A function that handles the generation of the automation script.
 * - AutomationScriptInput - The input type for the generateAutomationScript function.
 * - AutomationScriptOutput - The return type for the generateAutomationScript function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AutomationScriptInputSchema = z.object({
  testCases: z.array(
    z.object({
      testCaseTitle: z.string().describe('The title of the test case.'),
      testSteps: z.string().describe('The test steps for the test case.'),
      expectedResult: z.string().describe('The expected result of the test case.'),
    })
  ).describe('An array of test cases to generate automation scripts from.'),
  automationFramework: z.enum(['Playwright', 'Cypress', 'Selenium']).describe('The automation framework to use for generating the script.'),
});

export type AutomationScriptInput = z.infer<typeof AutomationScriptInputSchema>;

const AutomationScriptOutputSchema = z.object({
  script: z.string().describe('The generated automation script.'),
});

export type AutomationScriptOutput = z.infer<typeof AutomationScriptOutputSchema>;

export async function generateAutomationScript(input: AutomationScriptInput): Promise<AutomationScriptOutput> {
  return generateAutomationScriptFlow(input);
}

const generateAutomationScriptPrompt = ai.definePrompt({
  name: 'generateAutomationScriptPrompt',
  input: {schema: AutomationScriptInputSchema},
  output: {schema: AutomationScriptOutputSchema},
  prompt: `You are an expert automation script generator. You will receive test cases and an automation framework. You will generate an automation script based on the test cases, which should be compatible with the given framework.

Automation Framework: {{{automationFramework}}}

Test Cases:
{{#each testCases}}
Test Case Title: {{{testCaseTitle}}}
Test Steps: {{{testSteps}}}
Expected Result: {{{expectedResult}}}
{{/each}}
`,
});

const generateAutomationScriptFlow = ai.defineFlow(
  {
    name: 'generateAutomationScriptFlow',
    inputSchema: AutomationScriptInputSchema,
    outputSchema: AutomationScriptOutputSchema,
  },
  async input => {
    const {output} = await generateAutomationScriptPrompt(input);
    return output!;
  }
);
