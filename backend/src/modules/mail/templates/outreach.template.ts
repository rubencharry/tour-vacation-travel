export interface OutreachData {
  name: string;
  planTitle?: string;
}

export function outreachTemplate(data: OutreachData): {
  subject: string;
  html: string;
} {
  const firstName = data.name.trim().split(' ')[0];
  const planLine = data.planTitle
    ? `en el plan <strong>${data.planTitle}</strong>`
    : 'en nuestros planes de viaje';

  return {
    subject: data.planTitle
      ? `Sobre tu interés en ${data.planTitle} — Tour Vacation`
      : 'Queremos ayudarte a viajar — Tour Vacation',
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
          <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px">¡Hola, ${firstName}!</h2>
          <p style="margin:0 0 16px;color:#444;line-height:1.6">
            Vi tu interés ${planLine} y quiero ayudarte a armar el viaje perfecto.
          </p>
          <p style="margin:0 0 16px;color:#444;line-height:1.6">
            Contame qué fechas tenés en mente y te armo una propuesta a tu medida, sin compromiso.
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
