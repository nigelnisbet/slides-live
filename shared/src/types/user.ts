// User and subscription types for freemium model

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: string;
  subscription: SubscriptionTier;
  subscriptionStatus?: SubscriptionStatus;
  stripeCustomerId?: string;
  presentationCount: number; // Track for free tier limit
}

export type SubscriptionTier = 'free' | 'pro' | 'school';

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'unpaid';

export interface SubscriptionLimits {
  maxParticipants: number;
  maxPresentations: number;
  dataRetentionDays: number;
  canExportData: boolean;
  prioritySupport: boolean;
}

// Default limits by tier
export const SUBSCRIPTION_LIMITS: Record<SubscriptionTier, SubscriptionLimits> = {
  free: {
    maxParticipants: 30,
    maxPresentations: 3,
    dataRetentionDays: 7,
    canExportData: false,
    prioritySupport: false,
  },
  pro: {
    maxParticipants: Infinity,
    maxPresentations: Infinity,
    dataRetentionDays: 365,
    canExportData: true,
    prioritySupport: true,
  },
  school: {
    maxParticipants: Infinity,
    maxPresentations: Infinity,
    dataRetentionDays: 730, // 2 years
    canExportData: true,
    prioritySupport: true,
  },
};
