import { defineType, defineField } from "sanity";

export const articleType = defineType({
  name: "article",
  title: "Article",
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
      name: "categorie",
      title: "Catégorie",
      type: "string",
      options: {
        list: [
          { title: "Stratégie digitale", value: "Stratégie digitale" },
          { title: "Création web", value: "Création web" },
          { title: "SEO & Référencement", value: "SEO & Référencement" },
          { title: "Design UI/UX", value: "Design UI/UX" },
          { title: "Branding", value: "Branding" },
        ],
      },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "imageCouverture",
      title: "Image de couverture",
      type: "image",
      options: { hotspot: true },
      fields: [
        defineField({
          name: "alt",
          type: "string",
          title: "Texte alternatif",
        }),
      ],
    }),
    defineField({
      name: "extrait",
      title: "Extrait (meta description SEO)",
      type: "text",
      rows: 3,
      validation: (r) => r.required().max(160),
    }),
    defineField({
      name: "contenu",
      title: "Contenu",
      type: "array",
      of: [
        {
          type: "block",
          styles: [
            { title: "Paragraphe", value: "normal" },
            { title: "Titre H2", value: "h2" },
            { title: "Titre H3", value: "h3" },
            { title: "Citation", value: "blockquote" },
          ],
          marks: {
            decorators: [
              { title: "Gras", value: "strong" },
              { title: "Italique", value: "em" },
            ],
            annotations: [
              {
                type: "object",
                name: "link",
                title: "Lien",
                fields: [
                  defineField({ name: "href", type: "string", title: "URL" }),
                ],
              },
            ],
          },
        },
        {
          type: "image",
          options: { hotspot: true },
          fields: [
            defineField({ name: "alt", type: "string", title: "Texte alternatif" }),
            defineField({ name: "caption", type: "string", title: "Légende" }),
          ],
        },
      ],
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
