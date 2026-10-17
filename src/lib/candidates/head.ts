export const candidateHead = (title: string, description: string) => ({
  meta: [
    { title: `${title} — CareerOS` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} — CareerOS` },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ],
});
