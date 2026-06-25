export interface PromotionData {
  heading: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
}

export function promotionTemplate(data: PromotionData): {
  subject: string;
  html: string;
} {
  const ctaBlock =
    data.ctaText && data.ctaUrl
      ? `<tr><td style="padding:24px 40px 0">
          <a href="${data.ctaUrl}"
             style="display:inline-block;background:#e63946;color:#ffffff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:700;font-size:15px">
            ${data.ctaText}
          </a>
        </td></tr>`
      : '';

  return {
    subject: data.heading,
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
        <tr><td style="padding:40px 40px 16px">
          <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:22px">${data.heading}</h2>
          <div style="color:#444;line-height:1.7;font-size:15px">${data.body}</div>
        </td></tr>
        ${ctaBlock}
        <tr><td style="padding:32px 40px">
          <p style="margin:0;color:#aaa;font-size:12px;line-height:1.5">
            Recibís este correo porque consultaste sobre alguno de nuestros planes.<br>
            — Tour Vacation
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}
