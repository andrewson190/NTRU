import React from 'react';

export default function KeyGenerator({ onKeys }) {
  const generate = async () => {
    const res = await fetch('http://localhost:8000/generate-keys');
    const data = await res.json();
    onKeys(data.public_key, data.private_key);
    console.log(data.public_key)
  };
  console.log()
  return <button onClick={generate}>Generate NTRU Key Pair</button>;
}
