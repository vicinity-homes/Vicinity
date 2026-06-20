import Link from 'next/link';

// Footer columns — kept here so copy edits are one file, not a hunt across pages.
const PRODUCT_LINKS = [
  { href: '/browse', label: 'Explore listings' },
  { href: '/communities', label: 'Communities' },
  { href: '/saved', label: 'Saved' },
  { href: '/login', label: 'Sign in' },
];

const COMPANY_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

const LEGAL_LINKS = [
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms of Service' },
  { href: '/fair-housing', label: 'Fair Housing' },
];

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-line bg-bg mt-16">
      <div className="max-w-7xl mx-auto px-6 pt-16 pb-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[2fr_1fr_1fr_1fr]">
          {/* Brand cell */}
          <div>
            <div className="font-serif text-3xl text-ink leading-none tracking-[-0.01em]">
              Vicinity<span className="text-ink">.</span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-[1.6] text-ink2">
              A quieter way to find a home. Real listings, real video, real neighborhoods — no
              spreadsheet, no spam.
            </p>
          </div>

          <FooterColumn title="Product" links={PRODUCT_LINKS} />
          <FooterColumn title="Company" links={COMPANY_LINKS} />
          <FooterColumn title="Legal" links={LEGAL_LINKS} />
        </div>

        <div className="mt-12 pt-6 border-t border-line flex flex-col gap-3 text-xs leading-[1.6] text-muted md:flex-row md:items-center md:justify-between">
          <div className="max-w-3xl">
            © {year} Vicinity, Inc. All rights reserved. Vicinity is a home-discovery platform, not
            a licensed real estate broker. Listing information is provided by participating agents;
            verify details with the listing agent before transacting. Equal Housing Opportunity.
          </div>
          <div className="flex gap-4 flex-wrap">
            <Link href="/privacy" className="hover:text-ink">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-ink">
              Terms
            </Link>
            <Link href="/contact" className="hover:text-ink">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: ReadonlyArray<{ href: string; label: string }>;
}) {
  return (
    <div>
      <div className="eyebrow mb-4">{title}</div>
      <ul className="space-y-2.5">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-sm text-ink hover:text-ink2 hover:underline">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
