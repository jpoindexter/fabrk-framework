/**
 * AI Form Generator Schemas
 * Zod schemas for structured AI outputs
 */

import { z } from 'zod';

// Field types supported by the form generator
export const fieldTypeSchema = z.enum([
  'text',
  'email',
  'password',
  'number',
  'tel',
  'url',
  'textarea',
  'select',
  'checkbox',
  'radio',
  'date',
  'time',
  'datetime',
  'file',
]);

export type FieldType = z.infer<typeof fieldTypeSchema>;

// Individual form field schema
export const formFieldSchema = z.object({
  name: z.string().describe('Field name (camelCase, e.g., firstName)'),
  label: z.string().describe('Human-readable label'),
  type: fieldTypeSchema.describe('Input type'),
  placeholder: z.string().optional().describe('Placeholder text'),
  required: z.boolean().default(true).describe('Is this field required?'),
  validation: z
    .object({
      min: z.number().optional().describe('Minimum value/length'),
      max: z.number().optional().describe('Maximum value/length'),
      pattern: z.string().optional().describe('Regex pattern'),
      message: z.string().optional().describe('Custom error message'),
    })
    .optional()
    .describe('Validation rules'),
  options: z
    .array(
      z
        .object({
          value: z.string(),
          label: z.string().optional(),
        })
        .transform((opt) => ({
          value: opt.value,
          // Use value as label if label is missing
          label: opt.label || opt.value,
        }))
    )
    .optional()
    .describe('Options for select/radio fields'),
  defaultValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
});

export type FormField = z.infer<typeof formFieldSchema>;

// Complete form schema
export const generatedFormSchema = z.object({
  name: z.string().describe('Form name (PascalCase, e.g., ContactForm)'),
  description: z.string().describe('Brief description of the form purpose'),
  fields: z.array(formFieldSchema).min(1).describe('Form fields'),
  submitLabel: z.string().default('Submit').describe('Submit button text'),
});

export type GeneratedForm = z.infer<typeof generatedFormSchema>;

// System prompt for form generation
export const FORM_GENERATOR_SYSTEM_PROMPT = `You are a form generator assistant. When given a description of a form, you generate a structured JSON schema that can be used to render a React form with validation.

Guidelines:
- Use camelCase for field names (e.g., firstName, emailAddress)
- Use PascalCase for form names (e.g., ContactForm, SignupForm)
- Add appropriate validation rules based on field types
- Email fields should have email validation
- Password fields should have min length of 8
- Phone fields should use "tel" type
- For long text, use "textarea" type
- Make fields required by default unless context suggests otherwise
- Add helpful placeholder text
- Use appropriate field types (not just "text" for everything)`;
