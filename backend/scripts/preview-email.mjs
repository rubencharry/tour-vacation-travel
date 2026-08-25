import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SITE_URL = 'http://localhost:4200';
const LOGO_URL = `${SITE_URL}/logo-positiva-transparent.webp`;
const WHATSAPP_URL = 'https://wa.me/573127466554';
const FONTS =
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,600' +
  '&family=Barlow+Condensed:wght@600;700' +
  '&family=Nunito+Sans:wght@400;600;700&display=swap';

// Imágenes verificadas de Unsplash (Cartagena con foto colonial real)
const SAMPLE_PLANS = [
  {
    title: 'Cancún Todo Incluido',
    price: 3500000, currency: 'COP', durationDays: 7, durationNights: 6,
    departureCity: 'Bogotá', inclusions: ['Vuelos', 'Hotel 5★', 'Traslados'],
    imageUrls: ['https://images.unsplash.com/photo-1510097467424-192d713fd8b2?w=600&h=280&fit=crop&auto=format&q=80'],
  },
  {
    title: 'Cartagena Mágica',
    price: 1200000, currency: 'COP', durationDays: 4, durationNights: 3,
    departureCity: 'Bogotá', inclusions: ['Vuelos', 'Hotel', 'Traslados'],
    imageUrls: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=200&fit=crop&auto=format&q=80'],
  },
  {
    title: 'San Andrés Paraíso',
    price: 1800000, currency: 'COP', durationDays: 5, durationNights: 4,
    departureCity: 'Bogotá', inclusions: ['Vuelos', 'Hotel', 'Traslados'],
    imageUrls: ['https://images.unsplash.com/photo-1548574505-5e239809ee19?w=400&h=200&fit=crop&auto=format&q=80'],
  },
];

const C = {
  navy: '#031f41', navyMid: '#1d3557', teal: '#2bc7d0', terracotta: '#c46b48',
  cream: '#f8f5f0', textMuted: '#718096', border: '#e5e2dd', bgLight: '#f6f3ee',
  cardShadow: '0 2px 12px rgba(3,31,65,0.10)',
};
const F = {
  serif: "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
  condensed: "'Barlow Condensed', 'Arial Narrow', Arial, sans-serif",
  sans: "'Nunito Sans', Arial, Helvetica, sans-serif",
};

function inclusionPills(inclusions) {
  return inclusions.slice(0, 3).map(inc =>
    `<span style="display:inline-block;background:rgba(43,199,208,0.10);color:${C.teal};
      font-family:${F.condensed};font-size:11px;font-weight:700;letter-spacing:0.06em;
      padding:4px 10px;border-radius:20px;margin:0 5px 5px 0;border:1px solid rgba(43,199,208,0.25)">
      ✓&nbsp;${inc.toUpperCase()}
    </span>`
  ).join('');
}

function emptyStateFeatured() {
  return `<div style="width:100%;height:240px;background:linear-gradient(135deg,#0a3060 0%,${C.navyMid} 50%,#0d4f7a 100%);
    text-align:center;padding-top:90px;box-sizing:border-box">
    <p style="margin:0;font-family:${F.condensed};font-size:28px;font-weight:700;
      color:rgba(255,255,255,0.15);letter-spacing:0.1em;text-transform:uppercase">DESTINO</p>
  </div>`;
}

function emptyStateSecondary() {
  return `<div style="width:100%;height:160px;background:linear-gradient(135deg,${C.navyMid},${C.navy});
    text-align:center;padding-top:60px;box-sizing:border-box">
    <p style="margin:0;font-family:${F.condensed};font-size:22px;font-weight:700;
      color:rgba(255,255,255,0.12);letter-spacing:0.1em">DESTINO</p>
  </div>`;
}

function featuredCard(plan) {
  const img = plan.imageUrls?.[0] ?? '';
  const imgBlock = img
    ? `<img src="${img}" alt="${plan.title}" width="520" style="width:100%;height:240px;object-fit:cover;display:block">`
    : emptyStateFeatured();
  const pills = plan.inclusions?.length
    ? `<div style="margin:0 0 16px 0">${inclusionPills(plan.inclusions)}</div>` : '';
  const departure = plan.departureCity
    ? `<span style="margin-left:10px;padding-left:10px;border-left:1px solid ${C.border}">✈&nbsp;Sale desde ${plan.departureCity}</span>` : '';

  return `
  <tr><td style="padding:0 0 20px 0">
    <table cellpadding="0" cellspacing="0" width="100%"
      style="border-radius:14px;overflow:hidden;background:#fff;box-shadow:${C.cardShadow}">
      <tr><td style="padding:0">${imgBlock}</td></tr>
      <tr><td style="padding:20px 24px 24px">
        <table cellpadding="0" cellspacing="0" width="100%"><tr>
          <td valign="top">
            <p style="margin:0 0 6px;font-family:${F.condensed};font-size:24px;font-weight:700;
              color:${C.navy};line-height:1.1;letter-spacing:0.01em;text-transform:uppercase">
              ${plan.title}
            </p>
          </td>
          <td valign="top" align="right" style="padding-left:12px;white-space:nowrap">
            <span style="display:inline-block;background:${C.terracotta};color:#fff;
              font-family:${F.condensed};font-size:10px;font-weight:700;
              padding:4px 12px;border-radius:20px;letter-spacing:0.1em">DESTACADO</span>
          </td>
        </tr></table>
        <p style="margin:0 0 14px;font-family:${F.sans};font-size:12px;color:${C.textMuted}">
          🗓&nbsp;${plan.durationDays} días · ${plan.durationNights} noches${departure}
        </p>
        ${pills}
        <table cellpadding="0" cellspacing="0" width="100%"><tr>
          <td valign="bottom">
            <p style="margin:0 0 2px;font-family:${F.sans};font-size:11px;color:${C.textMuted};text-transform:uppercase;letter-spacing:0.07em">Desde</p>
            <p style="margin:0;font-family:${F.condensed};font-size:28px;font-weight:700;color:${C.terracotta};line-height:1">
              ${plan.currency}&nbsp;${plan.price.toLocaleString('es-CO')}
              <span style="font-family:${F.sans};font-size:12px;font-weight:400;color:${C.textMuted}"> p/p</span>
            </p>
          </td>
          <td valign="bottom" align="right">
            <a href="${SITE_URL}/planes"
              style="display:inline-block;background:${C.navy};color:#fff;
                font-family:${F.condensed};font-size:13px;font-weight:700;
                padding:11px 22px;border-radius:8px;text-decoration:none;
                letter-spacing:0.08em;text-transform:uppercase">
              VER PLAN →
            </a>
          </td>
        </tr></table>
      </td></tr>
    </table>
  </td></tr>`;
}

function secondaryCard(plan) {
  const img = plan.imageUrls?.[0] ?? '';
  const imgBlock = img
    ? `<img src="${img}" alt="${plan.title}" width="245" style="width:100%;height:160px;object-fit:cover;display:block">`
    : emptyStateSecondary();
  return `
  <td valign="top" style="width:245px;padding:0;vertical-align:top">
    <table cellpadding="0" cellspacing="0" width="100%"
      style="border-radius:10px;overflow:hidden;background:#fff;box-shadow:${C.cardShadow}">
      <tr><td style="padding:0">${imgBlock}</td></tr>
      <tr><td style="padding:14px 16px 18px">
        <p style="margin:0 0 4px;font-family:${F.condensed};font-size:16px;font-weight:700;
          color:${C.navy};text-transform:uppercase;letter-spacing:0.01em;line-height:1.2">
          ${plan.title}
        </p>
        <p style="margin:0 0 10px;font-family:${F.sans};font-size:11px;color:${C.textMuted}">
          🗓&nbsp;${plan.durationDays} días · ${plan.durationNights} noches
        </p>
        <p style="margin:0;font-family:${F.condensed};font-size:20px;font-weight:700;color:${C.terracotta};line-height:1">
          ${plan.currency}&nbsp;${plan.price.toLocaleString('es-CO')}
          <span style="font-family:${F.sans};font-size:11px;font-weight:400;color:${C.textMuted}"> p/p</span>
        </p>
      </td></tr>
    </table>
  </td>`;
}

function buildHtml(name, plans) {
  const featured = plans[0];
  const secondaries = plans.slice(1, 3);
  const planLine = 'sobre nuestros planes de viaje';

  const plansSection = featured ? `
  <tr><td style="padding:36px 40px 0">
    <p style="margin:0 0 4px;font-family:${F.condensed};font-size:11px;font-weight:700;
      color:${C.teal};letter-spacing:0.14em;text-transform:uppercase">Selección para ti</p>
    <p style="margin:0 0 24px;font-family:${F.condensed};font-size:24px;font-weight:700;
      color:${C.navy};text-transform:uppercase;letter-spacing:0.02em">
      Destinos que te pueden interesar
    </p>
    <table cellpadding="0" cellspacing="0" width="100%">
      ${featuredCard(featured)}
      ${secondaries.length > 0 ? `
      <tr><td>
        <table cellpadding="0" cellspacing="0" width="100%"><tr>
          ${secondaries.map(secondaryCard).join('<td style="width:16px;padding:0">&nbsp;</td>')}
        </tr></table>
      </td></tr>` : ''}
    </table>
  </td></tr>
  <tr><td style="padding:24px 40px 36px;text-align:center">
    <a href="${SITE_URL}/planes"
      style="display:inline-block;border:2px solid ${C.navy};color:${C.navy};
        background:transparent;font-family:${F.condensed};font-size:13px;font-weight:700;
        padding:11px 32px;border-radius:8px;text-decoration:none;
        letter-spacing:0.08em;text-transform:uppercase">
      Ver todos los planes →
    </a>
  </td></tr>` : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
  <title>Tour Vacation Travel</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="${FONTS}" rel="stylesheet">
  <style>
    @media (max-width:480px) {
      .sec-card { display:block !important; width:100% !important; padding-bottom:14px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${C.cream};font-family:${F.sans}">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};padding:28px 0 52px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
        style="max-width:600px;width:100%;border-radius:16px;overflow:hidden;
          box-shadow:0 8px 40px rgba(3,31,65,0.13)">

        <!-- HEADER -->
        <tr><td style="background:${C.navy};padding:28px 40px 24px;text-align:center">
          <img src="${LOGO_URL}" alt="Tour Vacation Travel" height="64"
            style="height:64px;display:inline-block">
          <p style="margin:8px 0 0;font-family:${F.condensed};font-size:11px;font-weight:700;
            color:${C.teal};letter-spacing:0.18em;text-transform:uppercase">
            Agencia de Viajes
          </p>
        </td></tr>

        <!-- HERO -->
        <tr><td style="background:linear-gradient(170deg,${C.navyMid} 0%,#0e2a4a 100%);
          padding:44px 40px 48px;text-align:center">
          <h1 style="margin:0 0 14px;font-family:${F.serif};font-size:38px;font-weight:700;
            color:#ffffff;line-height:1.15;font-style:italic">
            ${name},<br>
            <span style="font-style:normal">tu aventura comienza aquí</span>
          </h1>
          <p style="margin:0 0 6px;font-family:${F.sans};font-size:15px;
            color:rgba(176,199,241,0.9);line-height:1.7;max-width:400px;
            margin-left:auto;margin-right:auto">
            Recibimos tu consulta ${planLine}.<br>
            <strong style="color:#ffffff;font-weight:700">
              Un asesor te contacta en menos de 2 horas hábiles
            </strong>
            con una propuesta personalizada para ti.
          </p>
          <p style="margin:0 0 32px;font-family:${F.condensed};font-size:12px;font-weight:600;
            color:${C.teal};letter-spacing:0.1em;text-transform:uppercase">
            Lunes a sábado &nbsp;·&nbsp; 8:00 am – 7:00 pm
          </p>
          <a href="${WHATSAPP_URL}"
            style="display:inline-block;background:#25D366;color:#ffffff;
              font-family:${F.sans};font-size:15px;font-weight:700;
              padding:16px 36px;border-radius:50px;text-decoration:none;
              letter-spacing:0.02em;box-shadow:0 6px 20px rgba(37,211,102,0.40)">
            💬&nbsp; Hablar con un asesor ahora
          </a>
        </td></tr>

        <!-- CUERPO -->
        <tr><td style="background:#ffffff">
          <table cellpadding="0" cellspacing="0" width="100%">
            ${plansSection}
            <tr><td style="padding:0 40px">
              <div style="height:1px;background:${C.border}"></div>
            </td></tr>
            <tr><td style="padding:24px 40px 32px;text-align:center;background:${C.bgLight}">
              <p style="margin:0 0 4px;font-family:${F.sans};font-size:13px;color:${C.textMuted};line-height:1.6">
                También puedes escribirnos respondiendo este correo.
              </p>
              <p style="margin:0;font-family:${F.condensed};font-size:12px;font-weight:700;
                color:${C.teal};letter-spacing:0.08em;text-transform:uppercase">
                Tiempo de respuesta: menos de 2 horas hábiles
              </p>
            </td></tr>
          </table>
        </td></tr>

        <!-- FOOTER -->
        <tr><td style="background:${C.navy};padding:24px 40px;text-align:center">
          <p style="margin:0 0 6px;font-family:${F.sans};font-size:12px;
            color:rgba(176,199,241,0.8);line-height:1.6">
            Tour Vacation Travel &nbsp;·&nbsp;
            <a href="${SITE_URL}" style="color:${C.teal};text-decoration:none">tourvacation.com</a>
          </p>
          <p style="margin:0;font-family:${F.sans};font-size:11px;color:rgba(135,158,198,0.7)">
            Recibiste este correo porque completaste un formulario en nuestro sitio web.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

const html = buildHtml('Ruben', SAMPLE_PLANS);
const outPath = join(__dirname, 'email-preview.html');
writeFileSync(outPath, html, 'utf8');
console.log(`Preview generada → ${outPath}`);
try { execSync(`start "" "${outPath}"`); } catch { /* noop */ }
