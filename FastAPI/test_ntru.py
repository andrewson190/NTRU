# test_ntru_numeric.py
import requests, random

BASE = "http://localhost:8000"
p, N = 3, 11

def main():
    # 1) Generate keys
    keys = requests.get(f"{BASE}/generate_keys").json()
    h, f = keys["h"], keys["f"]

    # 2) Build a random message vector in Z_p^N
    m = [random.randrange(p) for _ in range(N)]

    # 3) Encrypt
    e = requests.post(f"{BASE}/encrypt", json={"h":h, "m":m}).json()["e"]

    # 4) Decrypt
    m_rec = requests.post(f"{BASE}/decrypt", json={"f":f, "h":h, "m":e}).json()["m"]

    # 5) Assert exact match
    assert m_rec == m, f"❌ Mismatch: sent {m}, got {m_rec}"
    print("✅ Numeric round‑trip OK:", m)

if __name__ == "__main__":
    main()
