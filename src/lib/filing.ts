// Which term a document is filed under, so a class page can show one term at a time.
// New documents store their term and year; older ones are filed by the date they were made.

import {
  DEFAULT_TERMS,
  pickTerm,
  type TermDates,
  termNumber,
  todayInKenya,
} from "@/lib/term-pack";
import { getTeacherTerms } from "@/lib/term-pack-data";

export type Filing = { term: string; year: number };

/** "Term 2 2026": the key and label of a filing. */
export function filingLabel(f: Filing) {
  return `${f.term} ${f.year}`;
}

/** The teacher's terms (school calendar plus their own changes), else the built-in dates. */
function calendar(terms: TermDates[]) {
  return terms.length ? terms : DEFAULT_TERMS;
}

/**
 * The term a document made on `date` belongs to: with a term number, the year that term
 * is open or next opens; without, the term open then, else the next to open (holiday
 * preparation), else the latest.
 */
export function filingOn(
  terms: TermDates[],
  date: string,
  n?: number | null,
): Filing {
  const all = calendar(terms);
  const t = pickTerm(n ? all.filter((x) => x.term === n) : all, date);
  return {
    term: `Term ${n ?? t?.term ?? 1}`,
    year: t?.year ?? Number(date.slice(0, 4)),
  };
}

/** Where a new document is filed: the term chosen ("Term 2"), else the term in progress. */
export async function filingFor(
  teacherId: string,
  term?: string | null,
): Promise<Filing> {
  const terms = await getTeacherTerms(teacherId);
  return filingOn(terms, todayInKenya(), term ? termNumber(term) : null);
}

type Dated = {
  term?: string | null;
  year?: number | null;
  createdAt: Date;
};

/** The filing of a saved document: its own term and year, else its scheme's, else by date. */
export function filingOf(
  terms: TermDates[],
  doc: Dated & { scheme?: Dated | null },
): Filing {
  const own = doc.term && termNumber(doc.term) ? doc : (doc.scheme ?? doc);
  const n = own.term ? termNumber(own.term) : null;
  const filed = filingOn(terms, todayInKenya(own.createdAt), n);
  return own.year && n ? { ...filed, year: own.year } : filed;
}
