import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen flex items-center justify-center px-6 bg-bg">
      <Link
        href="/"
        aria-label="Vicinity — home"
        className="absolute top-5 left-5 font-medium uppercase transition hover:brightness-110"
        style={{
          color: '#c9a24a',
          letterSpacing: '0.32em',
          fontSize: '14px',
        }}
      >
        VICINITY
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
