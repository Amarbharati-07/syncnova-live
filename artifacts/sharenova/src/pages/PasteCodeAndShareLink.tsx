import { SeoLandingPage } from "@/components/SeoLandingPage";

export default function PasteCodeAndShareLink() {
  return (
    <SeoLandingPage
      title="Paste Code and Share Link in Seconds"
      subtitle="Quickly paste code, commands, or notes and send one clean URL. SyncNova keeps everything live and easy to follow."
      keyword="paste code and share link"
      sections={[
        {
          heading: "Fastest way to paste and share",
          body:
            "When speed matters, SyncNova gives you a clean live editor where you can paste code and instantly share a link. No extra steps, no clutter.",
        },
        {
          heading: "Live updates for support and debugging",
          body:
            "Great for support calls and dev collaboration. As content changes, everyone watching the link sees the latest version immediately.",
        },
        {
          heading: "Better than static paste tools",
          body:
            "Unlike static snippets, SyncNova supports ongoing edits and file sharing in one place, making it useful for real work sessions instead of one-time dumps.",
        },
      ]}
      faqs={[
        {
          q: "Is this like Pastebin but live?",
          a: "Yes. SyncNova works like a live paste tool where updates sync in real-time.",
        },
        {
          q: "Can I also share files with pasted code?",
          a: "Yes, you can upload files in the same session and keep everything together.",
        },
      ]}
    />
  );
}
