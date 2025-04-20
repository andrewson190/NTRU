import React, { useState } from 'react';

const N = 11;

function App() {
  const [h, setH] = useState(null);
  const [f, setF] = useState(null);
  const [plaintext, setPlaintext] = useState('');
  const [cipher, setCipher] = useState('');
  const [cipherInput, setCipherInput] = useState('');
  const [decrypted, setDecrypted] = useState('');

  // Generate key pair
  const generateKeys = async () => {
    try {
      const resp = await fetch('http://localhost:8000/generate_keys');
      const data = await resp.json();
      setH(data.h);
      setF(data.f);
    } catch (err) {
      console.error(err);
      alert('Failed to generate keys');
    }
  };

  // Encrypt plaintext of any length by chunking into N-sized blocks
  const handleEncrypt = async () => {
    if (!h) return alert('Generate keys first');
    const bytes = plaintext.split('').map(c => c.charCodeAt(0));
    const allCiphers = [];
    for (let i = 0; i < bytes.length; i += N) {
      const block = bytes.slice(i, i + N);
      while (block.length < N) block.push(0);
      const resp = await fetch('http://localhost:8000/encrypt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ h, m: block })
      });
      const { e } = await resp.json();
      allCiphers.push(...e);
    }
    const cipherStr = allCiphers.join(',');
    setCipher(cipherStr);
    setCipherInput(cipherStr);
  };

  // Decrypt arbitrary-length ciphertext by chunking back into N-sized blocks
  const handleDecrypt = async () => {
    if (!f || !h) return alert('Generate keys first');
    if (!cipherInput) return alert('Enter ciphertext');
    const nums = cipherInput.split(',').map(x => parseInt(x, 10));
    const allBytes = [];
    for (let i = 0; i < nums.length; i += N) {
      const chunk = nums.slice(i, i + N);
      const resp = await fetch('http://localhost:8000/decrypt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ f, h, m: chunk })
      });
      const { m } = await resp.json();
      allBytes.push(...m);
    }
    // Trim to original length
    const recovered = allBytes
      .slice(0, plaintext.length)
      .map(x => String.fromCharCode(x))
      .join('');
    setDecrypted(recovered);
  };

  return (
    <div className="container">
      <h1 className="title">NTRU Encryption Demo</h1>
      <button className="btn primary" onClick={generateKeys}>Generate Keys</button>

      {h && f && (
        <div className="keys-section">
          <h3>Public Key (h):</h3>
          <div className="output"><code>{h.join(', ')}</code></div>
          <h3>Private Key (f):</h3>
          <div className="output"><code>{f.join(', ')}</code></div>
        </div>
      )}

      <div className="section">
        <h2 className="section-title">Encrypt</h2>
        <input
          className="input"
          value={plaintext}
          onChange={e => setPlaintext(e.target.value)}
          placeholder="Type message"
        />
        <button className="btn secondary" onClick={handleEncrypt}>Encrypt</button>
        <div className="output">Cipher: <code>{cipher}</code></div>
      </div>

      <div className="section">
        <h2 className="section-title">Decrypt</h2>
        <p>Paste ciphertext (comma-separated):</p>
        <input
          className="input"
          value={cipherInput}
          onChange={e => setCipherInput(e.target.value)}
          placeholder="e.g. 123,456,..."
        />
        <button className="btn secondary" onClick={handleDecrypt}>Decrypt</button>
        <div className="output">Plain: <code>{decrypted}</code></div>
      </div>
    </div>
  );
}

export default App;