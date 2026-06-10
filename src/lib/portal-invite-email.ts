type SendPortalInviteParams = {
  toEmail: string;
  toNombre: string;
  slug: string;
  activationUrl: string;
  portalUrl: string;
};

function buildEmailHtml({
  toNombre,
  activationUrl,
  logoUrl,
}: {
  toNombre: string;
  activationUrl: string;
  logoUrl: string;
}): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invitación al Portal de Clientes - meteoro.</title>
    <style>
        body { margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4; color: #333333; }
        .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        .header { background-color: #000000; padding: 35px 20px; text-align: center; }
        .header img { max-width: 220px; height: auto; display: block; margin: 0 auto; }
        .content { padding: 40px 30px; }
        .content h1 { color: #000000; font-size: 24px; margin-top: 0; margin-bottom: 20px; letter-spacing: -0.5px; }
        .content p { font-size: 16px; line-height: 1.6; margin-bottom: 20px; color: #444444; }
        .features { background-color: #f9f9f9; border-left: 4px solid #000000; padding: 20px; margin: 30px 0; }
        .features ul { margin: 0; padding-left: 20px; color: #333333; }
        .features li { margin-bottom: 12px; font-size: 15px; }
        .button-container { text-align: center; margin: 40px 0; }
        .button { background-color: #000000; color: #ffffff !important; text-decoration: none; padding: 16px 32px; font-size: 16px; font-weight: bold; border-radius: 4px; display: inline-block; letter-spacing: 0.5px; }
        .footer { background-color: #eeeeee; padding: 25px 20px; text-align: center; font-size: 12px; color: #777777; line-height: 1.5; }
        .footer a { color: #000000; text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="${logoUrl}" alt="meteoro.">
        </div>
        <div class="content">
            <h1>Bienvenido a tu nuevo espacio</h1>
            <p>Hola <strong>${toNombre}</strong>,</p>
            <p>En <strong>meteoro.</strong> trabajamos constantemente para mejorar tu experiencia. Por eso, nos emociona invitarte a nuestro nuevo <strong>Portal de Clientes</strong>, una plataforma diseñada para brindarte mayor control, agilidad y transparencia sobre tus servicios.</p>
            <div class="features">
                <p style="margin-top: 0; font-weight: bold; color: #000000;">Desde tu portal ahora podrás:</p>
                <ul>
                    <li>Visualizar el estado de tu proyecto en tiempo real.</li>
                    <li>Ver las tareas completadas y las que están en progreso.</li>
                    <li>Seguir el porcentaje de avance del desarrollo.</li>
                    <li>Acceder al timeline con todos los hitos y actualizaciones.</li>
                </ul>
            </div>
            <p>Para comenzar, hacé clic en el siguiente enlace para activar tu cuenta y configurar tu contraseña.</p>
            <div class="button-container">
                <a href="${activationUrl}" class="button">Activar mi cuenta</a>
            </div>
            <p style="font-size: 14px; color: #666666;">
                Si tenés problemas con el botón, copiá y pegá el siguiente enlace en tu navegador:<br>
                <a href="${activationUrl}" style="color: #000000; word-break: break-all;">${activationUrl}</a>
            </p>
            <p>Si tenés alguna pregunta o necesitás ayuda para acceder, no dudes en responder a este correo.</p>
            <p>Saludos,<br><strong>El equipo de meteoro.</strong></p>
        </div>
        <div class="footer">
            <p>&copy; 2026 meteoro. Todos los derechos reservados.</p>
            <p>Recibiste este correo porque sos un cliente registrado de meteoro.</p>
        </div>
    </div>
</body>
</html>`;
}

export async function sendPortalInvite({
  toEmail,
  toNombre,
  activationUrl,
  portalUrl,
}: SendPortalInviteParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY no configurada.");

  const logoUrl = `${portalUrl}/brand/meteoro-negativo.png`;
  const html = buildEmailHtml({ toNombre, activationUrl, logoUrl });

  const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: `meteoro. <${fromEmail}>`,
      to: [toEmail],
      subject: "Invitación al Portal de Clientes — meteoro.",
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error: ${err}`);
  }
}
