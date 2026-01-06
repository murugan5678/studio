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
  inputData: z.string().describe("A data URI of a screenshot, UI image, or document (e.g., 'data:image/png;base64,...'). Alternatively, it can be a plain text description, a link to a Figma design, or the content of a BRD/PRD."),
});
export type GenerateTestScenariosInput = z.infer<typeof GenerateTestScenariosInputSchema>;

const TestCaseSchema = z.object({
  testCaseId: z.string().describe('A unique sequential identifier for the test case, formatted as "TC" followed by a number (e.g., "TC001", "TC002").'),
  title: z.string().describe('A concise title for the test case.'),
  module: z.string().describe('The primary module or feature the test case belongs to.'),
  subModule: z.string().describe('The specific sub-module or component being tested.'),
  team: z.string().describe('The team responsible for this test area (e.g., "Frontend", "Backend", "QA Core").'),
  sprint: z.string().describe('The sprint or release cycle this test case is associated with (e.g., "Sprint 24.08", "v2.1 Release").'),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']).describe('The execution priority of the test case.'),
  severity: z.string().describe('The severity of the potential defect if this test fails (e.g., "Minor", "Major", "Critical").'),
  preconditions: z.string().describe('The conditions that must be met before executing the test case.'),
  testSteps: z.array(z.string()).describe('The step-by-step instructions for executing the test.'),
  testData: z.string().describe('The specific data to be used for the test (e.g., user credentials, search queries).'),
  expectedResult: z.string().describe('The expected outcome after executing the test steps.'),
  type: z.enum(['Positive', 'Negative', 'Edge']).describe('The nature of the test case (e.g., testing valid inputs, invalid inputs, or boundary conditions).'),
  automationFeasibility: z.enum(['Manual', 'Automatable']).describe('Whether the test case is a good candidate for automation.'),
  automationPriority: z.string().describe('The priority for automating this test case (e.g., "P0", "P1", "P2").'),
  tags: z.array(z.string()).describe('Relevant tags or labels for grouping and filtering (e.g., "smoke", "regression", "login").'),
  status: z.enum(['Pending', 'Approved']).default('Pending').describe('The approval status of the test case. Always set to "Pending" for initial generation.'),
  ticketUrl: z.string().optional().describe('A URL to a ticket in a tool like Jira. If the input contains a ticket link, include it here.')
});

const GenerateTestScenariosOutputSchema = z.object({
  testCases: z.array(TestCaseSchema).describe('The array of generated test cases.'),
});
export type GenerateTestScenariosOutput = z.infer<typeof GenerateTestScenariosOutputSchema>;

export async function generateTestScenarios(input: GenerateTestScenariosInput): Promise<GenerateTestScenariosOutput> {
  const result = await generateTestScenariosFlow(input);
  // Post-process to add unique IDs if the model didn't, using a simple counter.
  const processedCases = result.testCases.map((tc, index) => ({
    ...tc,
    testCaseId: `TC${String(index + 1).padStart(3, '0')}`,
    status: 'Pending' as const, // Ensure status is always Pending
  }));
  return { testCases: processedCases };
}

const prompt = ai.definePrompt({
  name: 'generateTestScenariosPrompt',
  input: {schema: GenerateTestScenariosInputSchema},
  output: {schema: GenerateTestScenariosOutputSchema},
  prompt: `You are a world-class Senior QA Engineer tasked with creating a comprehensive suite of test cases based on provided materials. Your goal is to be thorough, precise, and to structure your output perfectly according to the specified JSON schema.

Analyze the provided input, which could be a screenshot, a design link, a document, or a simple text description of a feature. From this, generate a diverse set of test cases covering positive paths, negative paths, and edge cases.

For each test case, meticulously fill out all fields in the required structure. Ensure the testCaseId is a sequential identifier like "TC001", "TC002", etc.
Crucially, set the 'status' field for every generated test case to 'Pending'.

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

    
    