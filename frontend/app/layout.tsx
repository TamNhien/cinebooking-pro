import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "@/components/Header";
import SiteFooter from "@/components/SiteFooter";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import { LanguageProvider } from "@/components/LanguageProvider";
import BackgroundTheme from "@/components/BackgroundTheme";
import RuntimeReadyMarker from "@/components/RuntimeReadyMarker";
import LegacyUiLocalizationBridge from "@/components/LegacyUiLocalizationBridge";
import InputModalityManager from "@/components/InputModalityManager";

export const metadata: Metadata = {
  title: "CineBooking Pro",
  description: "Hệ thống đặt vé đa rạp với PWA V52, Web Push và vé QR offline có kiểm soát",
  applicationName: "CineBooking Pro",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "CineBooking" },
  icons: {
    icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }, { url: "/icon-512.png", sizes: "512x512", type: "image/png" }],
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }]
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#080b12"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" data-cinebooking-language-ready="vi" data-cinebooking-runtime-ready="pending" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var v=localStorage.getItem("cinebooking_language");var r=(v==="vi"||v==="en")?v:"vi";document.documentElement.lang=r;document.documentElement.dataset.cinebookingLanguageReady=r;}catch(e){document.documentElement.dataset.cinebookingLanguageReady=document.documentElement.lang||"vi";}})();`,
          }}
        />
      </head>
      <body>
        <a href="#main-content" className="skip-link">Bỏ qua đến nội dung chính</a>
        <LanguageProvider>
          <RuntimeReadyMarker />
          <InputModalityManager />
          <LegacyUiLocalizationBridge />
          <BackgroundTheme />
          <ServiceWorkerRegistration />
          <Header />
          <main id="main-content" tabIndex={-1} className="app-main relative z-10 mx-auto min-h-[70vh] w-full max-w-7xl px-4 py-7 md:px-6">
            {children}
          </main>
          <SiteFooter />
        </LanguageProvider>
      </body>
    </html>
  );
}
