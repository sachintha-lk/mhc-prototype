import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';

const API_URL = import.meta.env.VITE_API_URL;

function AppointmentForm() {
  const [userId, setUserId] = useState('');
  const [slotId, setSlotId] = useState('');
  const [details, setDetails] = useState('');
  const [result, setResult] = useState('');
  const submit = async () => {
    const res = await fetch('/appointment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, slotId, details })
    });
    const data = await res.json();
    setResult('Appointment ID: ' + data.appointmentId);
  };
  return (
    <div>
      <h3>Book Appointment</h3>
      <input value={userId} onChange={e => setUserId(e.target.value)} placeholder="User ID" />
      <input value={slotId} onChange={e => setSlotId(e.target.value)} placeholder="Slot ID" />
      <input value={details} onChange={e => setDetails(e.target.value)} placeholder="Details" />
      <button onClick={submit}>Book</button>
      <div>{result}</div>
    </div>
  );
}

function FeedbackForm() {
  const [userId, setUserId] = useState('');
  const [rating, setRating] = useState('');
  const [comments, setComments] = useState('');
  const [result, setResult] = useState('');
  const submit = async () => {
    const res = await fetch('/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, rating, comments })
    });
    const data = await res.json();
    setResult('Feedback ID: ' + data.feedbackId);
  };
  return (
    <div>
      <h3>Submit Feedback</h3>
      <input value={userId} onChange={e => setUserId(e.target.value)} placeholder="User ID" />
      <input value={rating} onChange={e => setRating(e.target.value)} placeholder="Rating" />
      <input value={comments} onChange={e => setComments(e.target.value)} placeholder="Comments" />
      <button onClick={submit}>Submit</button>
      <div>{result}</div>
    </div>
  );
}

function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);

  const send = async () => {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: input })
    });
    const data = await res.json();
    setMessages([...messages, { role: 'user', text: input }, { role: 'assistant', text: data.reply }]);
    setInput('');
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h2>MHC Prototype Chat</h2>
      <div>
        {messages.map((m, i) => <div key={i}><b>{m.role}:</b> {m.text}</div>)}
      </div>
      <input value={input} onChange={e => setInput(e.target.value)} placeholder="Say something" />
      <button onClick={send}>Send</button>
      <AppointmentForm />
      <FeedbackForm />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
