import { generateKeyPairSync, webcrypto } from "node:crypto";
import { describe, expect, it } from "vitest";
import { base64UrlEncode, signServiceAccountJwt, verifyFirebaseIdToken, type Jwk } from "../../worker/jwt";

const PROJECT = "demo-ecoisland";
const RS256 = { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" };

async function keypair() {
  const pair = (await webcrypto.subtle.generateKey(
    { ...RS256, modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]) },
    true,
    ["sign", "verify"],
  )) as CryptoKeyPair;
  const jwk = (await webcrypto.subtle.exportKey("jwk", pair.publicKey)) as Jwk;
  return { pair, jwk: { ...jwk, kid: "k1" } };
}

async function sign(privateKey: CryptoKey, header: object, payload: object) {
  const h = base64UrlEncode(JSON.stringify(header));
  const p = base64UrlEncode(JSON.stringify(payload));
  const sig = await webcrypto.subtle.sign(RS256, privateKey, new TextEncoder().encode(`${h}.${p}`));
  return `${h}.${p}.${base64UrlEncode(sig)}`;
}

const now = 1_800_000_000;
const goodPayload = {
  iss: `https://securetoken.google.com/${PROJECT}`,
  aud: PROJECT,
  sub: "student-1",
  iat: now - 10,
  auth_time: now - 100,
  exp: now + 3600,
  email: "s@example.com",
  name: "Sam",
};

describe("verifyFirebaseIdToken", () => {
  it("accepts a valid token and rejects tampering", async () => {
    const { pair, jwk } = await keypair();
    const token = await sign(pair.privateKey, { alg: "RS256", kid: "k1" }, goodPayload);
    const opts = { projectId: PROJECT, getKeys: async () => [jwk], nowSeconds: now };
    await expect(verifyFirebaseIdToken(token, opts)).resolves.toMatchObject({ uid: "student-1", email: "s@example.com" });

    const [h, , s] = token.split(".");
    const forged = `${h}.${base64UrlEncode(JSON.stringify({ ...goodPayload, sub: "teacher-1" }))}.${s}`;
    await expect(verifyFirebaseIdToken(forged, opts)).rejects.toThrow("Bad signature");
  });

  it("rejects wrong audience, issuer, expiry and unknown keys", async () => {
    const { pair, jwk } = await keypair();
    const opts = { projectId: PROJECT, getKeys: async () => [jwk], nowSeconds: now };
    const mk = (p: object, kid = "k1") => sign(pair.privateKey, { alg: "RS256", kid }, { ...goodPayload, ...p });
    await expect(verifyFirebaseIdToken(await mk({ aud: "other" }), opts)).rejects.toThrow("Wrong audience");
    await expect(verifyFirebaseIdToken(await mk({ iss: "https://evil" }), opts)).rejects.toThrow("Wrong issuer");
    await expect(verifyFirebaseIdToken(await mk({ exp: now - 1 }), opts)).rejects.toThrow("expired");
    await expect(verifyFirebaseIdToken(await mk({}, "k2"), opts)).rejects.toThrow("Unknown signing key");
    await expect(verifyFirebaseIdToken("a.b", opts)).rejects.toThrow("Malformed");
  });

  it("only accepts unsigned emulator tokens when explicitly allowed", async () => {
    const h = base64UrlEncode(JSON.stringify({ alg: "none", typ: "JWT" }));
    const p = base64UrlEncode(JSON.stringify(goodPayload));
    const token = `${h}.${p}.`;
    const opts = { projectId: PROJECT, getKeys: async () => [] as Jwk[], nowSeconds: now };
    await expect(verifyFirebaseIdToken(token, opts)).rejects.toThrow("Unsupported token");
    await expect(verifyFirebaseIdToken(token, { ...opts, allowUnsigned: true })).resolves.toMatchObject({ uid: "student-1" });
  });
});

describe("signServiceAccountJwt", () => {
  it("produces an RS256 assertion verifiable with the public key", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    const jwt = await signServiceAccountJwt({ client_email: "sa@x.iam.gserviceaccount.com", private_key: pem.replace(/\n/g, "\\n") }, "scope-a", now);
    const [h, p, s] = jwt.split(".");
    const pub = await webcrypto.subtle.importKey("spki", publicKey.export({ type: "spki", format: "der" }), RS256, false, ["verify"]);
    const sig = Uint8Array.from(Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64"));
    expect(await webcrypto.subtle.verify(RS256, pub, sig, new TextEncoder().encode(`${h}.${p}`))).toBe(true);
    const payload = JSON.parse(Buffer.from(p.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString());
    expect(payload).toMatchObject({ iss: "sa@x.iam.gserviceaccount.com", scope: "scope-a", aud: "https://oauth2.googleapis.com/token", exp: now + 3600 });
  });
});
