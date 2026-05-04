import { SeoLandingPage } from "@/components/SeoLandingPage";

export default function ShareCodeOnline() {
  return (
    <SeoLandingPage
      title="Share Code Online Instantly With One Link"
      subtitle="SyncNova helps you paste code and share a live link in seconds. Collaborators can view updates in real-time without signup."
      keyword="share code online"
      sections={[
        {
          heading: "Real-time code collaboration that feels instant",
          body:
            "If you need to share code online quickly, SyncNova gives you a live editor where changes appear immediately for everyone in the room. This is ideal for interviews, team debugging, pair programming, and quick reviews.",
        },
        {
          heading: "No login, no setup, no delay",
          body:
            "Traditional tools slow you down with account creation and project setup. SyncNova removes friction so you can open a session, paste code, and send one link directly in chat or email.",
        },
        {
          heading: "Built for modern developer workflows",
          body:
            "Use SyncNova to share snippets, shell commands, configs, and troubleshooting notes. It combines the speed of a paste tool with the collaborative feel of a live document editor.",
        },
      ]}
      faqs={[
        {
          q: "How do I share code online for free?",
          a: "Create a SyncNova session, paste your code, and share the generated URL. Anyone with the link can view updates live.",
        },
        {
          q: "Can multiple people view the same code session?",
          a: "Yes. Multiple viewers can open the same link and see the latest content in real-time.",
        },
      ]}
    />
  );
}
