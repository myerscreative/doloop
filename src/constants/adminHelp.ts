import { AdminHelpContent } from '../components/AdminHelpModal';

export const ADMIN_HELP_CONTENT: Record<string, AdminHelpContent> = {
  dashboard: {
    title: 'Admin Dashboard',
    description: 'Your central hub for managing the DoLoop app. View key metrics and quickly access all admin features.',
    keyActions: [
      'View total users, loops, and templates at a glance',
      'Monitor affiliate clicks and conversions',
      'Navigate to specific management screens',
      'Track revenue and user growth',
    ],
    tips: [
      'Check the dashboard daily to spot trends',
      'Use the quick nav cards to jump to specific areas',
      'Watch for spike in new users to understand what\'s working',
    ],
  },
  templates: {
    title: 'Manage Templates',
    description: 'Create and organize loop templates that users can add to their daily routines. Templates help users get started quickly with proven systems.',
    keyActions: [
      'Search templates by name, description, or book title',
      'Filter templates by groups (Productivity, Health, etc.)',
      'Create new templates with tasks and affiliate links',
      'Assign templates to groups for organization',
      'Edit or delete existing templates',
    ],
    tips: [
      'Use groups to organize templates by theme or category',
      'Add clear, actionable tasks that users can complete daily',
      'Set affiliate links to track conversions when users click "Learn More"',
      'Make templates featured to highlight the best ones',
      'Use descriptive titles and descriptions for better searchability',
    ],
  },
  creators: {
    title: 'Manage Creators',
    description: 'Manage the coaches, authors, and creators behind your loop templates. Each template must be associated with a creator.',
    keyActions: [
      'Add new creators with name, bio, and photo',
      'Edit creator information and social links',
      'Delete creators (removes their templates too)',
      'Add website, Instagram, and X/Twitter links',
    ],
    tips: [
      'Include a professional photo for each creator',
      'Write compelling bios that explain their expertise',
      'Add social links to help users connect with creators',
      'Create a creator profile before making templates for them',
    ],
  },
  users: {
    title: 'Manage Users',
    description: 'View all app users and manage admin privileges. Monitor user activity and engagement.',
    keyActions: [
      'View all registered users and join dates',
      'See user stats: loops, tasks, and templates used',
      'Grant or revoke admin access to users',
      'Monitor last activity to see engagement',
    ],
    tips: [
      'Only grant admin access to trusted team members',
      'Check last activity to identify inactive users',
      'Monitor template usage to see which are most popular',
      'Use user counts to track app growth over time',
    ],
  },
  affiliates: {
    title: 'Affiliate Tracking',
    description: 'Monitor affiliate performance for templates with tracking links. See which books and courses generate the most interest and revenue.',
    keyActions: [
      'View affiliate clicks for each template',
      'Track conversion rates and revenue',
      'Sort by clicks, conversions, or revenue',
      'Identify top-performing templates',
    ],
    tips: [
      'Sort by conversion rate to find templates that convert best',
      'Check click counts to see which templates get the most interest',
      'Track revenue to measure actual earnings from affiliates',
      'Use this data to create more templates in high-performing categories',
    ],
  },
};
