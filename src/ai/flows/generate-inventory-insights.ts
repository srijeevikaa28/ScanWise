'use server';
/**
 * @fileOverview An AI flow to analyze inventory and generate insights.
 *
 * - generateInventoryInsights - A function that takes a list of products and returns insights.
 * - GenerateInventoryInsightsInput - The input type for the flow.
 * - GenerateInventoryInsightsOutput - The output type for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { ProductSchema } from '@/lib/types';

const GenerateInventoryInsightsInputSchema = z.object({
  products: z.array(ProductSchema).describe("The list of products in the inventory."),
});
export type GenerateInventoryInsightsInput = z.infer<
  typeof GenerateInventoryInsightsInputSchema
>;

const GenerateInventoryInsightsOutputSchema = z.object({
    insights: z.string().describe("Actionable insights about the inventory, formatted as markdown with '###' for titles. This should include sections for 'Expiring Soon', 'Low Stock', and an 'Overall Summary'."),
});
export type GenerateInventoryInsightsOutput = z.infer<
  typeof GenerateInventoryInsightsOutputSchema
>;

export async function generateInventoryInsights(
  input: GenerateInventoryInsightsInput
): Promise<GenerateInventoryInsightsOutput> {
  return generateInventoryInsightsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateInventoryInsightsPrompt',
  input: { schema: GenerateInventoryInsightsInputSchema },
  output: { schema: GenerateInventoryInsightsOutputSchema },
  prompt: `You are an expert inventory analyst. Your task is to analyze the provided list of products and generate a concise, actionable summary in markdown format.

The current date is ${new Date().toLocaleDateString()}.

Your analysis must include the following sections, each starting with a '###' title on its own line. There MUST be a newline character after each title.
- ### Expiring Soon
  List products that will expire within the next 30 days. Include the product name and expiry date. If none, state "No items are expiring soon."
- ### Low Stock
  List products with a quantity of 5 or less. Include the product name and current quantity. If none, state "No items are low in stock."
- ### Overall Summary
  Provide a brief, one-paragraph, high-level summary of the inventory's status.

Analyze the following products:
{{{json products}}}

Generate the insights in the specified JSON format. Be clear and concise.`,
});

const generateInventoryInsightsFlow = ai.defineFlow(
  {
    name: 'generateInventoryInsightsFlow',
    inputSchema: GenerateInventoryInsightsInputSchema,
    outputSchema: GenerateInventoryInsightsOutputSchema,
  },
  async (input) => {
    if (input.products.length === 0) {
        return { insights: "### No Products\nThere are no products in the inventory to analyze." };
    }
    
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('Failed to generate inventory insights.');
    }
    return output;
  }
);

    