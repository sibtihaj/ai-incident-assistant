import Link from "next/link";

const cards = [
  {
    title: "Prompt Runtime",
    href: "/settings/prompt",
    description:
      "Tune history trimming, tool-step ceilings, and conversational/actionable regex patterns.",
  },
  {
    title: "Context",
    href: "/settings/context",
    description:
      "Edit system instructions, abbreviations, and field guidance used for prompt assembly.",
  },
];

export default function SettingsIndexPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-14 lg:px-8">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500">
        Admin / Settings
      </p>
      <h1 className="mt-2 font-outfit text-4xl font-medium tracking-tight text-slate-950">
        Prompt And Context Controls
      </h1>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
        Update runtime prompt behavior and static context without changing source code. These
        controls are disabled unless <code>ALLOW_PROMPT_EDITOR=true</code>.
      </p>

      <section className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group rounded-sm border border-slate-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_22px_40px_-32px_rgb(15_23_42_/_0.5)]"
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
              {card.title}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{card.description}</p>
            <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-700">
              Open editor
            </p>
          </Link>
        ))}
      </section>
    </main>
  );
}
