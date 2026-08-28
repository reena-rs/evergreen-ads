import { signIn } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900 p-8 shadow-xl">
        <h1 className="text-xl font-semibold text-neutral-50">Reena&apos;s Workout Plan</h1>
        <p className="mt-1 text-sm text-neutral-400">Sign in to your daily feed.</p>

        <form action={signIn} className="mt-6 space-y-4">
          <input type="hidden" name="next" value={next ?? "/"} />
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-400" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-50 outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-400" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-50 outline-none focus:border-emerald-500"
            />
          </div>

          {error ? (
            <p className="rounded-md bg-red-950 px-3 py-2 text-xs text-red-300">{error}</p>
          ) : null}

          <button
            type="submit"
            className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
          >
            Sign in
          </button>
        </form>

        <p className="mt-6 text-xs text-neutral-500">
          Single-user app. Create the account once in your Supabase project&apos;s Auth panel —
          see README for setup.
        </p>
      </div>
    </div>
  );
}
