from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import random
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# NTRU parameters (increased block length)
N = 11       # can handle 64-byte plaintext
p = 257       # prime ≥ 256 for full-byte messages
q = 65537     # larger prime modulus

class Message(BaseModel):
    h: list[int] = None
    f: list[int] = None
    m: list[int]

# Polynomial utilities

def poly_trim(a):
    a = a[:]
    while a and a[-1] == 0:
        a.pop()
    return a

# add, sub, mul, ext-gcd, inv as before, but using N

def poly_add(a, b, mod):
    n = max(len(a), len(b))
    res = [0]*n
    for i in range(n):
        ai = a[i] if i < len(a) else 0
        bi = b[i] if i < len(b) else 0
        res[i] = (ai + bi) % mod
    return poly_trim(res)

def poly_sub(a, b, mod):
    n = max(len(a), len(b))
    res = [0]*n
    for i in range(n):
        ai = a[i] if i < len(a) else 0
        bi = b[i] if i < len(b) else 0
        res[i] = (ai - bi) % mod
    return poly_trim(res)

def poly_mul_poly(a, b, mod):
    res = [0]*(len(a)+len(b)-1)
    for i, ai in enumerate(a):
        for j, bj in enumerate(b):
            res[i+j] = (res[i+j] + ai*bj) % mod
    return poly_trim(res)

def poly_divmod(a, b, mod):
    a = poly_trim(a)
    b = poly_trim(b)
    if not b:
        raise ZeroDivisionError("poly_divmod: division by zero")
    deg_b = len(b)-1
    inv_lead = pow(b[-1], -1, mod)
    r = a[:]
    q_poly = [0]*max(len(r)-len(b)+1, 0)
    while len(r)-1 >= deg_b:
        coef = (r[-1] * inv_lead) % mod
        d = len(r) - len(b)
        q_poly[d] = coef
        for i in range(len(b)):
            r[i+d] = (r[i+d] - coef*b[i]) % mod
        r = poly_trim(r)
    return poly_trim(q_poly), r

def poly_ext_gcd(a, b, mod):
    r0, r1 = poly_trim(a), poly_trim(b)
    s0, s1 = [1], [0]
    t0, t1 = [0], [1]
    while r1:
        q, r2 = poly_divmod(r0, r1, mod)
        s2 = poly_sub(s0, poly_mul_poly(q, s1, mod), mod)
        t2 = poly_sub(t0, poly_mul_poly(q, t1, mod), mod)
        r0, r1 = r1, r2
        s0, s1 = s1, s2
        t0, t1 = t1, t2
    return r0, s0, t0

def poly_inv(f, mod):
    # x^N - 1
    b = [(-1) % mod] + [0]*(N-1) + [1]
    g, s, _ = poly_ext_gcd(f, b, mod)
    if not (len(g)==1 and g[0] % mod == 1):
        raise Exception("Polynomial not invertible")
    inv = [c % mod for c in s]
    if len(inv) > N:
        for i in range(len(inv)-1, N-1, -1):
            inv[i-N] = (inv[i-N] + inv[i]) % mod
        inv = inv[:N]
    inv += [0]*(N-len(inv))
    return inv

def poly_mul(a, b, mod):
    res = [0]*N
    for i in range(len(a)):
        for j in range(len(b)):
            res[(i+j)%N] = (res[(i+j)%N] + a[i]*b[j]) % mod
    return res

def poly_scalar_mul(c, a, mod):
    return [(c*x)%mod for x in a]

def random_poly(trits=True, mod=q):
    if trits:
        return [random.choice([-1,0,1]) for _ in range(N)]
    return [random.randrange(mod) for _ in range(N)]

@app.get("/generate_keys")
def generate_keys():
    while True:
        f = random_poly()
        try:
            fp = poly_inv(f, p)
            fq = poly_inv(f, q)
            break
        except Exception:
            continue
    g = random_poly()
    h = poly_mul(poly_scalar_mul(p, fq, q), g, q)
    return {"h":h, "f":f}

@app.post("/encrypt")
def encrypt(msg: Message):
    if msg.h is None:
        raise HTTPException(400, "Missing public key")
    m = msg.m[:]
    r = random_poly()
    e = poly_add(poly_mul(r, msg.h, q), m, q)
    return {"e": e}

@app.post("/decrypt")
def decrypt(msg: Message):
    if msg.f is None or msg.h is None:
        raise HTTPException(400, "Missing keys")
    a = poly_mul(msg.f, msg.m, q)
    a_cent = [(x if x<=q//2 else x-q) for x in a]
    fp = poly_inv(msg.f, p)
    m_rec = poly_mul(fp, a_cent, p)
    return {"m": m_rec}