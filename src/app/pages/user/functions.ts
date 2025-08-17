"use server";

import {
  generateRegistrationOptions,
  generateAuthenticationOptions,
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import { sessions } from "@/session/store";
import { requestInfo } from "rwsdk/worker";
import { db, User, UserRole } from "@/db";
import { env } from "cloudflare:workers";
import { nanoid } from 'nanoid';
import { createPasswordResetEmail, sendEmail } from "@/app/lib/email";

const IS_DEV = process.env.NODE_ENV === "development";

function getWebAuthnConfig(request: Request) {
  const rpID = env.WEBAUTHN_RP_ID ?? new URL(request.url).hostname;
  const rpName = IS_DEV ? "Development App" : env.WEBAUTHN_APP_NAME;
  return {
    rpName,
    rpID,
  };
}

export async function startPasskeyRegistration(username: string) {
  const { rpName, rpID } = getWebAuthnConfig(requestInfo.request);
  const { headers } = requestInfo;

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: username,
    authenticatorSelection: {
      // Require the authenticator to store the credential, enabling a username-less login experience
      residentKey: "required",
      // Prefer user verification (biometric, PIN, etc.), but allow authentication even if it's not available
      userVerification: "preferred",
    },
    // Add supported algorithms for better compatibility
    supportedAlgorithmIDs: [-7, -257], // ES256 and RS256
    // Set a reasonable timeout (default is often too short for some managers)
    timeout: 60000, // 60 seconds
    // Exclude existing credentials to prevent duplicate registrations
    excludeCredentials: await getExistingCredentialsForUser(username),
  });

  await sessions.save(headers, { challenge: options.challenge });

  return options;
}

export async function startPasskeyLogin() {
  const { rpID } = getWebAuthnConfig(requestInfo.request);
  const { headers } = requestInfo;

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "preferred",
    // Increase timeout for better user experience
    timeout: 60000, // 60 seconds
  });

  await sessions.save(headers, { challenge: options.challenge });

  return options;
}

// Helper function to get existing credentials for a user (for registration exclusion)
async function getExistingCredentialsForUser(username: string) {
  try {
    const user = await db.user.findUnique({
      where: { username },
      include: { credentials: true }
    });

    if (!user) return [];

    return user.credentials.map(cred => ({
      id: cred.credentialId,
      type: 'public-key' as const,
    }));
  } catch (error) {
    console.error('Error fetching existing credentials:', error);
    return [];
  }
}

export async function finishPasskeyRegistration(
  userOptions: {
    username: string,
    firstName: string,
    lastName: string,
    role: UserRole,
    email?: string,
  },
  registration: RegistrationResponseJSON,
) {
  const { request, headers } = requestInfo;
  const { origin } = new URL(request.url);

  const session = await sessions.load(request);
  const challenge = session?.challenge;

  if (!challenge) {
    return false;
  }

  const verification = await verifyRegistrationResponse({
    response: registration,
    expectedChallenge: challenge,
    expectedOrigin: origin,
    expectedRPID: env.WEBAUTHN_RP_ID || new URL(request.url).hostname,
  });

  if (!verification.verified || !verification.registrationInfo) {
    return false;
  }

  await sessions.save(headers, { challenge: null });

  const user = await db.user.create({
    data: {
      username: userOptions.username,
      firstName: userOptions.firstName,
      lastName: userOptions.lastName,
      role: userOptions.role,
      ...(userOptions.email ? { email: userOptions.email } : {}), // conditionally include email for teachers
    },
  });

  await db.credential.create({
    data: {
      userId: user.id,
      credentialId: verification.registrationInfo.credential.id,
      publicKey: verification.registrationInfo.credential.publicKey,
      counter: verification.registrationInfo.credential.counter,
    },
  });

  return true;
}

export async function finishPasskeyLogin(login: AuthenticationResponseJSON) {
  const { request, headers } = requestInfo;
  const { origin } = new URL(request.url);

  const session = await sessions.load(request);
  const challenge = session?.challenge;

  if (!challenge) {
    return false;
  }

  const credential = await db.credential.findUnique({
    where: {
      credentialId: login.id,
    },
  });

  if (!credential) {
    return false;
  }

  const verification = await verifyAuthenticationResponse({
    response: login,
    expectedChallenge: challenge,
    expectedOrigin: origin,
    expectedRPID: env.WEBAUTHN_RP_ID || new URL(request.url).hostname,
    requireUserVerification: false,
    credential: {
      id: credential.credentialId,
      publicKey: credential.publicKey,
      counter: credential.counter,
    },
  });

  if (!verification.verified) {
    return false;
  }

  await db.credential.update({
    where: {
      credentialId: login.id,
    },
    data: {
      counter: verification.authenticationInfo.newCounter,
    },
  });

  const user = await db.user.findUnique({
    where: {
      id: credential.userId,
    },
  });

  if (!user) {
    return false;
  }

  await sessions.save(headers, {
    userId: user.id,
    challenge: null,
  });

  return true;
}

export async function validateTeacherAccessCode(username: string, code: string): Promise<{ valid: boolean, user: User | null }> {
  const user = await db.user.findUnique({
    where: { username },
  });

  if (!user || user.role !== "TEACHER") return { valid: false, user: null };

  const accessCode = await db.accessCode.findFirst({
    where: {
      userId: user.id,
      code,
      used: false,
      expiresAt: { gt: new Date() },
    },
  });

  return { valid: !!accessCode, user };
}

export async function finishPasskeyReset(
  userOptions: {
    username: string,
    firstName: string,
    lastName: string,
    role: UserRole,
    userId: string
  },
  registration: RegistrationResponseJSON,
) {
  const { request, headers } = requestInfo;
  const { origin } = new URL(request.url);

  const session = await sessions.load(request);
  const challenge = session?.challenge;

  if (!challenge) {
    return false;
  }

  const verification = await verifyRegistrationResponse({
    response: registration,
    expectedChallenge: challenge,
    expectedOrigin: origin,
    expectedRPID: env.WEBAUTHN_RP_ID || new URL(request.url).hostname,
  });

  if (!verification.verified || !verification.registrationInfo) {
    return false;
  }

  await sessions.save(headers, { challenge: null });

  await db.credential.create({
    data: {
      userId: userOptions.userId,
      credentialId: verification.registrationInfo.credential.id,
      publicKey: verification.registrationInfo.credential.publicKey,
      counter: verification.registrationInfo.credential.counter,
    },
  });

  return true;
}

export async function requestTeacherAccessCode(email: string): Promise<{ success: boolean; error?: string | null }> {
  try {
    const user = await db.user.findUnique({
      where: { email: email }
    })

    if (!user || !user.email) return { success: false, error: "No valid user found." }

    if (user && user.role === "TEACHER") {
      const code = nanoid(12)
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes from now

      const accessCode = await db.accessCode.create({
        data: {
          userId: user.id,
          code: code,
          expiresAt: expiresAt,
          used: false,
        },
      })

      // Generate the email content
      const emailContent = createPasswordResetEmail(user, accessCode);

      const { id } = await sendEmail({
        from: "Class Kudos <reset@classkudos.com>",
        to: user.email,
        subject: "🔐 Password Reset Code",
        html: emailContent.html,
        text: emailContent.text,
      },
        env.RESEND_API)

      if (id) return { success: true }
      return { success: false, error: "Unsuccessful Email Send" }
    }
    return { success: false, error: null }
  } catch (err) {
    return { success: false, error: null }
  }
}

type PublicUser = Pick<User, 'id' | 'username' | 'firstName' | 'lastName' | 'role'>;

export async function validateStudentPasskey(
  username: string,
  accessCode: string
): Promise<{ success: boolean; user?: PublicUser, error?: string | null }> {
  try {
    // Look up the user by username and include reset codes
    const userWithCode = await db.user.findUnique({
      where: { username },
      include: { accessCode: true },
    });

    if (!userWithCode) {
      return { success: false, error: "Username not found. Please try again." };
    }

    const codeEntry = userWithCode.accessCode[0];

    if (!codeEntry || codeEntry.code !== accessCode) {
      return { success: false, error: "Invalid reset code. Please try again." };
    }

    const now = new Date();

    // Check if the code is expired or already used
    if (new Date(codeEntry.expiresAt) < now) {
      return { success: false, error: "Reset code has expired. Please request a new one." };
    }

    if (codeEntry.used) {
      return { success: false, error: "Reset code has already been used." };
    }

    return {
      success: true, user: {
        username: userWithCode.username,
        firstName: userWithCode.firstName,
        lastName: userWithCode.lastName,
        role: userWithCode.role,
        id: userWithCode.id,
      }
    };
  } catch (err) {
    console.error("Reset error:", err);
    return { success: false, error: "Something went wrong. Please try again later." };
  }
}

export async function checkUsernameAvailability(username: string): Promise<{ taken: Boolean }> {
  const user = await db.user.findUnique({
    where: { username }
  })

  return { taken: !!user }; // force bool
}

export async function studentAccessCodeLogin(
  username: string,
  code: string
): Promise<{ success: boolean; error?: string | null }> {
  const { headers } = requestInfo;

  const cleanUsername = username.trim();
  const cleanCode = code.trim();

  if (!cleanUsername || !cleanCode) {
    return { success: false, error: "Username and access code are required." };
  }

  // 1. Find the student
  const user = await db.user.findUnique({
    where: { username: cleanUsername },
  });

  if (!user || user.role !== "STUDENT") {
    return { success: false, error: "Invalid student account." };
  }

  // 2. Look for a matching access code
  const accessCode = await db.accessCode.findFirst({
    where: {
      userId: user.id,
      code: cleanCode,
      used: false,
      expiresAt: { gt: new Date() },
    },
  });

  if (!accessCode) {
    return { success: false, error: "Invalid or expired access code." };
  }

  // 3. Mark the code as used
  await db.accessCode.update({
    where: { id: accessCode.id },
    data: { used: true },
  });

  // 4. Save session (same as passkey login)
  await sessions.save(headers, {
    userId: user.id,
    challenge: null,
  });

  return { success: true };
}