import { SeoLandingPage } from "@/components/SeoLandingPage";

export default function ShareZipFilesOnline() {
  return (
    <SeoLandingPage
      title="Share ZIP Files Online Fast and Secure"
      subtitle="Upload ZIP archives and share a single live link with your team. Perfect for project bundles, assets, and delivery handoffs."
      keyword="share zip files online"
      sections={[
        {
          heading: "Upload ZIP files and share instantly",
          body:
            "SyncNova makes it easy to share zip files online without complicated workflows. Upload your archive, generate one link, and distribute it to clients, teammates, or reviewers in seconds.",
        },
        {
          heading: "One workspace for files and code",
          body:
            "You can share files and live notes in one room instead of juggling multiple services. This makes QA, handoffs, and bug reproduction much faster.",
        },
        {
          heading: "Simple sharing for teams and agencies",
          body:
            "Whether you send design exports, builds, logs, or docs, SyncNova gives a clean way to organize and share deliverables quickly.",
        },
      ]}
      faqs={[
        {
          q: "Can I share large ZIP files online?",
          a: "Yes, SyncNova supports file uploads and one-link sharing so receivers can download from a single session page.",
        },
        {
          q: "Do recipients need an account?",
          a: "No. Anyone with the link can access the shared session without signup.",
        },
      ]}
    />
  );
}
