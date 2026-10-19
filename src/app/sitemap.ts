import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { getDesignIndex, publicDesignHref } from "@/lib/public-designs";
import { siteUrl } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const base = siteUrl();
  const index = await getDesignIndex().catch(() => []);
  const designs = index.flatMap((l) =>
    l.grades.flatMap((g) =>
      g.subjects
        .filter((s) => s.ready)
        .map((s) => ({
          url: `${base}${publicDesignHref(g.name, s.name)}`,
          changeFrequency: "monthly" as const,
          priority: 0.7,
        })),
    ),
  );
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/designs`, changeFrequency: "weekly", priority: 0.9 },
    ...designs,
  ];
}
