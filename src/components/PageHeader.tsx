/**
 * Shared header for the content pages (Learn, FAQ, About).
 *
 * The eyebrow / title / lede rhythm is the same on every one, so it lives here
 * rather than being re-typed per page — and the single <h1> per page stays an
 * obvious, enforced part of the shape.
 */
export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="border-b border-border-subtle pb-9">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-3.5 font-display text-3xl font-bold sm:text-4xl">{title}</h1>
      {children && (
        <p className="mt-5 max-w-2xl text-pretty text-lg leading-relaxed text-muted">{children}</p>
      )}
    </header>
  );
}
