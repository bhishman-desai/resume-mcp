const { z } = require('zod');

// Base resume schema - you can customize this based on your resume structure
const resumeSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  summary: z.string().optional(),
  experience: z
    .array(
      z.object({
        company: z.string().optional(),
        position: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        description: z.string().optional(),
        achievements: z.array(z.string()).optional(),
      })
    )
    .optional(),
  education: z
    .array(
      z.object({
        institution: z.string().optional(),
        degree: z.string().optional(),
        field: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        gpa: z.string().optional(),
      })
    )
    .optional(),
  skills: z.array(z.string()).optional(),
  certifications: z
    .array(
      z.object({
        name: z.string().optional(),
        issuer: z.string().optional(),
        date: z.string().optional(),
        expiryDate: z.string().optional(),
      })
    )
    .optional(),
  projects: z
    .array(
      z.object({
        name: z.string().optional(),
        description: z.string().optional(),
        technologies: z.array(z.string()).optional(),
        url: z.string().url().optional(),
        github: z.string().url().optional(),
      })
    )
    .optional(),
  languages: z
    .array(
      z.object({
        language: z.string().optional(),
        proficiency: z.string().optional(),
      })
    )
    .optional(),
  // Allow additional fields
}).passthrough();

// Partial resume schema for PATCH operations
const partialResumeSchema = resumeSchema.partial();

// Request schemas
const updateResumeRequestSchema = z.object({
  resume: resumeSchema,
  apiKey: z.string().min(1, 'API key is required'),
});

const patchResumeRequestSchema = z.object({
  partialResume: partialResumeSchema,
  apiKey: z.string().min(1, 'API key is required'),
});

const restoreVersionRequestSchema = z.object({
  filename: z
    .string()
    .min(1, 'Filename is required')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Filename contains invalid characters'),
  apiKey: z.string().min(1, 'API key is required'),
});

module.exports = {
  resumeSchema,
  partialResumeSchema,
  updateResumeRequestSchema,
  patchResumeRequestSchema,
  restoreVersionRequestSchema,
};

