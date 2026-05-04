import { useLocation } from "wouter";
import { nanoid } from "nanoid";
import { ArrowRight, Upload, Zap } from "lucide-react";

export default function Home() {
  const [, setLocation] = useLocation();

  const createSession = () => {
    const id = nanoid(6);
    setLocation(`/share/${id}`);
  };

  const createUploadSession = () => {
    const id = nanoid(6);
    setLocation(`/share/${id}?upload=1`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <img src="/favicon.png" alt="SyncNova" className="h-8 w-8" />
          <span className="text-lg font-semibold tracking-tight">SyncNova</span>
        </div>
        <button
          onClick={createSession}
          className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-400"
        >
          Start Sharing Now
        </button>
      </nav>

      <main className="mx-auto max-w-6xl px-6 pb-20 pt-10">
        <div className="mb-6 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-emerald-300">🟢 Connected</span>
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-white/75">Live sync enabled</span>
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-white/75">1 link ready</span>
        </div>

        <h1 className="max-w-5xl text-4xl font-bold leading-tight md:text-6xl">
          Share Code &amp; Files Instantly Online ⚡
        </h1>
        <p className="mt-4 max-w-3xl text-base text-white/70 md:text-lg">
          Start typing to share instantly ⚡ Upload files and share in one click. Live sync enabled.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            onClick={createSession}
            className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-6 py-3 font-semibold hover:bg-orange-400"
          >
            Start Sharing Now
            <ArrowRight className="h-4 w-4" />
          </button>
          <span className="text-sm text-white/55">No login • Free • Instant link</span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-white/80">No Signup</span>
          <span className="rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-white/80">Up to 10GB</span>
          <span className="rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-white/80">Real-time Sync</span>
        </div>

        <div className="mt-2 flex flex-wrap gap-3">
          <button
            onClick={createUploadSession}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-6 py-3 text-white/85 hover:bg-white/10"
          >
            <Upload className="h-4 w-4" />
            Upload Files
          </button>
          <button
            onClick={createSession}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-6 py-3 text-white/85 hover:bg-white/10"
          >
            <Zap className="h-4 w-4" />
            Live Session
          </button>
        </div>

        <section className="mt-14 space-y-8">
          <div>
            <h2 className="text-2xl font-semibold">Real-time code sharing</h2>
            <p className="mt-3 text-white/75">
              SyncNova is built for instant code collaboration. Open one live session link, start writing code, and everyone in the room sees changes as you type.
              There is no send button and no waiting state. Whether you are reviewing a bug fix, pasting a config snippet, sharing shell output, or preparing quick interview notes,
              you get a fast live surface that feels lightweight like Pastebin but collaborative like a modern doc editor.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">Upload and share files (ZIP supported)</h2>
            <p className="mt-3 text-white/75">
              Need to send binaries, screenshots, PDFs, or ZIP archives? SyncNova lets you upload files in the same live room so your team can access everything from one place.
              This works well for product handoffs, frontend snapshots, bug reproduction bundles, and quick client deliveries.
              Instead of switching between multiple tools, you keep code, text, and files in one simple workflow.
            </p>
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-semibold">Frequently Asked Questions</h2>
          <p className="mt-2 text-white/65">Quick answers about sharing code and files with SyncNova.</p>

          <div className="mt-6 space-y-4">
            <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h3 className="text-lg font-semibold text-orange-300">Q1. How can I share code online instantly?</h3>
              <p className="mt-2 text-white/75">
                Open SyncNova, create a session, paste or type your code, and share the live link. Everyone who opens the link sees updates in real-time without refreshing.
              </p>
            </article>

            <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h3 className="text-lg font-semibold text-orange-300">Q2. Can I share ZIP files online with one link?</h3>
              <p className="mt-2 text-white/75">
                Yes. Upload ZIP files, documents, or images in the same room and share one URL for both text and file collaboration.
              </p>
            </article>

            <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h3 className="text-lg font-semibold text-orange-300">Q3. Do users need login to use this file sharing tool?</h3>
              <p className="mt-2 text-white/75">
                No login is required. You can start a live session instantly and collaborate in seconds.
              </p>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}
