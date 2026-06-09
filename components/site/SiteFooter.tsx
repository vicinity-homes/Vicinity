export function SiteFooter() {
  return (
    <footer className="border-t border-white/5 mt-16">
      <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-cream/60">
        <div className="font-serif text-xl text-cream">
          Vicinity<span className="text-gold">.</span>
        </div>
        <div className="text-center sm:text-left">
          © {new Date().getFullYear()} Vicinity. Swipe-first home discovery.
        </div>
        {/* Social icons intentionally omitted in V1 — no real Vicinity social accounts yet. */}
        {/* Add them back when href values point to real Instagram / Twitter / Facebook URLs. */}
        <div aria-hidden className="hidden sm:block w-32" />
      </div>
    </footer>
  );
}
