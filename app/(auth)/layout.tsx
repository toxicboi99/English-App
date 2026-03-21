import Image from "next/image";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-10 lg:px-8">
      <div className="relative grid w-full gap-8 lg:grid-cols-[1fr_1.1fr]">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-32 -left-32 h-[300px] w-[300px] rounded-full bg-amber-300/30 blur-[100px]" />
          <div className="absolute right-0 bottom-0 h-[320px] w-[320px] rounded-full bg-cyan-300/30 blur-[110px]" />
        </div>

        <div className="hidden flex-col justify-between rounded-[2.5rem] border border-white/70 bg-slate-950 p-10 text-amber-100 shadow-[0_24px_80px_rgba(15,23,42,0.18)] lg:flex">
          <div>
            <p className="mt-5 max-w-md text-base leading-8 text-slate-300">SpeakUp</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-1000 sm:text-4xl">
              Verified speaking practice for real live debate rooms.
            </h1>
            <p className="mt-5 max-w-md text-base leading-8 text-slate-300">
              Register with email verification, sign in securely with Clerk, and
              move from solo practice into production-ready live conversations.
            </p>
          </div>

          <div className="relative mt-10 flex items-center justify-center">
            <div className="absolute h-48 w-48 rounded-full bg-gradient-to-br from-amber-300/25 to-cyan-300/25 blur-3xl" />
            <Image
              alt="SpeakUp learner illustration"
              className="relative z-10 max-h-[28rem] w-auto drop-shadow-[0_20px_30px_rgba(15,23,42,0.3)]"
              height={560}
              priority
              src="/reg.jpg"
              width={420}
            />
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm leading-7 text-slate-300">
              Email-code verification protects account creation, Clerk handles
              password recovery through the inbox, and LiveKit powers the online
              debate-room experience when credentials are configured.
            </p>
          </div>
        </div>

        <div className="relative rounded-[2.5rem] border border-white/80 bg-white/85 p-8 shadow-[0_10px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl md:p-10">
          <div className="pointer-events-none absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-white/60 to-transparent opacity-70" />
          <div className="relative z-10">{children}</div>
        </div>
      </div>
    </main>
  );
}
