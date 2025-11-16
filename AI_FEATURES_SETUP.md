# AI Loop Creator Setup Guide

This guide explains how to set up and use the AI-powered loop creation feature in Doloop.

## Overview

The AI Loop Creator allows users to describe what they want to accomplish, and AI will automatically generate a complete loop with tasks tailored to their needs.

**Features:**
- ✨ Natural language input for loop creation
- 🤖 GPT-4o-mini powered suggestions
- 📋 Automatic task generation with descriptions and notes
- 🎯 Smart categorization (manual, daily, or weekly loops)
- 🎨 Appropriate color selection based on loop type

## Architecture

The AI feature consists of three main components:

1. **Supabase Edge Function** (`supabase/functions/generate_ai_loop/index.ts`)
   - Securely handles OpenAI API calls
   - Keeps API keys server-side
   - Processes and validates AI responses

2. **AI Creation Screen** (`src/screens/AILoopCreationScreen.tsx`)
   - User-friendly interface for describing loop needs
   - Preview of generated loops
   - Regeneration capability

3. **HomeScreen Integration** (`src/screens/HomeScreen.tsx`)
   - Prominent "AI Loop Creator" card in the Discover Loops section
   - Easy access to AI features

## Setup Instructions

### 1. Get an OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (you won't be able to see it again!)

### 2. Configure Supabase Edge Function

#### Option A: Using Supabase CLI (Recommended)

1. Install Supabase CLI if you haven't already:
   ```bash
   npm install -g supabase
   ```

2. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```

3. Set the OpenAI API key as a secret:
   ```bash
   supabase secrets set OPENAI_API_KEY=your-openai-api-key-here
   ```

4. Deploy the edge function:
   ```bash
   supabase functions deploy generate_ai_loop
   ```

#### Option B: Using Supabase Dashboard

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Navigate to Edge Functions → Secrets
4. Add a new secret:
   - Name: `OPENAI_API_KEY`
   - Value: Your OpenAI API key
5. Deploy the function through the dashboard

### 3. Verify Setup

Test the edge function directly:

```bash
curl -i --location --request POST 'https://your-project-ref.supabase.co/functions/v1/generate_ai_loop' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"prompt":"morning routine for productivity"}'
```

You should receive a JSON response with a generated loop structure.

## Usage

### For Users

1. Open the Doloop app
2. On the Home screen, scroll to the "Discover Loops" section
3. Tap on the **✨ AI Loop Creator** card (green card)
4. Describe what you want to accomplish, for example:
   - "morning routine for productivity"
   - "weekly fitness plan with cardio and strength training"
   - "reading habit tracker for 30 minutes daily"
   - "project launch checklist for a new product"
5. Tap **✨ Generate Loop**
6. Review the generated loop and tasks
7. Tap **✓ Create Loop** to add it to your loops, or **🔄 Regenerate** to try again

### Example Prompts

**Daily Routines:**
- "energizing morning routine"
- "evening wind-down routine for better sleep"
- "focused work routine for deep work"

**Weekly Goals:**
- "weekly meal prep routine"
- "balanced weekly workout plan"
- "weekly business review checklist"

**Projects & Checklists:**
- "moving to a new apartment checklist"
- "wedding planning tasks"
- "launching a podcast checklist"

## Technical Details

### AI Prompt Engineering

The system uses a carefully crafted system prompt that:
- Emphasizes actionable, specific tasks
- Provides context about loop types and their purposes
- Ensures consistent JSON output format
- Balances task count (3-10 tasks per loop)

### Data Flow

```
User Input → AILoopCreationScreen
→ Supabase Edge Function → OpenAI API
→ JSON Response → Validation → User Preview
→ Create Loop & Tasks in Database
```

### Error Handling

The system handles several error cases:
- Invalid or empty prompts
- OpenAI API failures
- Malformed AI responses
- Network issues
- Authentication errors

## Cost Considerations

The AI feature uses **GPT-4o-mini**, which is cost-effective:
- ~$0.00015 per loop generation (typical)
- ~$0.15 per 1,000 loops generated

Monitor your OpenAI usage at: https://platform.openai.com/usage

## Security

✅ **Best Practices Implemented:**
- API keys stored server-side only (never exposed to client)
- Supabase Edge Functions for secure API calls
- User authentication required
- Rate limiting via OpenAI's built-in limits

## Troubleshooting

### "OpenAI API key not configured" Error

**Solution:** Ensure you've set the `OPENAI_API_KEY` secret in Supabase (see Setup step 2)

### "Failed to generate loop" Error

**Possible causes:**
1. OpenAI API key is invalid or expired → Regenerate API key
2. OpenAI account has insufficient credits → Add credits to your OpenAI account
3. Network issues → Try again after a moment

### Generated Loop Looks Wrong

**Solution:** Try regenerating with a more specific prompt. Include details about:
- Time frame (daily, weekly, one-time)
- Specific goals or outcomes
- Level of detail you want

## Future Enhancements

Potential improvements for future versions:
- [ ] Task customization before creation
- [ ] AI suggestions for existing loops
- [ ] Learning from user preferences
- [ ] Multiple AI model support (Claude, Gemini, etc.)
- [ ] Voice input for prompts
- [ ] AI-powered task notes and tips

## Support

For issues or questions:
1. Check this documentation
2. Review the edge function logs in Supabase Dashboard
3. Check OpenAI API status: https://status.openai.com/
4. Open an issue in the project repository

---

**Version:** 1.0.0
**Last Updated:** January 2025
