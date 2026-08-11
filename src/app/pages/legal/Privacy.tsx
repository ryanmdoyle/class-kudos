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
          <li>Email addresses for teacher and administrator accounts only (never collected for students)</li>
          <li>User role designation (student, teacher, or admin)</li>
        </ul>

        <p className="mb-2"><strong>Educational Data:</strong></p>
        <ul className="list-disc pl-6 mb-4">
          <li>Group/classroom memberships and enrollments</li>
          <li>Points earned and awarded through the kudos system</li>
          <li>Reward redemptions and associated responses (when required)</li>
          <li>Group-specific reward types and values</li>
          <li>Classroom travel log entries: which in-classroom location a student has signed out to, and when they signed out and back in</li>
        </ul>

        <p className="mb-2"><strong>Authentication Data:</strong></p>
        <ul className="list-disc pl-6 mb-4">
          <li><strong>Teachers and administrators:</strong> passwords are stored and verified by our authentication provider, Supabase. A password you type is sent over an encrypted connection and passed straight through to Supabase to be checked; Class Kudos never writes it to our database or our logs, and never stores password reset codes. Your Class Kudos account is identified by the same account identifier Supabase issues.</li>
          <li><strong>Students:</strong> a class code issued by the teacher, stored alongside a one-way hash used to look it up. Class codes are stored in a readable form on purpose, because teachers need to print and re-issue them; they are classroom sign-in codes, not personal passwords, and should not be reused anywhere else.</li>
          <li>A session cookie is set when you sign in, so you stay signed in between pages.</li>
        </ul>

        <p className="mb-2"><strong>System Data:</strong></p>
        <ul className="list-disc pl-6 mb-4">
          <li>Account creation and last update timestamps</li>
          <li>Activity timestamps for kudos awards and reward redemptions</li>
        </ul>

        <h2 className="text-xl font-semibold mb-3">2. How We Use Information</h2>
        <p className="mb-2"><strong>Operate the Service:</strong></p>
        <ul className="list-disc pl-6 mb-4">
          <li>Authenticate teachers by email and password, and students by class code</li>
          <li>Track and display points earned within classroom groups</li>
          <li>Manage reward systems and redemptions</li>
          <li>Enable teachers to manage their classroom groups</li>
          <li>Show a classroom travel log of who is currently out of the room</li>
        </ul>

        <p className="mb-2"><strong>Communicate:</strong></p>
        <ul className="list-disc pl-6 mb-4">
          <li>Send account notifications to teachers (email addresses are only collected for teacher accounts)</li>
          <li>Send password reset emails to teachers. These are sent by Supabase, our authentication provider, on our behalf.</li>
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

        <p className="mb-2"><strong>Publicly Accessible Travel Log:</strong> Every teacher-created group has a shareable travel-log web address, meant to be displayed in the classroom. Anyone with that address can see the first name and last initial of the students in that group and who is currently signed out, and can change those entries, without signing in. No points, email addresses, or account identifiers are shown on that page. Teachers control whether to use this feature and where to share the address.</p>

        <p className="mb-2"><strong>Service Providers:</strong> We may engage third-party hosting or technical service providers under strict confidentiality agreements. Teacher authentication (password storage, verification, and reset emails) is provided by Supabase; the service runs on Cloudflare infrastructure.</p>

        <p className="mb-4"><strong>Legal Requirements:</strong> We disclose data only if required by law or to protect rights and safety.</p>

        <h2 className="text-xl font-semibold mb-3">4. Children's Privacy & COPPA</h2>
        <p className="mb-4">Class Kudos is designed for educational use. Students under 13 may use the service only with verifiable parental/guardian consent obtained through their school. We do not collect email addresses from students. We do not sell personal data. To review, correct, or delete your child's information, please contact your child's teacher or school administrator.</p>

        <h2 className="text-xl font-semibold mb-3">5. Data Security</h2>
        <p className="mb-4">Teacher passwords are stored and verified by Supabase. They travel through our servers only in transit, over an encrypted connection, on their way to Supabase to be checked, and are never stored or logged by us. Student class codes are looked up by a one-way hash and compared in constant time. Session cookies are cryptographically signed. We use administrative, technical, and physical safeguards to protect data. However, no system is 100% secure; we cannot guarantee absolute security, and a class code is only as private as the paper it is printed on.</p>

        <h2 className="text-xl font-semibold mb-3">6. Data Retention</h2>
        <p className="mb-4">We retain personal information as long as accounts are active or as needed to provide educational services. When an account is deleted, its enrollments, kudos records, redemption history, class codes, and travel log entries are deleted with it. When a group is deleted, all of that group's data is deleted with it. Sign-in sessions expire automatically.</p>

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