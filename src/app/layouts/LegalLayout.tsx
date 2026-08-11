/**
 * The shell for the privacy policy and terms pages.
 *
 * Same responsive contract as `AuthLayout`: single column below `md`, two at
 * `md` and up, with the decorative column dropped rather than shrunk on phones.
 * Colours are palette tokens, not `border-black` / `bg-white` / `text-white`.
 *
 * The text column previously used `absolute top-18 h-full overflow-y-auto`
 * inside a viewport-height box. That pins the scroller to a height taller than
 * its own container, so the last section of both documents was unreachable on a
 * short window and the whole thing was unreadable on a phone. Here the page
 * itself scrolls at small sizes and only the text column scrolls independently
 * at `md` and up, where the two-column frame actually needs it.
 */
const LegalLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="bg-green-background min-h-screen p-4 sm:p-8 md:p-12">
      <div className="grid grid-cols-1 md:grid-cols-2 md:h-[calc(100vh-96px)] border-2 border-border shadow-shadow">
        {/* Decorative only. */}
        <div className="relative center bg-main-background border-border md:border-r-2 hidden md:flex">
          <div className="-top-[100px] relative">
            <img
              src="/images/students.png"
              alt=""
              aria-hidden="true"
              className="mx-auto w-[300px]"
            />
            <div className="text-5xl text-main-foreground font-bold">Class Kudos</div>
          </div>
          <div className="text-main-foreground text-sm absolute bottom-0 left-0 right-0 p-10">
            &ldquo;Easy Class Rewards &amp; Store&rdquo;
          </div>
        </div>

        <div className="bg-secondary-background relative flex flex-col md:overflow-hidden">
          <div className="flex justify-end p-6 md:p-10 shrink-0">
            <a
              href="/"
              className="font-display font-bold text-foreground text-sm underline underline-offset-8 hover:decoration-primary"
            >
              Back to Login
            </a>
          </div>
          {/* Independent scroll only where the frame is height-constrained. */}
          <div className="md:flex-1 md:overflow-y-auto px-6 md:px-10 pb-10">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export { LegalLayout };
