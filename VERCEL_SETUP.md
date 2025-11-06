# Vercel Deployment Setup Guide

This guide will help you deploy the Doloop Expo web app to Vercel.

## Prerequisites

1. A Vercel account ([sign up here](https://vercel.com/signup))
2. A Supabase project ([create one here](https://supabase.com))
3. Your Supabase credentials (URL and Anon Key)

## Finding Your Supabase Credentials

1. Go to your Supabase project dashboard
2. Click on **Settings** (gear icon in sidebar)
3. Click on **API** in the settings menu
4. You'll find:
   - **Project URL** - This is your `EXPO_PUBLIC_SUPABASE_URL`
   - **anon/public key** - This is your `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Setting Up Environment Variables in Vercel

### Option 1: Via Vercel Dashboard

1. Go to your Vercel project dashboard
2. Click on **Settings**
3. Click on **Environment Variables** in the sidebar
4. Add the following variables:

   | Name | Value | Environment |
   |------|-------|-------------|
   | `EXPO_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Production, Preview, Development |
   | `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key | Production, Preview, Development |

5. Click **Save**
6. **Redeploy** your application for the changes to take effect

### Option 2: Via Vercel CLI

```bash
# Install Vercel CLI if you haven't
npm i -g vercel

# Add environment variables
vercel env add EXPO_PUBLIC_SUPABASE_URL
# Paste your Supabase URL when prompted

vercel env add EXPO_PUBLIC_SUPABASE_ANON_KEY
# Paste your Supabase anon key when prompted
```

## Redeploying After Adding Variables

After adding environment variables, you need to trigger a new deployment:

### Option 1: Via Dashboard
1. Go to **Deployments** tab
2. Click the **⋯** menu on the latest deployment
3. Click **Redeploy**

### Option 2: Via Git
```bash
# Make a trivial change and push
git commit --allow-empty -m "chore: trigger redeploy with env vars"
git push
```

### Option 3: Via CLI
```bash
vercel --prod
```

## Verifying the Deployment

After redeployment:

1. Open your Vercel deployment URL
2. Check the browser console (F12)
3. You should **NOT** see the error: "Invalid Supabase configuration detected"
4. If you still see errors, verify:
   - Environment variables are set correctly (no typos)
   - You selected all environments (Production, Preview, Development)
   - You redeployed after adding the variables

## Local Development

For local development with environment variables:

1. Copy the example file:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and add your credentials:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

3. Run the development server:
   ```bash
   npm start
   ```

## Troubleshooting

### "Invalid supabaseUrl" Error
- **Cause**: Environment variables not set or not loaded
- **Solution**: Follow the steps above to add environment variables and redeploy

### Environment Variables Not Working
- Make sure variable names are **exact**: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Expo requires the `EXPO_PUBLIC_` prefix for variables accessible in the client
- Redeploy after adding variables (they're not automatically applied to existing deployments)

### Still Using Placeholder Values
- Check that you're not using the placeholder values from `app.json`
- The app now prioritizes environment variables over `app.json` values for web builds
- Clear your browser cache and hard reload (Ctrl+Shift+R / Cmd+Shift+R)

## Project Configuration

The project is configured with:

- **`vercel.json`**: Configures Vercel to build with Expo web export
- **`src/lib/supabase.ts`**: Handles environment variable loading and validation
- **`.env.example`**: Template for local development environment variables

For more information, see the [Vercel Environment Variables documentation](https://vercel.com/docs/projects/environment-variables).
