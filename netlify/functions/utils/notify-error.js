const { Resend } = require('resend');

const ALERT_TO = 'spark@alcalspark.com';
const ALERT_FROM = 'contact@alcalspark.com';

/**
 * Alerte l'equipe quand une livraison automatique echoue, pour
 * permettre une livraison manuelle. Ne jette jamais : un echec
 * d'alerte ne doit pas faire planter la fonction appelante, il est
 * seulement trace dans les logs Netlify en dernier recours.
 */
async function notifyError({ subject, context, buyerEmail }) {
  const lines = [
    `Contexte : ${context}`,
    buyerEmail ? `Email acheteur : ${buyerEmail}` : 'Email acheteur : inconnu',
    `Horodatage : ${new Date().toISOString()}`,
  ];
  const text = lines.join('\n');

  if (!process.env.RESEND_API_KEY) {
    console.error('[notify-error] RESEND_API_KEY manquante, alerte non envoyee.', subject, text);
    return;
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: ALERT_FROM,
      to: ALERT_TO,
      subject: `[Alerte livraison] ${subject}`,
      text,
    });
    if (error) {
      console.error('[notify-error] Resend a renvoye une erreur:', error, subject, text);
    }
  } catch (err) {
    console.error('[notify-error] Echec envoi alerte:', err, subject, text);
  }
}

module.exports = { notifyError };
