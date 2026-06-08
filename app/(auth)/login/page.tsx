import { LoginForm } from './login-form';

type SearchParams = { redirect?: string; error?: string };

export default function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const redirect = searchParams.redirect ?? '/dashboard';
  const showAuthError = searchParams.error === 'auth_failed';
  return (
    <div className="space-y-6">
      <header className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Vicinity</h1>
        <p className="text-sm text-neutral-500">Agent sign in</p>
      </header>
      {showAuthError ? (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-center text-sm text-red-700"
        >
          That sign-in link was invalid or expired. Try again.
        </p>
      ) : null}
      <LoginForm redirect={redirect} />
    </div>
  );
}
