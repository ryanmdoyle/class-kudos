/**
 * The shell for the login / password-reset pages.
 *
 * Responsive contract: SINGLE COLUMN below `md`, two columns at `md` and up.
 * This page is the first thing a teacher or a child sees, and a good share of
 * them arrive on a phone. The previous hard `grid-cols-[40%_60%]` with
 * `min-w-screen` forced the decorative image column to render at every
 * breakpoint and pushed the form off the side of a phone screen.
 *
 * The illustration is `hidden md:flex` rather than merely shrunk — it carries no
 * information, so on a small screen it should cost nothing at all. The wordmark
 * it contains is reproduced in the mobile header so the branding survives.
 *
 * Colours come from palette TOKENS (`border-border`, `bg-secondary-background`,
 * `text-main-foreground`), not from literal `border-black` / `bg-white`. The
 * rendered output is identical today, but the literals were the only place in
 * the tree that bypassed the palette and they would not invert if `.dark` is
 * ever switched on.
 */
const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="bg-green-background min-h-screen p-4 sm:p-8 md:p-12">
      <div className="grid grid-cols-1 md:grid-cols-[40%_60%] min-h-[calc(100vh-32px)] sm:min-h-[calc(100vh-64px)] md:min-h-[calc(100vh-96px)] border-2 border-border shadow-shadow">
        {/* Decorative only — no information lives here, so it is dropped on phones. */}
        <div className="relative center bg-main-background border-border border-r-2 hidden md:flex">
          <div className="-top-[100px] relative max-w-4/5">
            <img
              src="/images/students.png"
              alt=""
              aria-hidden="true"
              className="mx-auto max-w-4/5 h-auto"
            />
            <div className="text-5xl text-main-foreground font-bold text-center">
              Class Kudos
            </div>
          </div>
        </div>

        <div className="center bg-secondary-background relative">
          <div className="w-full">
            {/* The wordmark the hidden column would otherwise have provided. */}
            <div className="md:hidden text-center pt-8 pb-2">
              <span className="text-3xl font-bold">Class Kudos</span>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export { AuthLayout };
