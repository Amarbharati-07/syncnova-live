import { SeoLandingPage } from "@/components/SeoLandingPage";

export default function InstantFileSharing() {
  return (
    <SeoLandingPage
      title="Instant File Sharing for Code Teams"
      subtitle="Share files, snippets, and live notes from one modern web app. Built for speed, clarity, and collaboration."
      keyword="instant file sharing"
      sections={[
        {
          heading: "Instant sharing with one link",
          body:
            "SyncNova is an instant file sharing tool where you can upload and distribute files without signup. Create a room, upload, and share immediately.",
        },
        {
          heading: "Combine files with real-time notes",
          body:
            "Attach context with live text so receivers understand what each file contains, what to review, and what to run. This reduces back-and-forth and speeds delivery.",
        },
        {
          heading: "Made for modern collaboration",
          body:
            "From engineering teams to freelancers, SyncNova helps teams move fast with simple, reliable sharing workflows.",
        },
      ]}
      faqs={[
        {
          q: "What is the easiest way to share files instantly?",
          a: "Use SyncNova: upload files, copy the room link, and send it. Recipients can access content right away.",
        },
        {
          q: "Is instant file sharing free to use?",
          a: "Yes, SyncNova supports free sharing workflows with no-login access.",
        },
      ]}
    />
  );
}
