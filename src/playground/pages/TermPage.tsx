import { TERMS_BY_CATEGORY, getTerm, type Term } from "../glossary/terms";
import { PageHeader, PrevNext, Section } from "../ui";

export function TermPage({ term }: { term: Term }) {
  // Same order as the sidebar: by category, then A–Z
  const index = TERMS_BY_CATEGORY.indexOf(term);
  const prev = TERMS_BY_CATEGORY[index - 1];
  const next = TERMS_BY_CATEGORY[index + 1];
  const related = (term.related ?? []).map(getTerm).filter((t): t is Term => Boolean(t));
  const Demo = term.demo;

  return (
    <>
      <PageHeader eyebrow={`Glossary · ${term.category}`} title={term.term}>
        <p>{term.summary}</p>
        {term.aka && <p className="pg-aka">Also called: {term.aka.join(", ")}</p>}
      </PageHeader>

      {term.sections?.map((s) => (
        <Section key={s.title} title={s.title}>
          <div className="pg-term-body">{s.body}</div>
        </Section>
      ))}

      {Demo && (
        <Section title="Try it">
          <Demo />
        </Section>
      )}

      {(term.usedIn || related.length > 0) && (
        <Section title="See also">
          <dl className="pg-seealso">
            {term.usedIn && (
              <div>
                <dt>Used in this design system</dt>
                <dd>
                  {term.usedIn.map((u) => (
                    <a key={u.href + u.label} href={u.href} className="pg-chip">
                      {u.label}
                    </a>
                  ))}
                </dd>
              </div>
            )}
            {related.length > 0 && (
              <div>
                <dt>Related terms</dt>
                <dd>
                  {related.map((r) => (
                    <a key={r.id} href={`#/glossary/${r.id}`} className="pg-chip">
                      {r.term}
                    </a>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        </Section>
      )}

      <PrevNext
        label="Glossary"
        prev={prev && { href: `#/glossary/${prev.id}`, title: prev.term }}
        next={next && { href: `#/glossary/${next.id}`, title: next.term }}
      />
    </>
  );
}
