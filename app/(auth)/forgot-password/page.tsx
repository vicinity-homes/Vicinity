import { ForgotPasswordForm } from './forgot-password-form';

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Vicinity</h1>
        <p className="text-sm text-neutral-500">Reset your password</p>
      </header>
      <ForgotPasswordForm />
      <p className="text-center text-sm text-cream/60">
        Remembered it?{' '}
        <a href="/login" className="text-gold underline hover:text-gold/80">
          Sign in
        </a>
      </p>
    </div>
  );
}
