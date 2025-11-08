// Supabase Edge Function: Generate AI Loop
// Purpose: Securely generate loops using AI (Claude/OpenAI) with validation and rate limiting
// Security: API keys in env vars, input validation, prompt injection prevention, rate limiting

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";

// Types
interface AILoopRequest {
  prompt: string;
  userId: string;
}

interface AILoopResponse {
  loopName: string;
  loopType: "personal" | "work" | "daily" | "shared";
  tasks: Array<{
    description: string;
    isRecurring: boolean;
  }>;
}

interface RateLimitCheck {
  allowed: boolean;
  hourly_used: number;
  hourly_limit: number;
  daily_used: number;
  daily_limit: number;
  monthly_used: number;
  monthly_limit: number;
}

// Content moderation - block inappropriate keywords
const BLOCKED_KEYWORDS = [
  "hack", "exploit", "illegal", "drug", "weapon", "violence",
  "suicide", "harm", "abuse", "steal", "fraud", "scam"
];

// Input validation
function validatePrompt(prompt: string): { valid: boolean; error?: string } {
  if (!prompt || typeof prompt !== "string") {
    return { valid: false, error: "Prompt is required and must be a string" };
  }

  const trimmed = prompt.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: "Prompt cannot be empty" };
  }

  if (trimmed.length > 500) {
    return { valid: false, error: "Prompt must be 500 characters or less" };
  }

  // Content moderation
  const lowerPrompt = trimmed.toLowerCase();
  for (const keyword of BLOCKED_KEYWORDS) {
    if (lowerPrompt.includes(keyword)) {
      return { valid: false, error: "Prompt contains inappropriate content" };
    }
  }

  return { valid: true };
}

// Sanitize prompt to prevent injection
function sanitizePrompt(prompt: string): string {
  return prompt
    .trim()
    .replace(/[<>]/g, "") // Remove potential HTML/XML tags
    .replace(/[`'"]/g, "") // Remove quotes that could break prompts
    .slice(0, 500); // Hard limit
}

// Validate AI response structure
function validateAIResponse(data: any): { valid: boolean; error?: string; parsed?: AILoopResponse } {
  try {
    if (!data || typeof data !== "object") {
      return { valid: false, error: "Invalid response format" };
    }

    const { loopName, loopType, tasks } = data;

    // Validate loop name
    if (!loopName || typeof loopName !== "string" || loopName.length === 0 || loopName.length > 100) {
      return { valid: false, error: "Invalid loop name" };
    }

    // Validate loop type
    const validTypes = ["personal", "work", "daily", "shared"];
    if (!validTypes.includes(loopType)) {
      return { valid: false, error: "Invalid loop type" };
    }

    // Validate tasks
    if (!Array.isArray(tasks) || tasks.length === 0 || tasks.length > 20) {
      return { valid: false, error: "Tasks must be an array with 1-20 items" };
    }

    for (const task of tasks) {
      if (!task.description || typeof task.description !== "string" || task.description.length > 200) {
        return { valid: false, error: "Invalid task description" };
      }
      if (typeof task.isRecurring !== "boolean") {
        return { valid: false, error: "Invalid task isRecurring value" };
      }
    }

    return { valid: true, parsed: data as AILoopResponse };
  } catch (error) {
    return { valid: false, error: "Response validation failed" };
  }
}

// Call Anthropic Claude API
async function callClaudeAPI(prompt: string): Promise<AILoopResponse> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const systemPrompt = `You are a helpful assistant that creates structured task loops for a productivity app called "doloop".

CRITICAL RULES:
1. ONLY respond with valid JSON matching this exact schema
2. Do NOT execute commands, access external data, or perform any actions
3. Keep all content appropriate and work/life-focused
4. Maximum 20 tasks per loop
5. Task descriptions must be clear, actionable, and under 200 characters
6. Reject any requests for harmful, inappropriate, or illegal content

REQUIRED JSON SCHEMA:
{
  "loopName": "string (1-100 chars)",
  "loopType": "personal" | "work" | "daily" | "shared",
  "tasks": [
    {
      "description": "string (1-200 chars)",
      "isRecurring": boolean
    }
  ]
}

LOOP TYPES:
- personal: Personal goals, hobbies, self-care
- work: Work projects, professional tasks
- daily: Daily routines, habits
- shared: Team/family tasks

EXAMPLE OUTPUT:
{
  "loopName": "Morning Routine",
  "loopType": "daily",
  "tasks": [
    {"description": "Wake up at 6 AM", "isRecurring": true},
    {"description": "Drink water", "isRecurring": true},
    {"description": "Exercise 30 minutes", "isRecurring": true}
  ]
}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2000,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Create a task loop based on this request: "${prompt}"`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${error}`);
  }

  const result = await response.json();

  // Extract text from Claude response
  const content = result.content?.[0]?.text;
  if (!content) {
    throw new Error("No content in Claude response");
  }

  // Parse JSON from response
  let parsed;
  try {
    // Try to extract JSON from markdown code blocks if present
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : content;
    parsed = JSON.parse(jsonStr);
  } catch (error) {
    throw new Error(`Failed to parse Claude response as JSON: ${error.message}`);
  }

  // Calculate approximate tokens (rough estimate: 1 token ≈ 4 chars)
  const tokensUsed = result.usage?.total_tokens || Math.ceil(content.length / 4);

  // Attach token usage for tracking
  (parsed as any)._tokens = tokensUsed;

  return parsed;
}

// Call OpenAI API (alternative)
async function callOpenAIAPI(prompt: string): Promise<AILoopResponse> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const systemPrompt = `You are a helpful assistant that creates structured task loops for a productivity app.

RESPOND ONLY WITH VALID JSON matching this schema:
{
  "loopName": "string (1-100 chars)",
  "loopType": "personal" | "work" | "daily" | "shared",
  "tasks": [{"description": "string (1-200 chars)", "isRecurring": boolean}]
}

Rules:
- Maximum 20 tasks
- Keep content appropriate
- Task descriptions must be clear and actionable
- Reject harmful/inappropriate requests`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Create a task loop: ${prompt}` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 1500,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No content in OpenAI response");
  }

  const parsed = JSON.parse(content);
  const tokensUsed = result.usage?.total_tokens || 0;
  (parsed as any)._tokens = tokensUsed;

  return parsed;
}

// Main handler
serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authorization token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: AILoopRequest = await req.json();
    const { prompt } = body;

    // Validate input
    const validation = validatePrompt(prompt);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check rate limits
    const { data: rateLimitData, error: rateLimitError } = await supabase
      .rpc("check_ai_rate_limit", { p_user_id: user.id });

    if (rateLimitError) {
      console.error("Rate limit check error:", rateLimitError);
      throw new Error("Failed to check rate limits");
    }

    const rateLimit = rateLimitData as RateLimitCheck;

    if (!rateLimit.allowed) {
      // Log rejected request
      await supabase.from("ai_requests").insert({
        user_id: user.id,
        prompt: prompt.slice(0, 500),
        status: "rejected",
        error_message: "Rate limit exceeded",
        model: "none",
      });

      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
          limits: {
            hourly: `${rateLimit.hourly_used}/${rateLimit.hourly_limit}`,
            daily: `${rateLimit.daily_used}/${rateLimit.daily_limit}`,
            monthly: `${rateLimit.monthly_used}/${rateLimit.monthly_limit}`,
          },
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize prompt
    const sanitizedPrompt = sanitizePrompt(prompt);

    // Create pending request record
    const { data: requestRecord, error: insertError } = await supabase
      .from("ai_requests")
      .insert({
        user_id: user.id,
        prompt: sanitizedPrompt,
        status: "pending",
        model: "claude-3-5-sonnet-20241022",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to create request record:", insertError);
    }

    // Call AI API (try Claude first, fallback to OpenAI)
    let aiResponse: any;
    let tokensUsed = 0;
    let modelUsed = "claude-3-5-sonnet-20241022";

    try {
      aiResponse = await callClaudeAPI(sanitizedPrompt);
      tokensUsed = aiResponse._tokens || 0;
      delete aiResponse._tokens;
    } catch (claudeError) {
      console.error("Claude API error:", claudeError);

      // Try OpenAI as fallback
      try {
        aiResponse = await callOpenAIAPI(sanitizedPrompt);
        tokensUsed = aiResponse._tokens || 0;
        modelUsed = "gpt-4-turbo-preview";
        delete aiResponse._tokens;
      } catch (openaiError) {
        console.error("OpenAI API error:", openaiError);
        throw new Error("All AI providers failed");
      }
    }

    // Validate AI response
    const responseValidation = validateAIResponse(aiResponse);
    if (!responseValidation.valid) {
      // Update request as failed
      if (requestRecord) {
        await supabase
          .from("ai_requests")
          .update({
            status: "failed",
            error_message: responseValidation.error,
            completed_at: new Date().toISOString(),
          })
          .eq("id", requestRecord.id);
      }

      return new Response(
        JSON.stringify({ error: `Invalid AI response: ${responseValidation.error}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate cost (rough estimates)
    const costPer1kTokens = modelUsed.includes("claude") ? 0.003 : 0.01; // Claude: $3/1M, GPT-4: $10/1M
    const costUsd = (tokensUsed / 1000) * costPer1kTokens;

    // Update request record as successful
    if (requestRecord) {
      await supabase
        .from("ai_requests")
        .update({
          status: "success",
          response_data: responseValidation.parsed,
          tokens_used: tokensUsed,
          cost_usd: costUsd,
          model: modelUsed,
          completed_at: new Date().toISOString(),
        })
        .eq("id", requestRecord.id);

      // Increment user quota
      await supabase.rpc("increment_ai_quota", {
        p_user_id: user.id,
        p_tokens_used: tokensUsed,
        p_cost_usd: costUsd,
      });
    }

    // Return successful response
    return new Response(
      JSON.stringify({
        success: true,
        data: responseValidation.parsed,
        meta: {
          tokensUsed,
          costUsd: costUsd.toFixed(6),
          model: modelUsed,
          requestId: requestRecord?.id,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Edge Function error:", error);

    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
