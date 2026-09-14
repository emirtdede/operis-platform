import { serve } from "inngest/next";
import { inngest } from "@/src/lib/inngest/client";
import { inngestFunctions } from "@/src/lib/inngest/functions";

// Prevent Next.js from caching API route responses
export const dynamic = "force-dynamic";

// Extend serverless execution timeout to the maximum 60s allowed on Vercel Hobby tier
export const maxDuration = 60;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: inngestFunctions,
});
