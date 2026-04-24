import { useEffect, useState, useRef } from 'react';
import { getDatabase, ref, onValue } from 'firebase/database';

export const useFeedbackUnreadCount = (sessionCode: string | null) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const lastViewedTimeRef = useRef<number>(Date.now());

  // Update last viewed time when user opens the feedback panel
  const markAsViewed = () => {
    lastViewedTimeRef.current = Date.now();
    setUnreadCount(0);
  };

  useEffect(() => {
    if (!sessionCode) {
      setUnreadCount(0);
      return;
    }

    const db = getDatabase();
    const feedbackRef = ref(db, `sessions/${sessionCode}/feedback`);

    const unsubscribe = onValue(feedbackRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        let newMessageCount = 0;

        Object.entries(data).forEach(([_, participantData]: [string, any]) => {
          if (participantData.messages) {
            Object.values(participantData.messages).forEach((messageData: any) => {
              if (messageData.submittedAt > lastViewedTimeRef.current) {
                newMessageCount++;
              }
            });
          }
        });

        setUnreadCount(newMessageCount);
      } else {
        setUnreadCount(0);
      }
    }, (error) => {
      console.error('Error listening to feedback:', error);
      setUnreadCount(0);
    });

    return () => {
      unsubscribe();
    };
  }, [sessionCode]);

  return { unreadCount, markAsViewed };
};
