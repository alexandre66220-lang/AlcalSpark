const WORDS_PER_MINUTE = 150;

interface PortableTextSpan {
  _type?: string;
  text?: string;
}

interface PortableTextBlock {
  _type?: string;
  children?: PortableTextSpan[];
}

/** Temps de lecture estime, calcule a partir du nombre de mots du contenu
 * (aucun champ dedie dans Sanity : la valeur reste donc toujours a jour
 * meme si l'article est modifie). */
export function readingTime(contenu: unknown[] | undefined): number {
  if (!contenu || contenu.length === 0) return 1;

  const wordCount = (contenu as PortableTextBlock[]).reduce((total, block) => {
    if (block._type !== "block" || !block.children) return total;
    const text = block.children
      .filter((span) => span._type === "span")
      .map((span) => span.text ?? "")
      .join(" ");
    return total + (text.trim() ? text.trim().split(/\s+/).length : 0);
  }, 0);

  return Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));
}
