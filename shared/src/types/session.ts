import { ActivityConfig } from './activity';

export interface Session {
  id: string;
  code: string;
  presentationId: string;
  presenterId: string;
  presenterConnectionId: string;
  currentSlide: SlidePosition;
  status: SessionStatus;
  activities: ActivityConfig[];
  participants: Map<string, Participant>;
  createdAt: Date;
  expiresAt: Date;
}

export interface SlidePosition {
  indexh: number;
  indexv: number;
  timestamp: number;
}

export type SessionStatus = 'waiting' | 'active' | 'ended';

export interface Participant {
  id: string;
  sessionId: string;
  name?: string;
  joinedAt: Date;
  isActive: boolean;
  responses: Map<string, ActivityResponse>;
}

export interface ActivityResponse {
  activityId: string;
  answer: any;
  submittedAt: Date;
  isCorrect?: boolean;
  points?: number;
}

// Serializable versions for transmission
export interface SessionData {
  id: string;
  code: string;
  presentationId: string;
  currentSlide: SlidePosition;
  status: SessionStatus;
  participantCount: number;
  createdAt: string;
}

export interface ParticipantData {
  id: string;
  name?: string;
  joinedAt: string;
  isActive: boolean;
}
