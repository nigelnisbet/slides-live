import React from 'react';

const primaryBlue = '#3b82f6';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ marginBottom: '32px' }}>
    <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111', marginBottom: '10px' }}>{title}</h2>
    <div style={{ color: '#444', lineHeight: 1.7, fontSize: '15px' }}>{children}</div>
  </div>
);

export const PrivacyPolicy: React.FC = () => {
  React.useEffect(() => {
    document.title = 'Privacy Policy — slidesLive';
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '40px 16px 80px' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto', background: '#fff', borderRadius: '16px', padding: '40px 48px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>

        {/* Header */}
        <div style={{ marginBottom: '40px', borderBottom: '1px solid #e5e7eb', paddingBottom: '24px' }}>
          <a href="/about" style={{ textDecoration: 'none', display: 'inline-block', marginBottom: '24px' }}>
            <span style={{ fontSize: '20px', fontWeight: 600, color: '#111' }}>
              slides<span style={{ fontWeight: 700, color: primaryBlue }}>Live</span>
            </span>
          </a>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#111', margin: '0 0 8px' }}>Privacy Policy</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>Last updated: June 2026</p>
        </div>

        <Section title="Overview">
          <p>slidesLive is a tool that lets presenters add live polls, quizzes, and open questions to Google Slides presentations. We've built it with a simple principle: collect only what's needed to make the product work, keep it only as long as necessary, and never sell or share it.</p>
        </Section>

        <Section title="The Chrome Extension">
          <p>The slidesLive Chrome extension runs only on Google Slides pages (<code>docs.google.com/presentation/*</code>). It:</p>
          <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
            <li style={{ marginBottom: '6px' }}>Reads the current slide index and filmstrip structure to detect slide navigation and to help you attach activities to slides. <strong>No slide content is transmitted to our servers.</strong></li>
            <li style={{ marginBottom: '6px' }}>Stores activity configurations (poll questions, quiz options, etc.) you create in Firebase under your presentation's ID. This data belongs to you and can be deleted at any time.</li>
            <li style={{ marginBottom: '6px' }}>Creates temporary live sessions in Firebase when you click "Go Live." Session data (participant responses, participant counts) is <strong>automatically deleted when you end the session.</strong></li>
          </ul>
          <p style={{ marginTop: '12px' }}>The extension does not track your browsing, access other websites, or transmit any data outside of Google Slides and our Firebase backend.</p>
        </Section>

        <Section title="Attendee Data">
          <p>Attendees who join a session via QR code or session code:</p>
          <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
            <li style={{ marginBottom: '6px' }}>Are assigned an anonymous, randomly generated ID. No name, email, or account is required.</li>
            <li style={{ marginBottom: '6px' }}>Submit responses (poll votes, quiz answers, open text) that are stored temporarily in Firebase for the duration of the session.</li>
            <li style={{ marginBottom: '6px' }}>Have all their response data <strong>permanently deleted when the presenter ends the session.</strong></li>
          </ul>
          <p style={{ marginTop: '12px' }}>We retain only aggregate, anonymised snapshots of usage (e.g., total sessions run, activity types used) for product improvement. These snapshots contain no individual responses or identifying information.</p>
        </Section>

        <Section title="Email Addresses">
          <p>If you voluntarily submit your email address via our "Stay in the loop" form (on the landing page or the session-ended screen), we store it in Firebase solely to send product updates and early access notifications. We will never sell, rent, or share your email with third parties. You can request deletion at any time by emailing <a href="mailto:slidesliveadmin@gmail.com" style={{ color: primaryBlue }}>slidesliveadmin@gmail.com</a>.</p>
        </Section>

        <Section title="Firebase & Third Parties">
          <p>slidesLive uses <strong>Google Firebase</strong> (Realtime Database) to store session data, activity configurations, and email signups. Firebase is operated by Google and subject to <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noopener noreferrer" style={{ color: primaryBlue }}>Google's privacy policy</a>.</p>
          <p style={{ marginTop: '10px' }}>QR codes are generated using <strong>api.qrserver.com</strong>, a public QR code service. The only data sent to this service is the join URL for your session (e.g., <code>slides-live.com/join/ABC123</code>). No personal data is included.</p>
          <p style={{ marginTop: '10px' }}>We do not use advertising networks, social media trackers, or any other third-party analytics.</p>
        </Section>

        <Section title="Data Retention">
          <ul style={{ paddingLeft: '20px' }}>
            <li style={{ marginBottom: '6px' }}><strong>Session data (responses, participants):</strong> deleted immediately when the presenter ends the session.</li>
            <li style={{ marginBottom: '6px' }}><strong>Activity configurations:</strong> retained until the presenter deletes them or uninstalls the extension.</li>
            <li style={{ marginBottom: '6px' }}><strong>Email addresses:</strong> retained until you request deletion.</li>
            <li style={{ marginBottom: '6px' }}><strong>Aggregate usage snapshots:</strong> retained indefinitely in anonymised form.</li>
          </ul>
        </Section>

        <Section title="Children's Privacy">
          <p>slidesLive is designed for use in educational settings, including classrooms with students under 13. We do not knowingly collect any personal information from any user, child or adult. Attendees interact entirely anonymously — no name, age, or account is ever required to join a session.</p>
        </Section>

        <Section title="Your Rights">
          <p>You can request deletion of any data associated with your presentation ID or email address by contacting us at <a href="mailto:slidesliveadmin@gmail.com" style={{ color: primaryBlue }}>slidesliveadmin@gmail.com</a>. We will respond within 30 days.</p>
        </Section>

        <Section title="Changes to This Policy">
          <p>If we make material changes to this policy, we'll update the "Last updated" date above. Continued use of slidesLive after changes constitutes acceptance of the updated policy.</p>
        </Section>

        <Section title="Contact">
          <p>Questions or requests? Email <a href="mailto:slidesliveadmin@gmail.com" style={{ color: primaryBlue }}>slidesliveadmin@gmail.com</a>.</p>
        </Section>

      </div>
    </div>
  );
};
