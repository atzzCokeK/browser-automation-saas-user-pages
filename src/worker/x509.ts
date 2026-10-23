const SHA256_WITH_RSA = "1.2.840.113549.1.1.11";
const COMMON_NAME = "2.5.4.3";
const DUMMY_CN = "Dummy SAML Test IdP (testing only)";

export type DummyCertificate = {
  privateKey: CryptoKey;
  certificateDer: Uint8Array;
  certificatePem: string;
};

export async function createDummyIdpCertificate(): Promise<DummyCertificate> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  );
  const spki = new Uint8Array(await crypto.subtle.exportKey("spki", keyPair.publicKey));
  const serial = new Uint8Array(16);
  crypto.getRandomValues(serial);
  serial[0] &= 0x7f;
  if (serial[0] === 0) serial[0] = 1;

  const algorithm = algorithmIdentifier(SHA256_WITH_RSA);
  const name = directoryName(DUMMY_CN);
  const tbs = derSequence(
    derInteger(serial),
    algorithm,
    name,
    derSequence(derUtcTime(new Date(Date.UTC(2026, 0, 1))), derUtcTime(new Date(Date.UTC(2036, 0, 1)))),
    name,
    spki,
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign({ name: "RSASSA-PKCS1-v1_5" }, keyPair.privateKey, toArrayBuffer(tbs)),
  );
  const certificateDer = derSequence(tbs, algorithm, derBitString(signature));
  const extracted = spkiFromCertificate(certificateDer);
  if (!bytesEqual(extracted, spki)) throw new Error("certificate spki mismatch");
  const verified = await crypto.subtle.verify(
    { name: "RSASSA-PKCS1-v1_5" },
    keyPair.publicKey,
    toArrayBuffer(signature),
    toArrayBuffer(tbs),
  );
  if (!verified) throw new Error("certificate signature mismatch");
  return {
    privateKey: keyPair.privateKey,
    certificateDer,
    certificatePem: toPem("CERTIFICATE", certificateDer),
  };
}

export function spkiFromCertificate(der: Uint8Array): Uint8Array {
  const certificate = readDer(der, 0);
  if (certificate.tag !== 0x30 || certificate.end !== der.length) throw new Error("invalid certificate");
  const certificateFields = readSequence(der, certificate);
  const tbs = certificateFields[0];
  if (!tbs || tbs.tag !== 0x30) throw new Error("invalid certificate");
  const fields = readSequence(der, tbs);
  let index = 0;
  if (fields[0] && der[fields[0].start] === 0xa0) index = 1;
  const spki = fields[index + 5];
  if (!spki || spki.tag !== 0x30) throw new Error("invalid certificate");
  return der.slice(spki.start, spki.end);
}

export function certificateDerFromText(text: string): Uint8Array {
  if (/PRIVATE KEY/.test(text)) throw new Error("private key rejected");
  const pem = text.match(/-----BEGIN CERTIFICATE-----([A-Za-z0-9+/=\s]+)-----END CERTIFICATE-----/);
  const encoded = (pem ? pem[1] : text).replace(/\s+/g, "");
  if (!encoded) throw new Error("invalid certificate");
  return base64ToBytes(encoded);
}

export function toPem(label: string, der: Uint8Array): string {
  const body = bytesToBase64(der).match(/.{1,64}/g)?.join("\n") ?? bytesToBase64(der);
  return `-----BEGIN ${label}-----\n${body}\n-----END ${label}-----\n`;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export function base64ToBytes(value: string): Uint8Array {
  const cleaned = value.replace(/\s+/g, "");
  if (!cleaned || !/^[A-Za-z0-9+/]*={0,2}$/.test(cleaned)) throw new Error("invalid base64");
  const padded = cleaned + "=".repeat((4 - (cleaned.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return copy;
}

export function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) diff |= left[index] ^ right[index];
  return diff === 0;
}

type DerView = { tag: number; start: number; valueStart: number; end: number };

function readDer(bytes: Uint8Array, offset: number): DerView {
  if (offset >= bytes.length) throw new Error("truncated certificate");
  const tag = bytes[offset];
  if (offset + 1 >= bytes.length) throw new Error("truncated certificate");
  let length = bytes[offset + 1];
  let valueStart = offset + 2;
  if (length >= 0x80) {
    const count = length & 0x7f;
    if (count === 0 || count > 3 || valueStart + count > bytes.length) throw new Error("invalid certificate");
    length = 0;
    for (let index = 0; index < count; index += 1) length = (length << 8) | bytes[valueStart + index];
    valueStart += count;
  }
  const end = valueStart + length;
  if (end > bytes.length) throw new Error("truncated certificate");
  return { tag, start: offset, valueStart, end };
}

function readSequence(bytes: Uint8Array, view: DerView): DerView[] {
  const children: DerView[] = [];
  let offset = view.valueStart;
  while (offset < view.end) {
    const child = readDer(bytes, offset);
    children.push(child);
    offset = child.end;
  }
  if (offset !== view.end) throw new Error("invalid certificate");
  return children;
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function derTlv(tag: number, value: Uint8Array): Uint8Array {
  return concatBytes([Uint8Array.of(tag), derLength(value.length), value]);
}

function derLength(length: number): Uint8Array {
  if (length < 0x80) return Uint8Array.of(length);
  const bytes: number[] = [];
  let remaining = length;
  while (remaining > 0) {
    bytes.unshift(remaining & 0xff);
    remaining >>= 8;
  }
  return Uint8Array.of(0x80 | bytes.length, ...bytes);
}

function derSequence(...parts: Uint8Array[]): Uint8Array {
  return derTlv(0x30, concatBytes(parts));
}

function derInteger(bytes: Uint8Array): Uint8Array {
  let body = bytes;
  let start = 0;
  while (start < body.length - 1 && body[start] === 0 && (body[start + 1] & 0x80) === 0) start += 1;
  body = body.slice(start);
  if ((body[0] & 0x80) !== 0) body = concatBytes([Uint8Array.of(0), body]);
  return derTlv(0x02, body);
}

function derBitString(payload: Uint8Array): Uint8Array {
  return derTlv(0x03, concatBytes([Uint8Array.of(0), payload]));
}

function derOid(oid: string): Uint8Array {
  const parts = oid.split(".").map((part) => Number(part));
  const body = [parts[0] * 40 + parts[1]];
  for (const part of parts.slice(2)) {
    const encoded = [part & 0x7f];
    let rest = part >> 7;
    while (rest > 0) {
      encoded.unshift((rest & 0x7f) | 0x80);
      rest >>= 7;
    }
    body.push(...encoded);
  }
  return derTlv(0x06, Uint8Array.from(body));
}

function derUtf8(value: string): Uint8Array {
  return derTlv(0x0c, new TextEncoder().encode(value));
}

function derUtcTime(date: Date): Uint8Array {
  const year = String(date.getUTCFullYear() % 100).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");
  return derTlv(0x17, new TextEncoder().encode(`${year}${month}${day}${hours}${minutes}${seconds}Z`));
}

function algorithmIdentifier(oid: string): Uint8Array {
  return derSequence(derOid(oid), Uint8Array.of(0x05, 0x00));
}

function directoryName(commonName: string): Uint8Array {
  return derSequence(derTlv(0x31, derSequence(derOid(COMMON_NAME), derUtf8(commonName))));
}
