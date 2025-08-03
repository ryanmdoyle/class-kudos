import { LegalLayout } from "@/app/layouts/LegalLayout";

export function Terms() {
  return (
    <LegalLayout>
      <div>
        <h1 className="text-2xl font-bold mb-4">Class Kudos Terms of Service</h1>
        <p className="mb-4"><strong>Effective Date: August 3, 2025</strong></p>

        <p className="mb-6">Welcome to Class Kudos. By accessing or using our educational platform (the "Service"), you agree to these Terms of Service ("Terms"). If you are a student, please review these with your parent or guardian.</p>

        <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
        <p className="mb-4">By using Class Kudos, you agree to abide by these Terms and any posted guidelines. If you do not agree, you must not use the Service.</p>

        <h2 className="text-xl font-semibold mb-3">2. Eligibility</h2>
        <p className="mb-4">You must be authorized by your school or district to use Class Kudos. Teachers must provide valid email addresses for account creation. Students access the service through enrollment in teacher-created groups. If you are under 13, you must have parental/guardian consent in accordance with COPPA.</p>

        <h2 className="text-xl font-semibold mb-3">3. User Accounts</h2>
        <p className="mb-2"><strong>Teacher Accounts:</strong></p>
        <ul className="list-disc pl-6 mb-4">
          <li>Teachers create accounts with email addresses for communication</li>
          <li>Teachers create and manage classroom groups</li>
          <li>Teachers set up reward systems and kudos types for their groups</li>
        </ul>

        <p className="mb-2"><strong>Student Access:</strong></p>
        <ul className="list-disc pl-6 mb-4">
          <li>Students are enrolled in groups by their teachers</li>
          <li>Students use secure WebAuthn authentication (no passwords required)</li>
          <li>Student accounts do not require email addresses</li>
        </ul>

        <p className="mb-2"><strong>Security:</strong></p>
        <ul className="list-disc pl-6 mb-4">
          <li>You are responsible for safeguarding your authentication credentials</li>
          <li>Notify your teacher or administrator immediately if you suspect unauthorized access</li>
          <li>Do not share your WebAuthn credentials or attempt to access other users' accounts</li>
        </ul>

        <h2 className="text-xl font-semibold mb-3">4. Acceptable Use</h2>
        <p className="mb-2">You agree not to:</p>
        <ul className="list-disc pl-6 mb-4">
          <li>Misuse Class Kudos to harass, threaten, or harm any person</li>
          <li>Attempt to gain unauthorized access to any part of the Service or other users' data</li>
          <li>Manipulate the points system or attempt to fraudulently redeem rewards</li>
          <li>Provide false information when responding to reward redemption prompts</li>
          <li>Use the Service for any purpose other than legitimate educational activities</li>
          <li>Upload or submit content that violates any law or infringes others' rights</li>
        </ul>

        <h2 className="text-xl font-semibold mb-3">5. Educational Use</h2>
        <p className="mb-4">Class Kudos is designed as an educational tool for classroom management and student engagement. The points and rewards system is intended to support learning objectives set by teachers and schools. Redemption of rewards may require written responses that will be reviewed by teachers.</p>

        <h2 className="text-xl font-semibold mb-3">6. Data Ownership</h2>
        <p className="mb-4">Educational data created through your use of Class Kudos (including points earned, group participation, and reward redemptions) belongs to the educational institution. Teachers and school administrators have access to student data within their assigned groups for educational purposes.</p>

        <h2 className="text-xl font-semibold mb-3">7. Intellectual Property</h2>
        <p className="mb-4">All content, design, and code of Class Kudos are © 2025 Ryan Doyle. You may not reproduce or distribute without permission. User-generated content (such as reward redemption responses) remains the property of the user and their educational institution.</p>

        <h2 className="text-xl font-semibold mb-3">8. Account Termination</h2>
        <p className="mb-2">Accounts may be terminated in the following circumstances:</p>
        <ul className="list-disc pl-6 mb-4">
          <li>Violation of these Terms of Service</li>
          <li>At the request of school administrators</li>
          <li>When students are no longer enrolled in participating classes</li>
          <li>For extended periods of inactivity</li>
        </ul>
        <p className="mb-4">Upon termination, associated data including enrollments, kudos records, and redemptions will be deleted from our systems.</p>

        <h2 className="text-xl font-semibold mb-3">9. Disclaimers & Limitation of Liability</h2>
        <p className="mb-2"><strong>No Warranty:</strong> Class Kudos is provided "as is" without warranty of any kind.</p>
        <p className="mb-4"><strong>Limitation:</strong> Ryan Doyle is not liable for indirect, incidental, or consequential damages arising from use of the Service, including but not limited to loss of educational data or points.</p>

        <h2 className="text-xl font-semibold mb-3">10. Governing Law</h2>
        <p className="mb-4">These Terms are governed by the laws of the State of [State], USA, without regard to conflict-of-law principles.</p>

        <h2 className="text-xl font-semibold mb-3">11. Changes to Terms</h2>
        <p className="mb-4">We may update these Terms by posting a new version on the site. Changes take effect upon posting; your continued use constitutes acceptance.</p>

        <h2 className="text-xl font-semibold mb-3">12. Contact</h2>
        <p className="mb-2">Questions? Contact us at:</p>
        <p>doylecodes@gmail.com</p>
      </div>
    </LegalLayout>
  );
}