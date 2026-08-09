/**
 * FOUNDATION STUB — the shell every placeholder page renders.
 *
 * Feature agents: delete the <Placeholder /> call from your page and render the
 * real UI. You do NOT need to keep this component; it exists only so the app
 * compiles and boots before any feature work has landed.
 */
export const Placeholder = ({
  title,
  owner,
  children,
}: {
  title: string;
  owner: string;
  children?: React.ReactNode;
}) => (
  <main className="mx-auto max-w-3xl p-8">
    <h1 className="text-2xl font-bold">{title}</h1>
    <p className="mt-2 text-sm opacity-70">
      Placeholder page. Route wiring is final; the body is owned by the{" "}
      <strong>{owner}</strong> agent.
    </p>
    {children ? <div className="mt-6">{children}</div> : null}
  </main>
);
