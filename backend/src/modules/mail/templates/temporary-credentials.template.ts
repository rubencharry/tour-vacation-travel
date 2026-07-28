export interface TemporaryCredentialsData {
  name: string;
  email: string;
  temporaryPassword: string;
  loginUrl: string;
}

export function temporaryCredentialsTemplate(data: TemporaryCredentialsData): {
  subject: string;
  html: string;
} {
  return {
    subject: 'Tu acceso al panel de Tour Vacation',
    html: `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:600px">
        <tr><td style="background:#1a1a2e;padding:32px 40px">
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700">Tour Vacation</h1>
        </td></tr>
        <tr><td style="padding:40px">
          <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px">¡Hola, ${data.name}!</h2>
          <p style="margin:0 0 16px;color:#444;line-height:1.6">
            Se creó tu acceso al panel administrativo de Tour Vacation. Estas son tus credenciales de ingreso:
          </p>
          <table cellpadding="0" cellspacing="0" style="width:100%;background:#f5f5f5;border-radius:6px;margin:0 0 24px">
            <tr><td style="padding:16px 20px">
              <p style="margin:0 0 8px;color:#444;font-size:14px"><strong>Usuario:</strong> ${data.email}</p>
              <p style="margin:0;color:#444;font-size:14px"><strong>Clave temporal:</strong> <code style="background:#e8e8e8;padding:2px 6px;border-radius:4px;font-size:15px">${data.temporaryPassword}</code></p>
            </td></tr>
          </table>
          <p style="margin:0 0 24px;color:#444;line-height:1.6">
            Por seguridad, esta clave es temporal: al iniciar sesión por primera vez el sistema te va a pedir que definas una nueva.
          </p>
          <p style="margin:0 0 24px">
            <a href="${data.loginUrl}" style="display:inline-block;background:#1a1a2e;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px;font-weight:600">Ingresar al panel</a>
          </p>
          <p style="margin:32px 0 0;color:#888;font-size:13px">— El equipo de Tour Vacation</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}
