import Navbar from "@/app/components/layout/Navbar"
import Footer from "@/app/components/layout/Footer"
import LoaderScreen from "@/app/components/ui/LoaderScreen"
import SupportFabInit from "@/app/components/ui/SupportFabInit"
import PageTransition from "@/app/components/ui/PageTransition"
import RealtimeWatcher from "@/app/components/ui/RealtimeWatcher"
import { getProgramsCached, getSettings } from "@/app/lib/api"

export default async function MainLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Settings (logo) dan daftar program dipakai Navbar/Footer. Diambil di server
  // agar menu "Program" langsung mengikuti CMS tanpa fetch dari browser.
  const [settings, programs] = await Promise.all([
    getSettings().catch(() => []),
    getProgramsCached().catch(() => []),
  ])
  const logoUrl = settings.find((s) => s.key === 'logo')?.value || settings.find((s) => s.key === 'favicon')?.value || undefined

  return (
    <>
      <RealtimeWatcher module="companyprofile" />
      <LoaderScreen logoUrl={logoUrl} />
      <SupportFabInit />
      <Navbar programs={programs} />
      <main className="flex-1">
        <PageTransition>{children}</PageTransition>
      </main>
      <Footer programs={programs} />
    </>
  )
}
