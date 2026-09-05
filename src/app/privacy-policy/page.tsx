import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — NUFA Global Education",
  description: "Privacy policy for the NUFA Global Education Portal (Portal NUFA).",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 text-sm leading-relaxed text-neutral-800">
      <h1 className="mb-1 text-2xl font-bold text-neutral-900">Privacy Policy</h1>
      <p className="mb-8 text-neutral-500">Last updated: August 2026</p>

      <p className="mb-6">
        This Privacy Policy describes how Portal NUFA (&ldquo;the Portal&rdquo;, &ldquo;we&rdquo;,
        &ldquo;us&rdquo;), operated by NUFA Global Education, collects, uses, and protects
        information when you use our internal school management and tutoring
        platform.
      </p>

      <h2 className="mt-8 mb-2 text-lg font-semibold text-neutral-900">
        1. Who this applies to
      </h2>
      <p className="mb-6">
        The Portal is an internal operations tool for NUFA Global
        Education&apos;s tutoring business. It is used by our administrators,
        coordinators, and tutors to manage classes, lesson plans, attendance,
        and student progress reports, and by parents to look up their
        child&apos;s monthly progress report using a student ID number (NIS).
        It is not a
        publicly-registrable consumer service.
      </p>

      <h2 className="mt-8 mb-2 text-lg font-semibold text-neutral-900">
        2. Information we collect
      </h2>
      <ul className="mb-6 list-disc space-y-1.5 pl-5">
        <li>
          <strong>Staff accounts:</strong> name, email address, and role
          (Admin, Coordinator, or Tutor), created and managed by our
          administrators.
        </li>
        <li>
          <strong>Student records:</strong> name, school, class enrollment,
          and a student ID number (NIS) used by parents to look up reports.
        </li>
        <li>
          <strong>Attendance and lesson data:</strong> check-in/check-out
          times, attendance status, lesson plans, and teaching progress notes
          recorded by tutors during class sessions.
        </li>
        <li>
          <strong>Uploaded files:</strong> class check-in photos, lesson plan
          module documents (PDF), and generated monthly parent report PDFs.
        </li>
        <li>
          <strong>Location data:</strong> GPS coordinates captured at
          check-in time, used to confirm a tutor is on-site for a scheduled
          class.
        </li>
      </ul>

      <h2 className="mt-8 mb-2 text-lg font-semibold text-neutral-900">
        3. How we use this information
      </h2>
      <p className="mb-6">
        Information collected through the Portal is used solely to operate
        our tutoring business: scheduling classes, tracking attendance,
        recording teaching progress, generating monthly progress reports for
        parents, and coordinating substitute tutors when needed. We do not
        sell, rent, or use this information for advertising.
      </p>

      <h2 className="mt-8 mb-2 text-lg font-semibold text-neutral-900">
        4. Google API Services
      </h2>
      <p className="mb-6">
        The Portal uses the Google Drive API to store files uploaded through
        the app — class check-in photos, lesson plan module PDFs, and
        generated parent report PDFs — in a Google Drive account dedicated to
        this purpose. The Portal only accesses files it creates itself (the{" "}
        <code className="rounded bg-neutral-100 px-1 py-0.5 text-[0.85em]">
          drive.file
        </code>{" "}
        scope) and does not access, read, or modify any other files in that
        Drive account.
      </p>
      <p className="mb-6">
        Portal NUFA&apos;s use and transfer of information received from
        Google APIs adheres to the{" "}
        <a
          href="https://developers.google.com/terms/api-services-user-data-policy"
          target="_blank"
          rel="noreferrer"
          className="text-primary underline"
        >
          Google API Services User Data Policy
        </a>
        , including the Limited Use requirements.
      </p>

      <h2 className="mt-8 mb-2 text-lg font-semibold text-neutral-900">
        5. Data sharing
      </h2>
      <p className="mb-6">
        We do not share the information described above with third parties,
        except with service providers that operate the Portal on our behalf
        (database hosting, application hosting, and file storage), and only
        to the extent necessary for them to provide that service.
      </p>

      <h2 className="mt-8 mb-2 text-lg font-semibold text-neutral-900">
        6. Data retention
      </h2>
      <p className="mb-6">
        We retain records for as long as needed to operate the Portal and
        meet our recordkeeping obligations as an education provider.
        Administrators can deactivate staff, student, or class records when
        no longer active.
      </p>

      <h2 className="mt-8 mb-2 text-lg font-semibold text-neutral-900">
        7. Contact
      </h2>
      <p className="mb-6">
        Questions about this policy or your data can be sent to{" "}
        <a href="mailto:ecoursenufaglobal@gmail.com" className="text-primary underline">
          ecoursenufaglobal@gmail.com
        </a>
        .
      </p>
    </div>
  );
}
