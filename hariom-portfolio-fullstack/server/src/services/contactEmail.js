import nodemailer from 'nodemailer';

const notConfigured = { admin: 'not_configured', visitor: 'not_configured' };

function logDeliveryFailure(kind, error) {
  console.error('Contact email delivery failed:', {
    recipient: kind,
    name: error.name,
    code: error.code
  });
}

export async function sendContactNotifications(query) {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS, CONTACT_RECEIVER } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !CONTACT_RECEIVER) return notConfigured;

  const port = Number(process.env.SMTP_PORT || 587);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error('Contact email delivery is unavailable: SMTP_PORT is invalid.');
    return { admin: 'failed', visitor: 'failed' };
  }

  let transporter;
  try {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      disableFileAccess: true,
      disableUrlAccess: true,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000
    });
  } catch (error) {
    logDeliveryFailure('configuration', error);
    return { admin: 'failed', visitor: 'failed' };
  }

  const messages = [
    {
      kind: 'admin',
      options: {
        from: SMTP_USER,
        to: CONTACT_RECEIVER,
        replyTo: query.email,
        subject: `Portfolio contact: ${query.subject}`,
        text: `From: ${query.name} <${query.email}>\nSubject: ${query.subject}\n\n${query.message}`
      }
    },
    {
      kind: 'visitor',
      options: {
        from: SMTP_USER,
        to: query.email,
        subject: 'Thanks for contacting Hariom',
        text: `Hi ${query.name},\n\nYour message has been received. Thank you for getting in touch.\n\nHariom Tiwari`
      }
    }
  ];

  try {
    const results = await Promise.allSettled(messages.map(({ options }) => transporter.sendMail(options)));
    return Object.fromEntries(results.map((result, index) => {
      const kind = messages[index].kind;
      if (result.status === 'fulfilled') return [kind, 'sent'];
      logDeliveryFailure(kind, result.reason);
      return [kind, 'failed'];
    }));
  } finally {
    transporter.close();
  }
}
