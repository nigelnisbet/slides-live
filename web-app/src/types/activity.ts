import { SlidePosition } from './session';

export interface ActivityConfig {
  slidePosition: SlidePosition;
  activityType: ActivityType;
  activityId: string;
  config: ActivityDefinition;
}

// MVP Activity Types - simplified for launch
export type ActivityType = 'poll' | 'quiz' | 'text-response' | 'announcement';

export interface ActivityDefinition {
  type: ActivityType;
  activityId?: string;
}

// Poll Activity
export interface PollActivity extends ActivityDefinition {
  type: 'poll';
  question: string;
  options: string[];
  allowMultiple: boolean;
  showResults: 'live' | 'after-close' | 'never';
}

// Quiz Activity
export interface QuizActivity extends ActivityDefinition {
  type: 'quiz';
  question: string;
  options: string[];
  correctAnswer: number;
  timeLimit?: number;
  points: number;
}

// Text Response Activity
export interface TextResponseActivity extends ActivityDefinition {
  type: 'text-response';
  prompt: string;
  placeholder?: string;
  maxLength?: number;
}

// Announcement Activity
export interface AnnouncementActivity extends ActivityDefinition {
  type: 'announcement';
  message: string;
}

// Results aggregation
export interface PollResults {
  activityId: string;
  question: string;
  options: string[];
  responses: number[];
  totalResponses: number;
}

export interface QuizResults {
  activityId: string;
  question: string;
  correctAnswer: number;
  correctCount: number;
  incorrectCount: number;
  responses: number[]; // Count of responses for each option
  totalResponses: number;
  averageTime?: number;
  leaderboard?: LeaderboardEntry[];
}

export interface LeaderboardEntry {
  participantId: string;
  name?: string;
  points: number;
  correctAnswers: number;
  timeElapsed: number;
}

export interface TextResponseResults {
  activityId: string;
  prompt: string;
  responses: Array<{
    participantId: string;
    participantName?: string;
    text: string;
    submittedAt: number;
  }>;
  totalResponses: number;
}

export type ActivityResults = PollResults | QuizResults | TextResponseResults;

// Presentation configuration
export interface PresentationConfig {
  presentationId: string;
  title: string;
  description?: string;
  activities: ActivityConfig[];
  userId: string; // Owner
  createdAt: string;
  updatedAt: string;
}
