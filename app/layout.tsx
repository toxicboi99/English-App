import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Fraunces, Manrope } from "next/font/google";
import Script from "next/script";

import "@livekit/components-styles";
import "@/app/globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "SpeakUp",
  description:
    "An AI-powered social English learning ecosystem combining video practice, social feedback, debate rooms, and language tools.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script
          id="strip-extension-hydration-attrs"
          strategy="beforeInteractive"
        >{`
          (() => {
            const stripAttrs = () => {
              const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_ELEMENT);

              while (walker.nextNode()) {
                const element = walker.currentNode;

                if (!(element instanceof Element)) {
                  continue;
                }

                if (element.hasAttribute("bis_skin_checked")) {
                  element.removeAttribute("bis_skin_checked");
                }

                if (element.hasAttribute("bis_register")) {
                  element.removeAttribute("bis_register");
                }

                for (const attributeName of element.getAttributeNames()) {
                  if (attributeName.startsWith("__processed_")) {
                    element.removeAttribute(attributeName);
                  }
                }
              }
            };

            stripAttrs();
            new MutationObserver(() => stripAttrs()).observe(document.documentElement, {
              attributes: true,
              childList: true,
              subtree: true,
            });
          })();
        `}</Script>
      </head>
      <body
        className={`${fraunces.variable} ${manrope.variable} font-[var(--font-body)] antialiased`}
        suppressHydrationWarning
      >
        <ClerkProvider signInUrl="/login" signUpUrl="/register">
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
