import React, { useState } from 'react';

const N = 11;
const API = process.env.REACT_APP_API_URL;


// —— Demo Component (your existing encryption UI) ——
function Demo() {
  const [h, setH] = useState(null);
  const [f, setF] = useState(null);
  const [plaintext, setPlaintext] = useState('');
  const [cipher, setCipher] = useState('');
  const [cipherInput, setCipherInput] = useState('');
  const [decrypted, setDecrypted] = useState('');

  // Generate key pair
  const generateKeys = async () => {
    try {
      const resp = await fetch(`${API}/generate_keys`);
      const data = await resp.json();
      setH(data.h);
      setF(data.f);
    } catch (err) {
      console.error(err);
      alert('Failed to generate keys');
    }
  };

  // Encrypt plaintext by chunking into N-sized blocks
  const handleEncrypt = async () => {
    if (!h) return alert('Generate keys first');
    const bytes = plaintext.split('').map(c => c.charCodeAt(0));
    const allCiphers = [];
    for (let i = 0; i < bytes.length; i += N) {
      const block = bytes.slice(i, i + N);
      while (block.length < N) block.push(0);
      const resp = await fetch(`${API}/encrypt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ h, m: block }),
      });
      const { e } = await resp.json();
      allCiphers.push(...e);
    }
    const cipherStr = allCiphers.join(',');
    setCipher(cipherStr);
    setCipherInput(cipherStr);
  };

  // Decrypt ciphertext by chunking back into N-sized blocks
  const handleDecrypt = async () => {
    if (!f || !h) return alert('Generate keys first');
    if (!cipherInput) return alert('Enter ciphertext');
    const nums = cipherInput.split(',').map(x => parseInt(x, 10));
    const allBytes = [];
    for (let i = 0; i < nums.length; i += N) {
      const chunk = nums.slice(i, i + N);
      const resp = await fetch(`${API}/decrypt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ f, h, m: chunk }),
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
    <div className="section">
      <button className="btn primary" onClick={generateKeys}>
        Generate Keys
      </button>

      {h && f && (
        <div className="keys-section my-4">
          <h3>Public Key (h):</h3>
          <div className="output"><code>{h.join(', ')}</code></div>
          <h3>Private Key (f):</h3>
          <div className="output"><code>{f.join(', ')}</code></div>
        </div>
      )}

      <div className="section my-4">
        <h2 className="section-title">Encrypt</h2>
        <input
          className="input"
          style={{ maxWidth: '100%', boxSizing: 'border-box' }}
          value={plaintext}
          onChange={e => setPlaintext(e.target.value)}
          placeholder="Type message"
        />
        <button className="btn secondary ml-2" onClick={handleEncrypt}>
          Encrypt
        </button>
        <div className="output mt-2">Cipher: <code>{cipher}</code></div>
      </div>

      <div className="section my-4">
        <h2 className="section-title">Decrypt</h2>
        <p>Paste ciphertext (comma-separated):</p>
        <input
          className="input"
          style={{ maxWidth: '100%', boxSizing: 'border-box' }}
          value={cipherInput}
          onChange={e => setCipherInput(e.target.value)}
          placeholder="e.g. 123,456,..."
        />
        <button className="btn secondary ml-2" onClick={handleDecrypt}>
          Decrypt
        </button>
        <div className="output mt-2">Plain: <code>{decrypted}</code></div>
      </div>
    </div>
  );
}

// —— Help Component (your existing explanation UI) ——
function Help() {
  return (
    <div className="section">
      <h2 className="section-title">What is NTRU?</h2>
      <p>
        NTRU is a modern encryption system that works fast, even on small devices, 
        and is designed to stay safe against future super-powerful computers.
      </p>

      <h2 className="section-title">Mathematical Foundations (in Plain English)</h2>

      {/* Polynomial Rings */}
      <h3 className="section-subtitle">Polynomial Rings</h3>
      <div className="math-block bg-gray-100 p-4 my-4 rounded font-mono text-sm">
        R = ℤ[x] / (x<sup>N</sup> − 1)
      </div>
      <p>
        Imagine a polynomial as a row of numbers: [a<sub>0</sub>, a<sub>1</sub>, …, a<sub>N−1</sub>].  
        When we add or multiply these rows, any position past the end wraps around to the front.
      </p>

      {/* Convolution Rings */}
      <h3 className="section-subtitle">Convolution (Cyclic) Rings</h3>
      <div className="math-block bg-gray-100 p-4 my-4 rounded font-mono text-sm">
        a(x) = ∑ a<sub>i</sub> x<sup>i</sup>  
        b(x) = ∑ b<sub>j</sub> x<sup>j</sup>  
        c(x) = a(x) ⋆ b(x)
      </div>
      <p>
        To multiply two polynomials, we multiply each number in one by each in the other 
        and add the results into the wrapping positions—like sliding one list over another 
        and summing overlaps.
      </p>

      {/* Modular Reduction */}
      <h3 className="section-subtitle">Modular Reduction</h3>
      <div className="math-block bg-gray-100 p-4 my-4 rounded font-mono text-sm">
        • Keep numbers small by rolling them over a small modulus <strong>p</strong> (for messages)  
        • Use a larger modulus <strong>q</strong> (for encrypted data)
      </div>
      <p>
        After each operation, we shrink big numbers by taking the remainder.  
        The “p” setting keeps messages simple, and the “q” setting protects the encrypted data.
      </p>

      {/* Key Inversion */}
      <h3 className="section-subtitle">Key Inversion</h3>
      <div className="math-block bg-gray-100 p-4 my-4 rounded font-mono text-sm">
        Find f<sup>−1</sup> so that f ⋆ f<sup>−1</sup> = 1, in both small and large settings
      </div>
      <p>
        We pick a special polynomial <code>f</code> so we can reverse it later.  
        Reversing means finding another polynomial that, when multiplied with <code>f</code>, 
        gives a row [1, 0, 0…]. This uses an extended version of the Euclidean algorithm.
      </p>

      {/* SVP */}
      <h3 className="section-subtitle">Security Basis: Shortest Vector Problem (SVP)</h3>
      <div className="math-block bg-gray-100 p-4 my-4 rounded font-mono text-sm">
        SVP: Find the shortest non-zero point in a regular grid of points
      </div>
      <p>
        Picture a gigantic grid of points—each point is a combination of numbers.  
        The shortest vector is the smallest jump from the center to another grid point.  
        NTRU creates a hidden grid using our keys, and cracking the encryption 
        means finding that tiny jump in a huge, tricky grid. Even powerful 
        computers struggle to find it.
      </p>

      <h2 className="section-title">Why It Matters</h2>
      <p>
        NTRU works quickly on small devices and stays secure against future quantum computers—making it 
        a top choice for next-generation encryption.
      </p>

      <h2 className="section-title">Learn More</h2>
      <ul className="list-disc list-inside">
        <li>
          <a href="https://en.wikipedia.org/wiki/NTRU" target="_blank" rel="noopener noreferrer">
            NTRU on Wikipedia
          </a>
        </li>
        <li>
          <a href="https://www.geeksforgeeks.org/modular-arithmetic/" target="_blank" rel="noopener noreferrer">
            Modular Arithmetic
          </a>
        </li>
        <li>
          <a href="https://math.libretexts.org/Bookshelves/Combinatorics_and_Discrete_Mathematics/Applied_Discrete_Structures_(Doerr_and_Levasseur)/16%3A_An_Introduction_to_Rings_and_Fields/16.03%3A_Polynomial_Rings" target="_blank" rel="noopener noreferrer">
            Polynomial Rings
          </a>
        </li>
        <li>
          <a href="https://www.youtube.com/watch?v=QDdOoYdb748&t=377s&ab_channel=ChalkTalk" target="_blank" rel="noopener noreferrer">
            Lattice Cryptography (Video)
          </a>
        </li>
      </ul>
    </div>
  );
}

// —— Quiz Component (interactive 10‐question quiz) ——
function Quiz() {
  const questions = [
    {
      question: "In NTRU's polynomial ring ℤ[X]/(X^N - 1), which statement is true?",
      type: "mcq",
      options: [
        "X^N is treated as 0 in this ring",
        "X^N is treated as 1 in this ring",
        "Polynomials must have degree exactly N",
        "All coefficients must be either 0 or 1"
      ],
      correctAnswer: "X^N is treated as 1 in this ring",
      explanation:
        "In NTRU, X^N ≡ 1, so any term X^N wraps around to 1, keeping all products within degree N−1."
    },
    {
      question: "What does the 'convolution product' a ⋆ b mean?",
      type: "mcq",
      options: [
        "Adding polynomials coefficient-wise",
        "Polynomial multiply + wrap-around mod (X^N - 1)",
        "Multiplying each coefficient pair without carrying",
        "Dot product of coefficient vectors"
      ],
      correctAnswer: "Polynomial multiply + wrap-around mod (X^N - 1)",
      explanation:
        "Convolution is polynomial multiplication followed by reduction modulo X^N−1, i.e. wrap-around."
    },
    {
      question: "True or False: Plaintext uses modulus p, ciphertext uses modulus q.",
      type: "mcq",
      options: ["True", "False"],
      correctAnswer: "True",
      explanation:
        "NTRU uses a small modulus p for messages and a larger q for encrypted data to separate those domains."
    },
    {
      question: "What is F_q in NTRU?",
      type: "text",
      correctAnswer: "the inverse of f mod q",
      explanation:
        "F_q is the polynomial inverse of the private key f in the ring mod q, so f⋆F_q ≡ 1 (mod q)."
    },
    {
      question: "Why must f be invertible mod p and mod q?",
      type: "text",
      correctAnswer: "so decryption works by reversing f in both rings",
      explanation:
        "We need f^{-1} in both settings: one to encrypt/decrypt in mod q, and one in mod p to recover the message."
    },
    {
      question: "SVP stands for…?",
      type: "text",
      correctAnswer: "Shortest Vector Problem",
      explanation:
        "It’s the challenge of finding the shortest non-zero vector in a high-dimensional lattice."
    },
    {
      question: "Which best describes a lattice in crypto?",
      type: "mcq",
      options: [
        "A prime number generator",
        "A grid of points from integer combinations of basis vectors",
        "A polynomial ring construction",
        "A type of hash function"
      ],
      correctAnswer:
        "A grid of points from integer combinations of basis vectors",
      explanation:
        "A lattice is exactly that grid; lattice cryptography relies on problems like SVP on that grid."
    },
    {
      question: "Compute 10 mod 7.",
      type: "text",
      correctAnswer: "3",
      explanation:
        "10 ÷ 7 leaves remainder 3, so 10 ≡ 3 (mod 7)."
    },
    {
      question: "Calculate (3x^2 + 2x + 1) mod 5 in R with N=4 (reduce each coefficient mod 5).",
      type: "text",
      correctAnswer: "3x^2 + 2x + 1",
      explanation:
        "All coefficients (3,2,1) are already < 5, so mod 5 does not change them."
    },
    {
      question: "One real-world advantage of NTRU over RSA?",
      type: "text",
      correctAnswer:
        "faster operations on small devices",
      explanation:
        "NTRU’s small polynomial arithmetic makes it much faster especially on constrained hardware."
    }
  ];

  const [userAnswers, setUserAnswers] = useState(questions.map(() => ""));
  const [submitted, setSubmitted] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [score, setScore] = useState(0);

  const handleChange = (val, idx) =>
    setUserAnswers(prev =>
      prev.map((ans, i) => (i === idx ? val : ans))
    );

  const handleSubmit = e => {
    e.preventDefault();
    if (userAnswers.some(ans => ans.trim() === "")) {
      return alert("Please answer all questions first.");
    }
    let count = 0;
    questions.forEach((q, i) => {
      const isCorrect =
        q.type === "text"
          ? userAnswers[i].trim().toLowerCase() === q.correctAnswer.toLowerCase()
          : userAnswers[i] === q.correctAnswer;
      if (isCorrect) count++;
    });
    setScore(count);
    setSubmitted(true);
  };

  const handleRetake = () => {
    setUserAnswers(questions.map(() => ""));
    setSubmitted(false);
    setShowReview(false);
    setScore(0);
  };

  return (
    <div style={{ padding: "1rem", maxWidth: "600px", margin: "0 auto" }}>
      <h2 style={{ marginBottom: "1rem" }}>Quiz</h2>

      {!submitted ? (
        // ——— The Quiz Form ———
        <form onSubmit={handleSubmit}>
          {questions.map((q, i) => (
            <div key={i} style={{ marginBottom: "1.5rem" }}>
              <p style={{ marginBottom: "0.5rem" }}>
                <strong>Q{i + 1}.</strong> {q.question}
              </p>
              {q.type === "mcq" ? (
                q.options.map((opt, oi) => (
                  <label
                    key={oi}
                    style={{ display: "block", marginBottom: "0.5rem" }}
                  >
                    <input
                      type="radio"
                      name={`q${i}`}
                      value={opt}
                      checked={userAnswers[i] === opt}
                      onChange={e => handleChange(e.target.value, i)}
                      style={{ marginRight: "0.5rem" }}
                    />
                    {opt}
                  </label>
                ))
              ) : (
                <input
                  type="text"
                  value={userAnswers[i]}
                  onChange={e => handleChange(e.target.value, i)}
                  placeholder="Your answer"
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "0.5rem",
                    marginTop: "0.25rem",
                    boxSizing: "border-box"
                  }}
                />
              )}
            </div>
          ))}

          <button
            type="submit"
            style={{ padding: "0.5rem 1rem", cursor: "pointer" }}
          >
            Submit Answers
          </button>
        </form>
      ) : !showReview ? (
        // ——— After Submission: Score + Action Buttons ———
        <div>
          <h3 style={{ marginBottom: "1rem" }}>
            Your Score: {score} / {questions.length}
          </h3>
          <button
            onClick={() => setShowReview(true)}
            style={{
              padding: "0.5rem 1rem",
              marginRight: "1rem",
              cursor: "pointer"
            }}
          >
            View Answers and Explanations
          </button>
          <button
            onClick={handleRetake}
            style={{ padding: "0.5rem 1rem", cursor: "pointer" }}
          >
            Try Again
          </button>
        </div>
      ) : (
        // ——— Detailed Feedback ———
        <div>
          <h3 style={{ marginBottom: "1rem" }}>
            Your Score: {score} / {questions.length}
          </h3>
          {questions.map((q, i) => {
            const correct =
              q.type === "text"
                ? userAnswers[i].trim().toLowerCase() === q.correctAnswer.toLowerCase()
                : userAnswers[i] === q.correctAnswer;
            return (
              <div key={i} style={{ marginBottom: "1.5rem" }}>
                <p>
                  <strong>Q{i + 1}.</strong> {q.question}
                </p>
                <p>
                  <em>Your answer:</em> {userAnswers[i]} –{" "}
                  <span style={{ color: correct ? "green" : "red" }}>
                    {correct ? "Correct" : "Incorrect"}
                  </span>
                </p>
                <p>
                  <em>Correct answer:</em> {q.correctAnswer}
                </p>
                <p>
                  <em>Explanation:</em> {q.explanation}
                </p>
              </div>
            );
          })}
          <button
            onClick={handleRetake}
            style={{ padding: "0.5rem 1rem", cursor: "pointer" }}
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}

function History() {
  return (
    <div className="section" style={{ padding: '1rem', maxWidth: '800px', margin: '0 auto' }}>
      <h2 className="section-title">History & Context</h2>
      <p>
        <strong>Origins (1990s)</strong>: In 1996–1998, Jeffrey Hoffstein, Jill Pipher,
        and Joseph H. Silverman pioneered NTRU at Brown University (Hoffstein et al., 1998).
        They sought a ring‐based alternative to RSA and ECC, leveraging cyclic polynomial
        rings for fast encryption and decryption on limited hardware.
      </p>
      <p>
        <strong>Academic Validation (2000s)</strong>: Early research established security
        assumptions based on the Shortest Vector Problem (SVP) in lattices. Work by Nguyen and Stern (2001)
        and by Cohn and Kumar (2009) examined lattice reduction attacks, shaping parameter
        choices for practical deployment.
      </p>
      <p>
        <strong>NIST Post‐Quantum Standardization (2017–2022)</strong>: In 2017, NTRU
        was submitted to NIST’s competition for post‐quantum cryptography. In 2022, the
        "NTRUEncrypt" and related schemes (e.g., "NTRU LPRime") advanced as finalists
        in NIST’s fourth round, alongside CRYSTAL‐Kyber and others (<a href="https://csrc.nist.gov/Projects/post-quantum-cryptography" target="_blank" rel="noopener noreferrer">NIST PQC</a>).
      </p>
      <p>
        <strong>Modern Implementations</strong>: Today, NTRU powers secure messaging
        modules (e.g., OpenSSL’s post‐quantum prototypes), protects IoT and embedded
        devices, and is integrated into VPNs and encrypted tunnels. Performance measurements
        show both small‐footprint code and hardware accelerators achieving sub‐millisecond
        key operations on microcontrollers.
      </p>

      <h3 className="section-subtitle">Key Milestones</h3>
      <ul className="list-disc list-inside">
        <li>1998: NTRU patent filed (US Patent 5,953,652).</li>
        <li>2001: Nguyen & Stern analyze worst‐case lattice attacks.</li>
        <li>2017: Submission to NIST PQC competition.</li>
        <li>2022: Advancement of NTRUEncrypt and NTRU LPRime to NIST Round 4.</li>
        <li>2024: Deployment in OpenSSL 3.x post‐quantum prototypes.</li>
      </ul>

      <h3 className="section-subtitle">References</h3>
      <ol className="list-decimal list-inside">
        <li>Hoffstein, J., Pipher, J., & Silverman, J. H. (1998). "NTRU: A Ring‐Based Public Key Cryptosystem." <em>Lecture Notes in Computer Science</em>, 1423, 267–288.</li>
        <li>Nguyen, P. Q., & Stern, J. (2001). "The Two Faces of Lattices in Cryptology." <em>Journal of Cryptology</em>, 24(1), 5–15.</li>
        <li>NIST Post‐Quantum Cryptography Project. Available at <a href="https://csrc.nist.gov/Projects/post-quantum-cryptography" target="_blank" rel="noopener noreferrer">csrc.nist.gov</a>.</li>
        <li>OpenSSL Project. (2024). Post‐Quantum Cryptography Support in OpenSSL 3.x. <a href="https://www.openssl.org/docs/man3.0/man7/EVP.html" target="_blank" rel="noopener noreferrer">openssl.org</a>.</li>
      </ol>
    </div>
  );
}

// —— Main App with tabs ——
function App() {
  const [activeTab, setActiveTab] = useState('demo');

  const containerStyle = { maxWidth: '800px', margin: '0 auto', padding: '16px' };
  const titleStyle = { fontSize: '1.5rem', marginBottom: '16px' };
  const tabsStyle = { display: 'flex', gap: '8px', marginBottom: '16px' };
  const buttonStyle = { padding: '8px 16px', cursor: 'pointer' };

  return (
    <div className="overflow-y-scroll" style={containerStyle}>
      <h1 style={titleStyle}>NTRU Encryption</h1>
      <div style={tabsStyle}>
        {['demo', 'help', 'history', 'quiz'].map(tab => (
          <button
            key={tab}
            style={buttonStyle}
            className={activeTab === tab ? 'btn primary' : 'btn'}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>
      {activeTab === 'demo' && <Demo />}
      {activeTab === 'help' && <Help />}
      {activeTab === 'history' && <History />}
      {activeTab === 'quiz' && <Quiz />}
    </div>
  );
}

export default App;
