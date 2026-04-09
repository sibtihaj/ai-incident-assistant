import { Suspense } from "react";

import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-[80vh] flex items-center justify-center bg-slate-50 px-4 py-16">
      <Suspense
        fallback={
          <div className="w-full max-w-md rounded-sm border border-slate-200 bg-white p-8 shadow-sm text-sm text-slate-600 font-outfit">
            Loading…
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
