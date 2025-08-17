import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';

const API_URL = import.meta.env.VITE_API_URL;

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
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
