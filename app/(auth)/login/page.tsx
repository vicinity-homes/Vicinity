import { LoginForm } from './login-form';

type SearchParams = { redirect?: string };

export default function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const redirect = searchParams.redirect ?? '/dashboard';
  return (
    <div className="space-y-6">
      <header className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Vicinity</h1>
        <p className="text-sm text-neutral-500">Agent sign in</p>
      </header>
      <LoginForm redirect={redirect} />
    </div>
  );
}
