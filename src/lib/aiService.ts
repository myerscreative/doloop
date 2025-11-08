/**
 * AI Service for Loop Generation
 *
 * Provides secure client-side interface for AI-powered loop creation
 * with input validation, rate limiting checks, and error handling.
 */

import { z } from 'zod';
import { supabase } from './supabase';

// Zod Validation Schemas

export const aiLoopTaskSchema = z.object({
  description: z.string().min(1).max(200),
  isRecurring: z.boolean(),
});

export const aiLoopResponseSchema = z.object({
  loopName: z.string().min(1).max(100),
  loopType: z.enum(['personal', 'work', 'daily', 'shared']),
  tasks: z.array(aiLoopTaskSchema).min(1).max(20),
});

export const aiLoopRequestSchema = z.object({
  prompt: z.string().min(1).max(500),
});

export const aiRateLimitSchema = z.object({
  allowed: z.boolean(),
  hourly_used: z.number(),
  hourly_limit: z.number(),
  daily_used: z.number(),
  daily_limit: z.number(),
  monthly_used: z.number(),
  monthly_limit: z.number(),
});

// TypeScript Types (inferred from schemas)

export type AILoopTask = z.infer<typeof aiLoopTaskSchema>;
export type AILoopResponse = z.infer<typeof aiLoopResponseSchema>;
export type AILoopRequest = z.infer<typeof aiLoopRequestSchema>;
export type AIRateLimit = z.infer<typeof aiRateLimitSchema>;

export interface AIGenerationResult {
  success: boolean;
  data?: AILoopResponse;
  meta?: {
    tokensUsed: number;
    costUsd: string;
    model: string;
    requestId: string;
  };
  error?: string;
  limits?: {
    hourly: string;
    daily: string;
    monthly: string;
  };
}

export interface AIQuota {
  dailyRequestsUsed: number;
  monthlyRequestsUsed: number;
  totalCostUsd: number;
  dailyLimit: number;
  monthlyLimit: number;
  lastDailyReset: string;
  lastMonthlyReset: string;
}

// Content filtering (client-side pre-check)
const BLOCKED_KEYWORDS = [
  'hack', 'exploit', 'illegal', 'drug', 'weapon', 'violence',
  'suicide', 'harm', 'abuse', 'steal', 'fraud', 'scam'
];

/**
 * Validates and sanitizes user prompt before sending to AI
 */
export function validatePrompt(prompt: string): { valid: boolean; error?: string } {
  // Basic validation
  const validation = aiLoopRequestSchema.safeParse({ prompt });
  if (!validation.success) {
    return {
      valid: false,
      error: validation.error.errors[0]?.message || 'Invalid prompt format',
    };
  }

  // Content moderation
  const lowerPrompt = prompt.toLowerCase();
  for (const keyword of BLOCKED_KEYWORDS) {
    if (lowerPrompt.includes(keyword)) {
      return {
        valid: false,
        error: 'Prompt contains inappropriate content',
      };
    }
  }

  return { valid: true };
}

/**
 * Sanitize prompt to prevent injection attacks
 */
export function sanitizePrompt(prompt: string): string {
  return prompt
    .trim()
    .replace(/[<>]/g, '') // Remove HTML/XML tags
    .replace(/[`'"]/g, '') // Remove quotes
    .slice(0, 500); // Hard limit
}

/**
 * Check user's current rate limit status
 */
export async function checkRateLimit(userId: string): Promise<AIRateLimit | null> {
  try {
    const { data, error } = await supabase
      .rpc('check_ai_rate_limit', { p_user_id: userId });

    if (error) {
      console.error('Rate limit check error:', error);
      return null;
    }

    // Validate response
    const validation = aiRateLimitSchema.safeParse(data);
    if (!validation.success) {
      console.error('Invalid rate limit response:', validation.error);
      return null;
    }

    return validation.data;
  } catch (error) {
    console.error('Failed to check rate limit:', error);
    return null;
  }
}

/**
 * Get user's AI usage quota and history
 */
export async function getAIQuota(userId: string): Promise<AIQuota | null> {
  try {
    const { data, error } = await supabase
      .from('user_ai_quotas')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // If no quota exists yet, it will be created on first request
      if (error.code === 'PGRST116') {
        return {
          dailyRequestsUsed: 0,
          monthlyRequestsUsed: 0,
          totalCostUsd: 0,
          dailyLimit: 10,
          monthlyLimit: 100,
          lastDailyReset: new Date().toISOString(),
          lastMonthlyReset: new Date().toISOString(),
        };
      }
      console.error('Failed to fetch quota:', error);
      return null;
    }

    return {
      dailyRequestsUsed: data.daily_requests_used,
      monthlyRequestsUsed: data.monthly_requests_used,
      totalCostUsd: parseFloat(data.total_cost_usd),
      dailyLimit: data.daily_limit,
      monthlyLimit: data.monthly_limit,
      lastDailyReset: data.last_daily_reset,
      lastMonthlyReset: data.last_monthly_reset,
    };
  } catch (error) {
    console.error('Failed to get AI quota:', error);
    return null;
  }
}

/**
 * Get user's AI request history
 */
export async function getAIHistory(userId: string, limit: number = 10) {
  try {
    const { data, error } = await supabase
      .from('ai_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch AI history:', error);
      return [];
    }

    return data;
  } catch (error) {
    console.error('Failed to get AI history:', error);
    return [];
  }
}

/**
 * Generate a loop using AI
 *
 * @param prompt - Natural language description of desired loop
 * @returns AI generation result with loop data or error
 */
export async function generateAILoop(prompt: string): Promise<AIGenerationResult> {
  try {
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return {
        success: false,
        error: 'Not authenticated. Please sign in.',
      };
    }

    // Validate prompt
    const validation = validatePrompt(prompt);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    // Sanitize prompt
    const sanitizedPrompt = sanitizePrompt(prompt);

    // Get Supabase URL from environment
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('Supabase URL not configured');
    }

    // Call Edge Function
    const response = await fetch(
      `${supabaseUrl}/functions/v1/generate_ai_loop`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          prompt: sanitizedPrompt,
          userId: session.user.id,
        }),
      }
    );

    const result = await response.json();

    // Handle rate limiting
    if (response.status === 429) {
      return {
        success: false,
        error: result.error || 'Rate limit exceeded',
        limits: result.limits,
      };
    }

    // Handle other errors
    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Failed to generate loop',
      };
    }

    // Validate response data
    if (!result.success || !result.data) {
      return {
        success: false,
        error: 'Invalid response from AI service',
      };
    }

    const dataValidation = aiLoopResponseSchema.safeParse(result.data);
    if (!dataValidation.success) {
      return {
        success: false,
        error: 'AI generated invalid loop data',
      };
    }

    return {
      success: true,
      data: dataValidation.data,
      meta: result.meta,
    };

  } catch (error) {
    console.error('AI generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Create loop from AI-generated data
 *
 * @param aiData - Validated AI loop response
 * @param userId - Current user ID
 * @returns Created loop with tasks, or null on error
 */
export async function createLoopFromAI(
  aiData: AILoopResponse,
  userId: string
): Promise<{ loopId: string; loopName: string } | null> {
  try {
    // Color mapping for loop types
    const FOLDER_COLORS: Record<string, string> = {
      personal: '#FE356C',
      work: '#0CB6CC',
      daily: '#FEC041',
      shared: '#7952B4',
    };

    // Create the loop
    const { data: loop, error: loopError } = await supabase
      .from('loops')
      .insert({
        name: aiData.loopName,
        owner_id: userId,
        loop_type: aiData.loopType,
        color: FOLDER_COLORS[aiData.loopType],
        reset_rule: 'daily',
        next_reset_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        is_favorite: false,
      })
      .select()
      .single();

    if (loopError || !loop) {
      console.error('Failed to create loop:', loopError);
      return null;
    }

    // Create all tasks
    const tasksToInsert = aiData.tasks.map(task => ({
      loop_id: loop.id,
      description: task.description,
      is_recurring: task.isRecurring,
      is_one_time: !task.isRecurring,
      status: 'pending',
      assigned_user_id: userId,
    }));

    const { error: tasksError } = await supabase
      .from('tasks')
      .insert(tasksToInsert);

    if (tasksError) {
      console.error('Failed to create tasks:', tasksError);
      // Loop was created but tasks failed - still return the loop
      return {
        loopId: loop.id,
        loopName: loop.name,
      };
    }

    return {
      loopId: loop.id,
      loopName: loop.name,
    };

  } catch (error) {
    console.error('Failed to create loop from AI:', error);
    return null;
  }
}

/**
 * Complete AI loop generation workflow
 *
 * Generates loop using AI and creates it in the database
 *
 * @param prompt - Natural language description
 * @param userId - Current user ID
 * @returns Result with loop ID or error
 */
export async function generateAndCreateLoop(
  prompt: string,
  userId: string
): Promise<{
  success: boolean;
  loopId?: string;
  loopName?: string;
  error?: string;
  meta?: any;
}> {
  // Generate with AI
  const aiResult = await generateAILoop(prompt);

  if (!aiResult.success || !aiResult.data) {
    return {
      success: false,
      error: aiResult.error,
    };
  }

  // Create loop in database
  const loop = await createLoopFromAI(aiResult.data, userId);

  if (!loop) {
    return {
      success: false,
      error: 'Failed to create loop in database',
    };
  }

  return {
    success: true,
    loopId: loop.loopId,
    loopName: loop.loopName,
    meta: aiResult.meta,
  };
}
