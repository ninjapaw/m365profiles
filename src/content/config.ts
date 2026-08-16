// Astro content-collection definitions.
// `explainers` holds optional plain-English "what this means for you" paragraphs
// keyed to a result node id. Content is authored as MDX so each file can
// embed links / callouts inline. When an explainer is missing the assessment
// gracefully falls back to the inline bullets that ship with the node itself.
import { defineCollection, z } from "astro:content";

const explainers = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    resultId: z.string(),
    profile: z.string().optional(),
    summary: z.string().optional(),
    authored: z.string().optional(),
    aiAssisted: z.boolean().default(false),
  }),
});

export const collections = { explainers };
