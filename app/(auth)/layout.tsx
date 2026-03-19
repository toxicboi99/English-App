export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-10 lg:px-8">
      <div className="relative grid w-full gap-8 lg:grid-cols-[1fr_1.1fr]">

  {/* 🌈 LIGHT GLOW BACKGROUND */}
  <div className="pointer-events-none absolute inset-0 -z-10">
    <div className="absolute -top-32 -left-32 h-[300px] w-[300px] rounded-full bg-purple-300/40 blur-[100px]" />
    <div className="absolute bottom-0 right-0 h-[300px] w-[300px] rounded-full bg-blue-300/40 blur-[100px]" />
  </div>

  {/* 🔥 LEFT PANEL (UPGRADED) */}
  <div className="hidden flex-col justify-between rounded-[2.5rem] border border-gray-200 bg-white/70 p-10 backdrop-blur-xl transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_20px_60px_rgba(0,0,0,0.1)] lg:flex">

    <div>
      <p className="text-xs uppercase tracking-[0.3em] text-gray-500">
        SpeakUp
      </p>

      <h1 className="mt-6 text-5xl font-bold leading-tight text-gray-900">
        Build fluent English
        <span className="block bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
          in public.
        </span>
      </h1>

      <p className="mt-5 max-w-md text-base leading-8 text-gray-600">
        Practice with video, keep your language growth visible, and stay
        motivated through a social learning loop.
      </p>
    </div>
{/* 🧍‍♂️ 3D CHARACTER */}
<div className="relative mt-10 flex items-center justify-center">
  
  {/* Glow behind character */}
  <div className="absolute h-40 w-40 rounded-full bg-gradient-to-br from-purple-300/40 to-blue-300/40 blur-3xl" />

  {/* Character Image */}
  <img
    src="/reg.jpg"   // 👉 put your image in public folder
    alt="3D Character"
    className="relative z-10 h-150 w-auto drop-shadow-[0_20px_30px_rgba(0,0,0,0.15)] transition duration-500 hover:scale-110 hover:-translate-y-2"
  />
</div>
    {/* 💎 GLASS CARD */}
    <div className="mt-10 rounded-3xl border border-gray-200 bg-white/60 p-6 backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-lg">
      <p className="text-sm text-gray-600">
        🚀 SpeakUp combines guided speaking prompts, embedded YouTube playback,
        social feedback, debate rooms, dictionaries, and optional AI coaching.
      </p>
    </div>
  </div>

  {/* 🔥 RIGHT PANEL (FORM AREA) */}
  <div className="relative rounded-[2.5rem] border border-gray-200 bg-white/80 p-8 backdrop-blur-xl md:p-10 shadow-[0_10px_40px_rgba(0,0,0,0.08)] transition-all duration-500 hover:shadow-[0_20px_60px_rgba(0,0,0,0.12)]">

    {/* INNER LIGHT EFFECT */}
    <div className="pointer-events-none absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-white/60 to-transparent opacity-60" />

    <div className="relative z-10">
      {children}
    </div>
  </div>

</div>
    </main>
  );
}
