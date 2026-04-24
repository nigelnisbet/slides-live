import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSocket } from '../contexts/FirebaseContext';
import { getApp } from 'firebase/app';
import { getDatabase, ref, get } from 'firebase/database';

// Use the existing Firebase app from firebase.ts
const app = getApp();

// SlidesLive brand colors
const primaryBlue = '#3b82f6';
const primaryBlueDark = '#2563eb';

export const PersonalSessionJoin: React.FC = () => {
  const { name } = useParams<{ name: string }>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { joinSession } = useSocket();

  useEffect(() => {
    const autoJoin = async () => {
      if (!name) {
        setError('Invalid session URL');
        setLoading(false);
        return;
      }

      try {
        console.log('Looking up personal session:', name);

        // Look up personal session mapping in Firebase
        const database = getDatabase(app);
        const personalSessionRef = ref(database, `personalSessions/${name}`);
        const snapshot = await get(personalSessionRef);

        if (!snapshot.exists()) {
          setError(`Personal session "${name}" not found`);
          setLoading(false);
          return;
        }

        const sessionMapping = snapshot.val();

        // Check if session is active
        if (sessionMapping.active === false) {
          setError('This session is currently inactive');
          setLoading(false);
          return;
        }

        const { sessionCode } = sessionMapping;

        if (!sessionCode) {
          setError('Invalid session configuration');
          setLoading(false);
          return;
        }

        console.log('Joining session:', sessionCode);

        // Join the session
        await joinSession(sessionCode.toUpperCase(), undefined);

        // Update last used timestamp
        // Note: Could add this to Firebase, but keeping MVP simple for now

        navigate('/waiting');

      } catch (err) {
        console.error('Error joining personal session:', err);
        setError((err as Error).message || 'Failed to join session');
        setLoading(false);
      }
    };

    autoJoin();
  }, [name, joinSession, navigate]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          backgroundColor: primaryBlue,
          background: `linear-gradient(135deg, ${primaryBlue} 0%, ${primaryBlueDark} 100%)`,
        }}
      >
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Joining Session...
          </h2>
          <p className="text-gray-600">
            Connecting to {name}'s presentation
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          backgroundColor: primaryBlue,
          background: `linear-gradient(135deg, ${primaryBlue} 0%, ${primaryBlueDark} 100%)`,
        }}
      >
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Unable to Join Session
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/join')}
            className="bg-blue-600 text-white py-2 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Enter Code Manually
          </button>
        </div>
      </div>
    );
  }

  return null;
};
