import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-graphite">Anmeldung</h1>
        <p className="mt-2 max-w-xl text-sm text-steel">
          Mit einem Supabase Benutzerkonto anmelden, bevor Auftraege bearbeitet werden.
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
