import { LegalLayout } from "@/app/layouts/LegalLayout";

export function WhatArePasskeys() {
  return (
    <LegalLayout>
      <div>
        <h1 className="text-2xl font-bold mb-4">Class Kudos Login Options</h1>
        <p className="mb-4"><strong>Effective Date: August 17, 2025</strong></p>

        <p className="mb-6">
          Class Kudos uses two secure methods for signing in: <strong>Passkeys</strong> (WebAuthn) and <strong>Access Codes</strong>.
          This page explains how each method works and who should use them.
        </p>

        <h2 className="text-xl font-semibold mb-3">1. Passkeys (WebAuthn)</h2>
        <p className="mb-4">
          A passkey is a modern, passwordless way to sign in. Instead of remembering a password,
          you use your device (such as Face ID, Touch ID, a PIN, or a security key) to log in.
          Passkeys are more secure than passwords and work across most modern browsers and devices.
        </p>

        <p className="mb-2"><strong>Teacher Accounts:</strong></p>
        <ul className="list-disc pl-6 mb-4">
          <li>All teachers must sign up using a passkey</li>
          <li>No passwords or email confirmations are required for login</li>
          <li>Passkeys are tied to your device but can sync across devices if supported (e.g., iCloud Keychain, Google Password Manager, 1Password)</li>
        </ul>

        <p className="mb-2"><strong>Student Accounts:</strong></p>
        <ul className="list-disc pl-6 mb-4">
          <li>Students may also create their own accounts with a passkey</li>
          <li>Students who use passkeys log in the same way teachers do — no codes or passwords needed</li>
          <li>If a passkey is lost or unavailable, an access code can be used as a backup</li>
        </ul>

        <h2 className="text-xl font-semibold mb-3">2. Access Codes</h2>
        <p className="mb-4">
          Access codes are temporary login credentials created by teachers for students.
          They allow students to log in with a username and a teacher-generated code.
        </p>

        <ul className="list-disc pl-6 mb-4">
          <li>Teachers can create accounts for students who cannot use passkeys</li>
          <li>Students log in by entering their username and the access code provided</li>
          <li>Access codes expire after a set time and must be refreshed if needed</li>
          <li>If a student has a passkey but cannot use it (e.g., they lost access),
            an access code provides an alternative way to log in</li>
        </ul>

        <h2 className="text-xl font-semibold mb-3">3. Choosing the Right Option</h2>
        <p className="mb-2">Here is when to use each login method:</p>
        <ul className="list-disc pl-6 mb-4">
          <li><strong>Teachers:</strong> Always use a passkey (required for account creation and login)</li>
          <li><strong>Students with personal devices:</strong> Recommended to use a passkey for convenience and security</li>
          <li><strong>Students without compatible devices:</strong> Teachers can create accounts and generate access codes</li>
          <li><strong>Backup option:</strong> Any student can use an access code if their passkey is unavailable</li>
        </ul>

        <h2 className="text-xl font-semibold mb-3">4. Security Notes</h2>
        <ul className="list-disc pl-6 mb-4">
          <li>Never share your passkey or access code with others</li>
          <li>Access codes are temporary — do not rely on them for long-term login</li>
          <li>If you suspect someone has used your account without permission, notify your teacher immediately</li>
        </ul>
      </div>
    </LegalLayout>
  );
}
