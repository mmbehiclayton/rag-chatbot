"use server";

import { db } from "@/lib/db";
import { createSession, destroySession } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { headers } from "next/headers";

export async function register(prevState: any, formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password || !name) {
    return { error: "Missing fields" };
  }

  const existingUser = await db.user.findUnique({ where: { email } });
  if (existingUser) {
    return { error: "User already exists" };
  }

  // Auto-create a default tenant for independent teachers during public registration
  const tenant = await db.tenant.create({
    data: {
      name: `${name}'s Workspace`,
      type: "INDEPENDENT_TEACHER",
    }
  });

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await db.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "TEACHER",
      tenantId: tenant.id
    },
  });

  // Generate Email Verification Token
  const token = randomBytes(32).toString('hex');
  await db.emailVerificationToken.create({
    data: {
      email,
      token,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 hours
    }
  });

  console.log(`\n\n[MOCK EMAIL] Email Verification Link for ${email}:`);
  console.log(`http://localhost:3000/verify-email?token=${token}\n\n`);

  redirect("/verify-email?success=true");
}

export async function login(prevState: any, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Missing fields" };
  }

  const headerStore = await headers();
  const ip = headerStore.get("x-forwarded-for") || "127.0.0.1";
  const rateLimitKey = `login_${ip}`;
  
  await db.rateLimit.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(() => {});

  const limit = await db.rateLimit.upsert({
    where: { key: rateLimitKey },
    create: { key: rateLimitKey, expiresAt: new Date(Date.now() + 15 * 60 * 1000), points: 1 },
    update: { points: { increment: 1 } }
  });

  if (limit.points > 10 && limit.expiresAt > new Date()) {
    return { error: "Too many login attempts. Try again in 15 minutes." };
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    return { error: "Invalid credentials" };
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return { error: "Invalid credentials" };
  }

  if (!user.emailVerified) {
    // If it's a test account they are auto-verified? Wait, test accounts seeded via db have no emailVerified initially.
    // I should probably let test accounts through if they were seeded? 
    // They can just be updated to have emailVerified later, but for now strict checking is best.
    return { error: "Please check your email and verify your account first." };
  }

  await db.rateLimit.delete({ where: { key: rateLimitKey } }).catch(() => {});

  await createSession(user);
  
  redirect("/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/");
}

export async function forgotPassword(prevState: any, formData: FormData) {
  const email = formData.get("email") as string;
  if (!email) return { error: "Email is required" };

  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    return { success: true };
  }

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

  await db.passwordResetToken.create({
    data: { email, token, expiresAt }
  });

  console.log(`\n\n[MOCK EMAIL] Password Reset Link for ${email}:`);
  console.log(`http://localhost:3000/reset-password?token=${token}\n\n`);

  return { success: true };
}

export async function resetPassword(prevState: any, formData: FormData) {
  const token = formData.get("token") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!token || !password || !confirmPassword) return { error: "Missing fields" };
  if (password !== confirmPassword) return { error: "Passwords do not match" };
  if (password.length < 8) return { error: "Password must be at least 8 characters" };

  const resetToken = await db.passwordResetToken.findUnique({ where: { token } });
  
  if (!resetToken || resetToken.expiresAt < new Date()) {
    return { error: "Invalid or expired token" };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await db.user.update({
    where: { email: resetToken.email },
    data: { passwordHash }
  });

  await db.passwordResetToken.delete({ where: { id: resetToken.id } });

  const users = await db.user.findUnique({ where: { email: resetToken.email }, include: { sessions: true } });
  if (users?.sessions) {
      for (const sess of users.sessions) {
         await db.session.delete({ where: { id: sess.id } }).catch(() => {});
      }
  }

  return { success: true };
}

export async function verifyEmail(prevState: any, formData: FormData) {
  const token = formData.get("token") as string;
  if (!token) return { error: "Missing token" };

  const verificationToken = await db.emailVerificationToken.findUnique({ where: { token } });
  
  if (!verificationToken || verificationToken.expiresAt < new Date()) {
    return { error: "Invalid or expired token" };
  }

  await db.user.update({
    where: { email: verificationToken.email },
    data: { emailVerified: new Date() }
  });

  await db.emailVerificationToken.delete({ where: { id: verificationToken.id } });

  return { success: true };
}
