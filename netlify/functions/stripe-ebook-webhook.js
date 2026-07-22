const Stripe = require('stripe');
const { Resend } = require('resend');
const { notifyError } = require('./utils/notify-error');

const DELIVERY_FROM = 'contact@alcalspark.com';

/**
 * Distingue un achat ebook d'un abonnement Estime traite sur le meme
 * compte Stripe.
 *
 * Methode recommandee : sur le Payment Link de l'ebook (Stripe
 * Dashboard > Payment Links > votre lien > Avance > Metadonnees),
 * ajouter la cle "product" avec la valeur "ebook". Cette metadonnee
 * est automatiquement copiee sur chaque Checkout Session issue de ce
 * lien, donc disponible ici via session.metadata.
 *
 * Alternative optionnelle : si la variable STRIPE_EBOOK_PAYMENT_LINK_ID
 * est configuree avec l'ID du Payment Link (visible dans l'URL de sa
 * page Dashboard, au format plink_xxx), on compare aussi session.payment_link.
 */
function isEbookPurchase(session) {
  if (session.metadata && session.metadata.product === 'ebook') return true;
  const linkId = process.env.STRIPE_EBOOK_PAYMENT_LINK_ID;
  if (linkId && session.payment_link === linkId) return true;
  return false;
}

function buildDeliveryEmailHtml(downloadUrl) {
  return `
    <p>Bonjour,</p>
    <p>Merci pour votre achat ! Votre ebook <strong>Lancer son SaaS en 3 semaines avec Claude Code</strong> est pret a etre telecharge.</p>
    <p><a href="${downloadUrl}">Telecharger l'ebook (PDF)</a></p>
    <p>Un souci pour acceder au fichier ? Ecrivez a <a href="mailto:spark@alcalspark.com">spark@alcalspark.com</a>, nous vous le renverrons directement.</p>
    <p>Bonne lecture,<br />L'equipe AlcalSpark</p>
  `;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const signature = event.headers['stripe-signature'] || event.headers['Stripe-Signature'];
  const webhookSecret = process.env.STRIPE_EBOOK_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    console.error('[stripe-ebook-webhook] Signature ou secret de webhook manquant.');
    return { statusCode: 400, body: 'Missing Stripe signature or webhook secret' };
  }

  // La verification de signature est une operation locale (HMAC), elle
  // n'appelle jamais l'API Stripe. Aucune cle secrete API n'est donc
  // necessaire ici, seul le secret de webhook dedie a cet endpoint compte.
  const stripe = new Stripe('sk_placeholder_signature_verification_only');

  // Netlify encode parfois le corps brut en base64 selon le
  // content-type recu : Stripe exige le corps brut exact (non
  // reserialise) pour valider la signature HMAC.
  const rawBody = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body;

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('[stripe-ebook-webhook] Signature Stripe invalide:', err.message);
    return { statusCode: 400, body: `Webhook signature verification failed: ${err.message}` };
  }

  if (stripeEvent.type !== 'checkout.session.completed') {
    // Pas notre evenement : on repond 200 pour ne pas declencher de
    // retries Stripe inutiles sur un event qu'on ignore volontairement.
    return { statusCode: 200, body: 'Ignored: not a checkout.session.completed event' };
  }

  const session = stripeEvent.data.object;

  if (!isEbookPurchase(session)) {
    return { statusCode: 200, body: 'Ignored: not an ebook purchase' };
  }

  const buyerEmail =
    (session.customer_details && session.customer_details.email) ||
    session.customer_email ||
    null;

  if (!buyerEmail) {
    await notifyError({
      subject: 'Ebook achete mais email acheteur introuvable',
      context: `Session Stripe ${session.id}, aucun email exploitable dans customer_details ni customer_email.`,
    });
    return { statusCode: 200, body: 'Received (missing buyer email, alert sent)' };
  }

  // 1. Recupere l'URL de telechargement Google Drive (statique).
  const downloadUrl = process.env.EBOOK_DOWNLOAD_URL;
  if (!downloadUrl) {
    await notifyError({
      subject: "URL de telechargement ebook manquante (EBOOK_DOWNLOAD_URL)",
      context: `Session Stripe ${session.id}. Variable EBOOK_DOWNLOAD_URL non configuree.`,
      buyerEmail,
    });
    return { statusCode: 200, body: 'Received (missing EBOOK_DOWNLOAD_URL, alert sent)' };
  }

  // 2. Envoie l'email de livraison a l'acheteur via Resend.
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY manquante');
    }
    const resend = new Resend(resendApiKey);
    const { error } = await resend.emails.send({
      from: DELIVERY_FROM,
      to: buyerEmail,
      subject: 'Votre ebook est prêt à télécharger',
      html: buildDeliveryEmailHtml(downloadUrl),
    });
    if (error) {
      throw new Error(error.message || 'Resend a renvoye une erreur');
    }
  } catch (err) {
    await notifyError({
      subject: "Echec envoi de l'email de livraison ebook",
      context: `Session Stripe ${session.id}. Email non envoye (livrer manuellement). Erreur : ${err.message}. URL de telechargement : ${downloadUrl}`,
      buyerEmail,
    });
    return { statusCode: 200, body: 'Received (email send failed, alert sent)' };
  }

  return { statusCode: 200, body: 'Ebook delivered' };
};
