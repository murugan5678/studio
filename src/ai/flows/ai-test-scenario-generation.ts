'use server';
/**
 * @fileOverview An AI agent to generate test scenarios from various inputs.
 *
 * - generateTestScenarios - A function that handles the test scenario generation process.
 * - GenerateTestScenariosInput - The input type for the generateTestScenarios function.
 * - GenerateTestScenariosOutput - The return type for the generateTestScenarios function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateTestScenariosInputSchema = z.object({
  inputData: z.string().describe("Screenshots, UI images, Figma links, BRD/PRD documents, or text descriptions as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'. Alternatively, can be plain text."),
});
export type GenerateTestScenariosInput = z.infer<typeof GenerateTestScenariosInputSchema>;

const GenerateTestScenariosOutputSchema = z.object({
  testCases: z.array(
    z.object({
      testCaseId: z.string().describe('The unique identifier for the test case.'),
      testCaseTitle: z.string().describe('The title of the test case.'),
      module: z.string().describe('The module or feature the test case belongs to.'),
      subModule: z.string().describe('The sub-module the test case belongs to.'),
      team: z.string().describe('The team responsible for the test case.'),
      sprintRelease: z.string().describe('The sprint or release the test case is associated with.'),
      priority: z.enum(['Low', 'Medium', 'High', 'Critical']).describe('The priority of the test case.'),
      severity: z.string().describe('The severity of the potential defect.'),
      preconditions: z.string().describe('The preconditions required to execute the test case.'),
      testSteps: z.array(z.string()).describe('The step-by-step instructions for executing the test case.'),
      testData: z.string().describe('The data required for the test case.'),
      expectedResult: z.string().describe('The expected outcome of the test case.'),
      type: z.enum(['Positive', 'Negative', 'Edge']).describe('The type of test case.'),
      automationFeasibility: z.enum(['Manual', 'Automatable']).describe('Whether the test case can be automated.'),
      automationPriority: z.string().describe('The priority for automating the test case.'),
      tagsLabels: z.array(z.string()).describe('The tags or labels associated with the test case.'),
      createdBy: z.string().describe('The user who created the test case.'),
      createdDate: z.string().describe('The date the test case was created.'),
    })
  ).describe('The generated test cases.'),
});
export type GenerateTestScenariosOutput = z.infer<typeof GenerateTestScenariosOutputSchema>;

export async function generateTestScenarios(input: GenerateTestScenariosInput): Promise<GenerateTestScenariosOutput> {
  return generateTestScenariosFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateTestScenariosPrompt',
  input: {schema: GenerateTestScenariosInputSchema},
  output: {schema: GenerateTestScenariosOutputSchema},
  prompt: `You are an expert QA engineer specializing in generating test scenarios from various inputs.

You will analyze the input data (screenshots, UI images, Figma links, BRD/PRD documents, or text descriptions) and generate structured test cases.

Each test case should include the following fields:
- testCaseId: A unique identifier for the test case.
- testCaseTitle: A concise title for the test case.
- module: The module or feature the test case belongs to.
- subModule: The sub-module the test case belongs to.
- team: The team responsible for the test case.
- sprintRelease: The sprint or release the test case is associated with.
- priority: The priority of the test case (Low, Medium, High, Critical).
- severity: The severity of the potential defect.
- preconditions: The preconditions required to execute the test case.
- testSteps: Step-by-step instructions for executing the test case.
- testData: The data required for the test case.
- expectedResult: The expected outcome of the test case.
- type: The type of test case (Positive, Negative, Edge).
- automationFeasibility: Whether the test case can be automated (Manual, Automatable).
- automationPriority: The priority for automating the test case.
- tagsLabels: Tags or labels associated with the test case.
- createdBy: The user who created the test case.
- createdDate: The date the test case was created.

Analyze the following input and generate the test cases:

Input: {{{inputData}}}
`,
});

const generateTestScenariosFlow = ai.defineFlow(
  {
    name: 'generateTestScenariosFlow',
    inputSchema: GenerateTestScenariosInputSchema,
    outputSchema: GenerateTestScenariosOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
