import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { db } from "./db";
import { User, Tenant } from "@prisma/client";
import { randomUUID } from "node:crypto";

const secretKey = process.env.JWT_SECRET_KEY || "development_secret_do_not_use_in_prod";
const key = new TextEncoder().encode(secretKey);

export async function encrypt(payload: any) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);
}

export async function decrypt(input: string): Promise<any> {
  const { payload } = await jwtVerify(input, key, { algorithms: ["HS256"] });
  return payload;
}

export async function createSession(user: User) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  
  // Create DB session
  const session = await db.session.create({
    data: {
      id: randomUUID(),
      userId: user.id,
      expiresAt,
    },
  });

  // Encrypt JWT
  const sessionPayload = { 
    sessionId: session.id, 
    userId: user.id, 
    role: user.role,
    tenantId: user.tenantId,
    email: user.email
  };
  const token = await encrypt(sessionPayload);

  // Store in cookies
  const cookieStore = await cookies();
  cookieStore.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

export async function verifySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;

  try {
    const payload = await decrypt(token);
    if (!payload?.sessionId) return null;
    
    const validSession = await db.session.findUnique({ 
      where: { id: payload.sessionId as string } 
    });
    
    if (!validSession) return null;

    return payload;
  } catch (error) {
    return null;
  }
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  
  if (token) {
    try {
      const payload = await decrypt(token);
      if (payload?.sessionId) {
        await db.session.delete({ where: { id: payload.sessionId } }).catch(() => {});
      }
    } catch (e) {}
  }
  
  cookieStore.delete("session");
}

/** 
 * Drop-in replacement for Clerk's auth() method.
 * Makes refactoring much easier across the codebase.
 */
export async function auth() {
  const session = await verifySession();
  return { 
    userId: session?.userId || null,
    role: session?.role || null,
    tenantId: session?.tenantId || null,
    email: session?.email || null
  };
}
