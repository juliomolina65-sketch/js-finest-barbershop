import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { prisma } from "./db";

const COOKIE_NAME = "jsf_session";
const SESSION_TTL_SEC = 60 * 60 * 24 * 14; // 14 days

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "SESSION_SECRET is not set. Add it to .env to enable barber login."
    );
  }
  return new TextEncoder().encode(secret);
}

export type SessionPayload = JWTPayload & {
  /** Barber ID */
  sub: string;
};

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

async function signSession(barberId: string): Promise<string> {
  return new SignJWT({ sub: barberId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + SESSION_TTL_SEC)
    .sign(getSecret());
}

async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.sub !== "string") return null;
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Issues a signed cookie for the given barber ID. Call from a server action
 * after a successful login or signup.
 */
export async function createSession(barberId: string): Promise<void> {
  const token = await signSession(barberId);
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SEC,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

/**
 * Returns the currently-logged-in barber, or null. Safe to call from
 * server components and server actions.
 */
export async function getCurrentBarber() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifySession(token);
  if (!payload) return null;
  const barber = await prisma.barber.findUnique({
    where: { id: payload.sub },
  });
  if (!barber || !barber.isActive) return null;
  return barber;
}

/**
 * Edge-runtime-safe session check used by middleware. Returns the session
 * payload (no DB lookup) or null. Don't use for fetching the barber record —
 * use getCurrentBarber() in server components for that.
 */
export async function readSessionFromToken(
  token: string | undefined
): Promise<SessionPayload | null> {
  if (!token) return null;
  return verifySession(token);
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
