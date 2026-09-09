import React, { useState } from 'react';
import { Stethoscope, Calendar, Send, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function App() {
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Hello! I am your Health Assistant. What symptoms are you experiencing today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessageToApi = async (userText) => {
    setLoading(true);
    try {
      // Relative URL use karein taake local aur Vercel dono pe chale
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:5000/api/chat' 
        : '/api/chat';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText }),
      });
      const data = await response.json();
      setMessages((prev) => [...prev, { sender: 'bot', text: data.reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: '⚠️ Unable to connect to backend server. Please check if Express is running.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input;
    setMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setInput('');

    await sendMessageToApi(userText);
  };

  const handleDeptClick = async (dept) => {
    const bookingMsg = `Book appointment for ${dept}`;
    setMessages((prev) => [...prev, { sender: 'user', text: bookingMsg }]);
    await sendMessageToApi(bookingMsg);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
      {/* Navbar */}
      <header style={{ background: '#0f172a', color: '#fff', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Stethoscope color="#22c55e" size={28} />
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>CarePoint Health Hub</h1>
        </div>
        <div>
          <button style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
            <AlertTriangle size={16} /> Emergency: 1122
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, maxWidth: '1100px', width: '100%', margin: '24px auto', padding: '0 16px', display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px' }}>
        
        {/* Chatbot Interface */}
        <section style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', height: '620px', overflow: 'hidden' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', background: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck color="#2563eb" size={20} />
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#334155', margin: 0 }}>AI Pre-Diagnosis Assistant</h2>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  fontSize: '0.92rem',
                  lineHeight: '1.4',
                  background: msg.sender === 'user' ? '#2563eb' : (msg.text?.includes('⚠️') ? '#fef2f2' : '#f1f5f9'),
                  color: msg.sender === 'user' ? '#fff' : (msg.text?.includes('⚠️') ? '#991b1b' : '#0f172a'),
                  border: msg.text?.includes('⚠️') ? '1px solid #fecaca' : 'none'
                }}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', background: '#f1f5f9', color: '#64748b', padding: '8px 14px', borderRadius: '10px', fontSize: '0.85rem' }}>
                Evaluating triage...
              </div>
            )}
          </div>

          <form onSubmit={handleSend} style={{ display: 'flex', padding: '12px', borderTop: '1px solid #e2e8f0', gap: '8px' }}>
            <input
              type="text"
              placeholder="Type your symptoms here (e.g. fever for 3 days)..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }}
            />
            <button type="submit" disabled={loading} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '0 18px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: loading ? 0.7 : 1 }}>
              <Send size={18} />
            </button>
          </form>
        </section>

        {/* Action Panel */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={20} color="#2563eb" /> Quick Scheduling
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
              Direct access to departments if you already have a general physician recommendation.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {['General Physician', 'Cardiology', 'ENT', 'Pediatrics', 'Orthopedics'].map((dept) => (
                <button
                  key={dept}
                  onClick={() => handleDeptClick(dept)}
                  style={{ textAlign: 'left', padding: '10px 14px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 500, color: '#334155' }}
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>

          <div style={{ background: '#ecfdf5', borderRadius: '12px', padding: '16px', border: '1px solid #a7f3d0' }}>
            <h4 style={{ color: '#065f46', fontSize: '0.95rem', fontWeight: 600, marginBottom: '6px' }}>Verified Telehealth Protocol</h4>
            <p style={{ color: '#047857', fontSize: '0.8rem', lineHeight: '1.4' }}>
              All queries undergo automated triage filtering to minimize clinic wait times. SMS/Email summaries are issued directly upon booking confirmation.
            </p>
          </div>
        </section>

      </main>
    </div>
  );
}