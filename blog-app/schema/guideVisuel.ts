import { defineType, defineField } from "sanity";

export const guideVisuelType = defineType({
  name: "guideVisuel",
  title: "Guide visuel",
  type: "document",
  fields: [
    defineField({
      name: "titre",
      title: "Titre",
      type: "string",
      validation: (r) => r.required().max(100),
    }),
    defineField({
      name: "slug",
      title: "Slug (URL)",
      type: "slug",
      options: { source: "titre", maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "date",
      title: "Date de publication",
      type: "date",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "imageCouverture",
      title: "Image de couverture",
      type: "image",
      options: { hotspot: true },
      validation: (r) => r.required(),
      fields: [
        defineField({ name: "alt", type: "string", title: "Texte alternatif" }),
      ],
    }),
    defineField({
      name: "description",
      title: "Description courte (meta description SEO)",
      type: "text",
      rows: 3,
      validation: (r) => r.required().max(160),
    }),
    defineField({
      name: "categorie",
      title: "Catégorie",
      type: "string",
      initialValue: "Guide visuel",
      readOnly: true,
      validation: (r) => r.required(),
    }),
    defineField({
      name: "embedGamma",
      title: "Code d'intégration Gamma (iframe)",
      description:
        "Collez ici le code d'embed fourni par Gamma (la balise <iframe>...). Seule l'URL src est extraite et utilisée, le reste du balisage est ignoré par sécurité.",
      type: "text",
      rows: 6,
      validation: (r) => r.required(),
    }),
  ],
  orderings: [
    {
      title: "Date (récente)",
      name: "dateDesc",
      by: [{ field: "date", direction: "desc" }],
    },
  ],
  preview: {
    select: {
      title: "titre",
      subtitle: "date",
      media: "imageCouverture",
    },
  },
});
