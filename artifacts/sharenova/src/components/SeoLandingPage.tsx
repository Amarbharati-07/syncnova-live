import { ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import { nanoid } from "nanoid";

type SeoLandingPageProps = {
  title: string;
  subtitle: string;
  keyword: string;
  sections: Array<{ heading: string; body: string }>;
  faqs: Array<{ q: string; a: string }>;
};

export function SeoLandingPage({ title, subtitle, keyword, sections, faqs }: SeoLandingPageProps) {
  const [, setLocation] = useLocation();

  const createSession = () => {
    const id = nanoid(6);
    setLocation(`/share/${id}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <main className="mx-auto max-w-5xl px-6 pb-20 pt-12">
        <h1 className="text-4xl font-bold leading-tight md:text-6xl">{title}</h1>
        <p className="mt-4 max-w-3xl text-lg text-white/75">{subtitle}</p>
        <p className="mt-2 text-sm text-orange-300">Primary keyword: {keyword}</p>

        <div className="mt-8">
          <button
            onClick={createSession}
            className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-6 py-3 font-semibold hover:bg-orange-400"
          >
            Start Sharing Now
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <section className="mt-12 space-y-8">
          {sections.map((section) => (
            <div key={section.heading}>
              <h2 className="text-2xl font-semibold">{section.heading}</h2>
              <p className="mt-3 text-white/75">{section.body}</p>
            </div>
          ))}
        </section>

        <section className="mt-12 space-y-5">
          <h2 className="text-2xl font-semibold">FAQ</h2>
          {faqs.map((faq) => (
            <div key={faq.q}>
              <h3 className="text-xl font-semibold">{faq.q}</h3>
              <p className="mt-2 text-white/75">{faq.a}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
