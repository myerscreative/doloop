import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface GenerateLoopRequest {
  prompt: string;
}

interface GeneratedLoop {
  name: string;
  description: string;
  color: string;
  resetRule: 'manual' | 'daily' | 'weekly';
  tasks: Array<{
    description: string;
    notes?: string;
  }>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      throw new Error("OpenAI API key not configured");
    }

    // Parse request body
    const { prompt }: GenerateLoopRequest = await req.json();

    if (!prompt || prompt.trim().length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Prompt is required",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Call OpenAI API to generate loop structure
    const systemPrompt = `You are an AI assistant that helps users create productive loops (task lists) for their daily routines, goals, and projects.

Given a user's description, generate a structured loop with:
1. A clear, concise name (max 50 characters)
2. A brief description of the loop's purpose
3. An appropriate color (hex code): use #10b981 for general/productivity, #f59e0b for creative/energy, #8b5cf6 for wellness/self-care
4. A reset rule:
   - "manual" for project-based or one-time goals
   - "daily" for daily routines and habits
   - "weekly" for weekly goals and planning
5. A list of 3-10 actionable tasks with descriptions

Be specific, actionable, and practical. Focus on tasks that drive real progress.

Respond ONLY with valid JSON in this exact format:
{
  "name": "Loop Name",
  "description": "Brief description of the loop's purpose",
  "color": "#10b981",
  "resetRule": "daily",
  "tasks": [
    {
      "description": "Task description",
      "notes": "Optional helpful notes or context"
    }
  ]
}`;

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      console.error("OpenAI API error:", errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || "Unknown error"}`);
    }

    const openaiData = await openaiResponse.json();
    const generatedContent = openaiData.choices[0]?.message?.content;

    if (!generatedContent) {
      throw new Error("No content generated from OpenAI");
    }

    // Parse the generated JSON
    let generatedLoop: GeneratedLoop;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = generatedContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/) ||
                       [null, generatedContent];
      const jsonString = jsonMatch[1].trim();
      generatedLoop = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("Failed to parse OpenAI response:", generatedContent);
      throw new Error("Failed to parse AI response. Please try again.");
    }

    // Validate the generated structure
    if (!generatedLoop.name || !generatedLoop.resetRule || !Array.isArray(generatedLoop.tasks)) {
      throw new Error("Invalid loop structure generated");
    }

    // Ensure tasks have valid descriptions
    if (generatedLoop.tasks.length === 0) {
      throw new Error("No tasks generated");
    }

    return new Response(
      JSON.stringify({
        success: true,
        loop: generatedLoop,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error in generate_ai_loop function:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "An unexpected error occurred",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
