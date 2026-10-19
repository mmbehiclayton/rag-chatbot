import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/designs"],
      disallow: ["/dashboard", "/api", "/onboarding", "/invite"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
