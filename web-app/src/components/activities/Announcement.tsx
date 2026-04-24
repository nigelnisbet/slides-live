import React from 'react';
import { FloatingCircles } from '../FloatingCircles';

// SlidesLive brand colors
const primaryBlue = '#3b82f6';
const primaryBlueDark = '#2563eb';

interface AnnouncementActivity {
  activityId?: string;
  type: 'announcement';
  message: string;
}

interface AnnouncementProps {
  activity: AnnouncementActivity;
}

export const Announcement: React.FC<AnnouncementProps> = ({ activity }) => {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        position: 'relative',
        background: `linear-gradient(135deg, ${primaryBlue} 0%, ${primaryBlueDark} 100%)`,
      }}
    >
      <FloatingCircles />
      <div className="text-center max-w-4xl px-6" style={{ position: 'relative', zIndex: 1 }}>
        <h1
          className="text-5xl md:text-6xl font-bold text-white leading-tight"
          style={{
            textShadow: '0 2px 20px rgba(0, 0, 0, 0.3)',
          }}
        >
          {activity.message}
        </h1>
      </div>
    </div>
  );
};
