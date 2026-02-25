import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string().default('Equipo WITHMIA'),
    category: z.enum([
      'IA Conversacional',
      'WhatsApp Business',
      'Atención al Cliente',
      'Automatización',
      'Marketing Digital',
      'PyMEs',
      'Producto',
      'Casos de Éxito',
    ]),
    tags: z.array(z.string()).default([]),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    draft: z.boolean().default(false),
    readingTime: z.number().optional(), // minutes
  }),
});

export const collections = { blog };
