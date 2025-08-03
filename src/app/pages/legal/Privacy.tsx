import { LegalLayout } from "@/app/layouts/LegalLayout";

export function Privacy() {
  return (
    <LegalLayout>
      <div>
        <h1 className="text-2xl font-bold mb-4">Class Kudos Privacy Policy</h1>
        <p className="mb-4"><strong>Effective Date: August 3, 2025</strong></p>

        <p className="mb-6">We respect your privacy and are committed to protecting student data. This policy explains how we collect, use, and share information when you use Class Kudos.</p>

        <h2 className="text-xl font-semibold mb-3">1. Information We Collect</h2>
        <p className="mb-2"><strong>Account Information:</strong></p>
        <ul className="list-disc pl-6 mb-4">
          <li>First and last names for all users</li>
          <li>Unique usernames for all users</li>
          <li>Email addresses for teacher accounts only (not collected for students)</li>
          <li>User role designation (student, teacher, or admin)</li>
        </ul>

        <p className="mb-2"><strong>Educational Data:</strong></p>
        <ul className="list-disc pl-6 mb-4">
          <li>Group/classroom memberships and enrollments</li>
          <li>Points earned and awarded through the kudos system</li>
          <li>Reward redemptions and associated responses (when required)</li>
          <li>Group-specific reward types and values</li>
        </ul>

        <p className="mb-2"><strong>Authentication Data:</strong></p>
        <ul className="list-disc pl-6 mb-4">
          <li>WebAuthn credentials (public keys and counters for secure login)</li>
          <li>Password reset codes (temporary, with expiration)</li>
        </ul>

        <p className="mb-2"><strong>System Data:</strong></p>
        <ul className="list-disc pl-6 mb-4">
          <li>Account creation and last update timestamps</li>
          <li>Activity timestamps for kudos awards and reward redemptions</li>
        </ul>

        <h2 className="text-xl font-semibold mb-3">2. How We Use Information</h2>
        <p className="mb-2"><strong>Operate the Service:</strong></p>
        <ul className="list-disc pl-6 mb-4">
          <li>Authenticate users through secure WebAuthn credentials</li>
          <li>Track and display points earned within classroom groups</li>
          <li>Manage reward systems and redemptions</li>
          <li>Enable teachers to manage their classroom groups</li>
        </ul>

        <p className="mb-2"><strong>Communicate:</strong></p>
        <ul className="list-disc pl-6 mb-4">
          <li>Send account notifications to teachers (email addresses are only collected for teacher accounts)</li>
          <li>Provide password reset functionality</li>
        </ul>

        <p className="mb-2"><strong>Compliance & Safety:</strong></p>
        <ul className="list-disc pl-6 mb-4">
          <li>Monitor for appropriate use of the reward system</li>
          <li>Maintain data integrity and prevent unauthorized access</li>
        </ul>

        <h2 className="text-xl font-semibold mb-3">3. Data Sharing</h2>
        <p className="mb-2"><strong>Within Educational Context:</strong></p>
        <ul className="list-disc pl-6 mb-4">
          <li>Teachers can view data for students in their assigned groups</li>
          <li>Student progress and point data is shared with authorized school administrators</li>
          <li>Group enrollment and activity data is accessible to group owners (teachers)</li>
        </ul>

        <p className="mb-2"><strong>Service Providers:</strong> We may engage third-party hosting or technical service providers under strict confidentiality agreements.</p>

        <p className="mb-4"><strong>Legal Requirements:</strong> We disclose data only if required by law or to protect rights and safety.</p>

        <h2 className="text-xl font-semibold mb-3">4. Children's Privacy & COPPA</h2>
        <p className="mb-4">Class Kudos is designed for educational use. Students under 13 may use the service only with verifiable parental/guardian consent obtained through their school. We do not collect email addresses from students. We do not sell personal data. To review, correct, or delete your child's information, please contact your child's teacher or school administrator.</p>

        <h2 className="text-xl font-semibold mb-3">5. Data Security</h2>
        <p className="mb-4">We employ WebAuthn for secure authentication and use administrative, technical, and physical safeguards to protect data. All authentication credentials are stored securely with industry-standard encryption. However, no system is 100% secure; we cannot guarantee absolute security.</p>

        <h2 className="text-xl font-semibold mb-3">6. Data Retention</h2>
        <p className="mb-4">We retain personal information as long as accounts are active or as needed to provide educational services. When accounts are deleted, associated enrollments, kudos records, and redemption history are also removed from our systems. Reset codes are automatically purged after expiration.</p>

        <h2 className="text-xl font-semibold mb-3">7. Your Rights</h2>
        <p className="mb-4">Depending on your jurisdiction, you may have the right to access, correct, or delete personal information. Teachers and school administrators can manage student data within their groups. Parents/guardians may request data access or deletion by contacting the school.</p>

        <h2 className="text-xl font-semibold mb-3">8. Changes to This Policy</h2>
        <p className="mb-4">We may update this Policy; we'll post the new version with a revised "Effective Date." Continued use after changes means you accept the updates.</p>

        <h2 className="text-xl font-semibold mb-3">9. Contact Us</h2>
        <p className="mb-2">For privacy questions or data requests:</p>
        <p className="mb-1">Email: doylecodes@gmail.com</p>
        <p>Address: Granite Bay, CA</p>
      </div>
    </LegalLayout>
  );
}