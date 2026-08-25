const WHATSAPP_URL = 'https://wa.me/573127466554';

const FONTS =
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,600' +
  '&family=Barlow+Condensed:wght@600;700' +
  '&family=Nunito+Sans:wght@400;600;700&display=swap';

const F = {
  serif: "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
  condensed: "'Barlow Condensed', 'Arial Narrow', Arial, sans-serif",
  sans: "'Nunito Sans', Arial, Helvetica, sans-serif",
};

const C = {
  navy: '#031f41',
  navyMid: '#1d3557',
  teal: '#2bc7d0',
  terracotta: '#c46b48',
  cream: '#f8f5f0',
  textBody: '#2d3748',
  textMuted: '#718096',
  border: '#e5e2dd',
  bgLight: '#f6f3ee',
  cardShadow: '0 2px 12px rgba(3,31,65,0.10)',
};

interface PromoConfig {
  bg: string;
  textColor: string;
  icon: string;
  badgeLabel: string;
  calloutBg: string;
}

const PROMO_CONFIG: Record<string, PromoConfig> = {
  dos_x_uno: {
    bg: '#f59e0b',
    textColor: '#1a1200',
    icon: '🎯',
    badgeLabel: '2 × 1',
    calloutBg: '#fef3c7',
  },
  precio_especial: {
    bg: '#059669',
    textColor: '#ffffff',
    icon: '💰',
    badgeLabel: 'PRECIO ESPECIAL',
    calloutBg: '#d1fae5',
  },
  cupos_limitados: {
    bg: '#dc2626',
    textColor: '#ffffff',
    icon: '🔥',
    badgeLabel: 'CUPOS LIMITADOS',
    calloutBg: '#fee2e2',
  },
  texto_libre: {
    bg: '#c46b48',
    textColor: '#ffffff',
    icon: '✨',
    badgeLabel: '',
    calloutBg: '#fef0eb',
  },
};

export interface CampaignPlan {
  planId: string;
  title: string;
  price: number;
  currency: string;
  priceDetails?: string;
  durationDays: number;
  durationNights: number;
  departureCity?: string;
  inclusions?: string[];
  imageUrls?: string[];
  promotion?: {
    type: string;
    label: string;
    expiresAt?: string;
    active: boolean;
  };
}

export interface PlanCampaignData {
  recipientName: string;
  plan: CampaignPlan;
  siteUrl: string;
}

function getPromoConfig(type: string): PromoConfig {
  return PROMO_CONFIG[type] ?? PROMO_CONFIG.texto_libre;
}

function inclusionPills(inclusions: string[]): string {
  return inclusions
    .slice(0, 4)
    .map(
      (inc) =>
        `<span style="display:inline-block;background:rgba(43,199,208,0.10);color:${C.teal};
          font-family:${F.condensed};font-size:11px;font-weight:700;letter-spacing:0.06em;
          padding:4px 10px;border-radius:20px;margin:0 5px 5px 0;border:1px solid rgba(43,199,208,0.25)">
          ✓&nbsp;${inc.toUpperCase()}
        </span>`,
    )
    .join('');
}

export function planCampaignTemplate(data: PlanCampaignData): {
  subject: string;
  html: string;
} {
  const { plan, siteUrl } = data;
  const firstName = data.recipientName.trim().split(' ')[0];
  const logoUrl = `${siteUrl}/logo-positiva-transparent.webp`;

  const hasPromo = plan.promotion?.active === true;
  const promo = hasPromo ? plan.promotion! : null;
  const promoConf = promo ? getPromoConfig(promo.type) : null;

  // For texto_libre the label IS the display label; for typed promos use the badge label
  const promoBadgeLabel = promo
    ? promo.type === 'texto_libre'
      ? promo.label
      : promoConf!.badgeLabel
    : '';

  const imgUrl = plan.imageUrls?.[0] ?? '';
  const imgBlock = imgUrl
    ? `<img src="${imgUrl}" alt="${plan.title}" width="600"
        style="width:100%;height:280px;object-fit:cover;display:block">`
    : `<div style="width:100%;height:280px;background:linear-gradient(135deg,#0a3060 0%,${C.navyMid} 100%);
        text-align:center;padding-top:110px;box-sizing:border-box">
        <p style="margin:0;font-family:${F.condensed};font-size:36px;font-weight:700;
          color:rgba(255,255,255,0.15);letter-spacing:0.1em;text-transform:uppercase">TOUR VACATION</p>
      </div>`;

  const promoBanner = promoConf
    ? `<tr><td style="background:${promoConf.bg};padding:16px 40px;text-align:center">
        <p style="margin:0;font-family:${F.condensed};font-size:22px;font-weight:700;
          color:${promoConf.textColor};letter-spacing:0.1em;text-transform:uppercase">
          ${promoConf.icon}&nbsp;&nbsp;${promoBadgeLabel}
          ${
            promo!.type !== 'texto_libre' && promo!.label
              ? `&nbsp;<span style="font-size:16px;font-weight:600;opacity:0.85">— ${promo!.label}</span>`
              : ''
          }
        </p>
      </td></tr>`
    : '';

  const expiryLine = promo?.expiresAt
    ? `<p style="margin:10px 0 0;font-family:${F.sans};font-size:13px;color:${C.textMuted}">
          ⏰&nbsp;Válido hasta:&nbsp;<strong style="color:${C.textBody}">
            ${new Date(promo.expiresAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}
          </strong>
        </p>`
    : '';

  // For typed promos: show "TIPO: custom label". For texto_libre: show just the label.
  const calloutTitle = promo
    ? promo.type === 'texto_libre'
      ? promo.label
      : promoConf!.badgeLabel
    : '';
  const calloutSubtitle =
    promo && promo.type !== 'texto_libre' && promo.label
      ? `<p style="margin:8px 0 0;font-family:${F.sans};font-size:14px;color:${C.textBody};line-height:1.5">
          ${promo.label}
        </p>`
      : '';

  const promoCallout = promoConf
    ? `<tr><td style="padding:0 40px 32px">
        <table cellpadding="0" cellspacing="0" width="100%"
          style="border-radius:12px;overflow:hidden;border:2px solid ${promoConf.bg}">
          <tr><td style="background:${promoConf.bg};padding:12px 24px">
            <p style="margin:0;font-family:${F.condensed};font-size:11px;font-weight:700;
              color:${promoConf.textColor};letter-spacing:0.14em;text-transform:uppercase">
              ${promoConf.icon}&nbsp; OFERTA ESPECIAL
            </p>
          </td></tr>
          <tr><td style="padding:20px 24px;background:${promoConf.calloutBg}">
            <p style="margin:0;font-family:${F.condensed};font-size:28px;font-weight:700;
              color:${C.navy};line-height:1.2">
              ${calloutTitle}
            </p>
            ${calloutSubtitle}
            ${expiryLine}
          </td></tr>
        </table>
      </td></tr>`
    : '';

  const pills =
    plan.inclusions && plan.inclusions.length > 0
      ? `<div style="margin:0 0 20px 0">${inclusionPills(plan.inclusions)}</div>`
      : '';

  const departure = plan.departureCity
    ? `<p style="margin:0 0 16px;font-family:${F.sans};font-size:12px;color:${C.textMuted}">
        ✈&nbsp;Sale desde <strong>${plan.departureCity}</strong>
      </p>`
    : '';

  const cardBadge = promoConf
    ? `<span style="display:inline-block;background:${promoConf.bg};color:${promoConf.textColor};
        font-family:${F.condensed};font-size:10px;font-weight:700;
        padding:5px 14px;border-radius:20px;letter-spacing:0.1em;text-transform:uppercase;
        white-space:nowrap">
        ${promoConf.icon}&nbsp;${promoBadgeLabel.slice(0, 16)}${promoBadgeLabel.length > 16 ? '…' : ''}
      </span>`
    : `<span style="display:inline-block;background:${C.terracotta};color:#fff;
        font-family:${F.condensed};font-size:10px;font-weight:700;
        padding:5px 14px;border-radius:20px;letter-spacing:0.1em">DESTACADO</span>`;

  const heroText = hasPromo
    ? 'Tenemos una oferta especial para ti'
    : 'Una propuesta pensada para ti';

  const bodyIntro = hasPromo
    ? `Queremos que seas de las primeras personas en aprovechar esta oferta en
        <strong>${plan.title}</strong>. Las oportunidades como esta no duran mucho.`
    : `Pensando en tus intereses, te presentamos <strong>${plan.title}</strong>,
        un plan diseñado para que tu próximo viaje sea inolvidable.`;

  const subject = hasPromo
    ? `${promoConf!.icon} ${promoBadgeLabel} en "${plan.title}" — Tour Vacation Travel`
    : `${plan.title} — Una propuesta especial para ti | Tour Vacation Travel`;

  return {
    subject,
    html: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
  <title>${plan.title} — Tour Vacation Travel</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="${FONTS}" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:${C.cream};font-family:${F.sans}">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};padding:28px 0 52px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
        style="max-width:600px;width:100%;border-radius:16px;overflow:hidden;
          box-shadow:0 8px 40px rgba(3,31,65,0.13)">

        <!-- ── HEADER ── -->
        <tr><td style="background:${C.navy};padding:28px 40px 24px;text-align:center">
          <img src="${logoUrl}" alt="Tour Vacation Travel" height="64"
            style="height:64px;display:inline-block">
          <p style="margin:8px 0 0;font-family:${F.condensed};font-size:11px;font-weight:700;
            color:${C.teal};letter-spacing:0.18em;text-transform:uppercase">
            Agencia de Viajes
          </p>
        </td></tr>

        <!-- ── PLAN IMAGE ── -->
        <tr><td style="padding:0;line-height:0">
          ${imgBlock}
        </td></tr>

        <!-- ── PROMO BANNER ── -->
        ${promoBanner}

        <!-- ── BODY ── -->
        <tr><td style="background:#ffffff">
          <table cellpadding="0" cellspacing="0" width="100%">

            <!-- GREETING -->
            <tr><td style="padding:36px 40px 28px">
              <p style="margin:0 0 6px;font-family:${F.condensed};font-size:11px;font-weight:700;
                color:${C.teal};letter-spacing:0.14em;text-transform:uppercase">
                Hola, ${firstName}
              </p>
              <h1 style="margin:0 0 16px;font-family:${F.serif};font-size:32px;font-weight:700;
                color:${C.navy};line-height:1.2;font-style:italic">
                ${heroText}
              </h1>
              <p style="margin:0;font-family:${F.sans};font-size:14px;color:${C.textBody};line-height:1.7">
                ${bodyIntro}
              </p>
            </td></tr>

            <!-- PLAN CARD -->
            <tr><td style="padding:0 40px 28px">
              <table cellpadding="0" cellspacing="0" width="100%"
                style="border-radius:14px;overflow:hidden;border:1px solid ${C.border};
                  box-shadow:${C.cardShadow}">

                <!-- card header -->
                <tr><td style="background:${C.bgLight};padding:20px 24px 16px">
                  <table cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td valign="middle">
                        <p style="margin:0;font-family:${F.condensed};font-size:26px;font-weight:700;
                          color:${C.navy};line-height:1.1;text-transform:uppercase;letter-spacing:0.01em">
                          ${plan.title}
                        </p>
                        <p style="margin:6px 0 0;font-family:${F.sans};font-size:12px;color:${C.textMuted}">
                          🗓&nbsp;${plan.durationDays} días · ${plan.durationNights} noches
                        </p>
                      </td>
                      <td valign="top" align="right" style="padding-left:12px">
                        ${cardBadge}
                      </td>
                    </tr>
                  </table>
                </td></tr>

                <!-- card body -->
                <tr><td style="padding:20px 24px 24px;background:#ffffff">
                  ${departure}
                  ${pills}
                  <table cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td valign="bottom">
                        <p style="margin:0 0 2px;font-family:${F.sans};font-size:11px;color:${C.textMuted};
                          text-transform:uppercase;letter-spacing:0.07em">Desde</p>
                        <p style="margin:0;font-family:${F.condensed};font-size:32px;font-weight:700;
                          color:${C.terracotta};line-height:1">
                          ${plan.currency}&nbsp;${plan.price.toLocaleString('es-CO')}
                          <span style="font-family:${F.sans};font-size:12px;font-weight:400;
                            color:${C.textMuted}"> p/p</span>
                        </p>
                        ${
                          plan.priceDetails
                            ? `<p style="margin:4px 0 0;font-family:${F.sans};font-size:11px;color:${C.textMuted}">${plan.priceDetails}</p>`
                            : ''
                        }
                      </td>
                      <td valign="bottom" align="right">
                        <a href="${siteUrl}/planes"
                          style="display:inline-block;background:${C.navy};color:#fff;
                            font-family:${F.condensed};font-size:13px;font-weight:700;
                            padding:12px 24px;border-radius:8px;text-decoration:none;
                            letter-spacing:0.08em;text-transform:uppercase">
                          VER PLAN →
                        </a>
                      </td>
                    </tr>
                  </table>
                </td></tr>
              </table>
            </td></tr>

            <!-- ── PROMO CALLOUT ── -->
            ${promoCallout}

            <!-- SEPARATOR -->
            <tr><td style="padding:0 40px">
              <div style="height:1px;background:${C.border}"></div>
            </td></tr>

            <!-- CTA SECTION -->
            <tr><td style="padding:32px 40px;text-align:center">
              <p style="margin:0 0 20px;font-family:${F.sans};font-size:14px;
                color:${C.textBody};line-height:1.7">
                ¿Te interesa? Hablemos ahora y armamos el viaje de tus sueños.
              </p>
              <a href="${WHATSAPP_URL}"
                style="display:inline-block;background:#25D366;color:#ffffff;
                  font-family:${F.sans};font-size:15px;font-weight:700;
                  padding:16px 36px;border-radius:50px;text-decoration:none;
                  letter-spacing:0.02em;box-shadow:0 6px 20px rgba(37,211,102,0.40)">
                💬&nbsp; Quiero reservar este plan
              </a>
            </td></tr>

            <!-- HOURS -->
            <tr><td style="padding:0 40px 32px;text-align:center;background:${C.bgLight}">
              <p style="margin:0;font-family:${F.condensed};font-size:12px;font-weight:700;
                color:${C.teal};letter-spacing:0.08em;text-transform:uppercase">
                Lunes a sábado &nbsp;·&nbsp; 8:00 am – 7:00 pm
              </p>
            </td></tr>

          </table>
        </td></tr>

        <!-- ── FOOTER ── -->
        <tr><td style="background:${C.navy};padding:24px 40px;text-align:center">
          <p style="margin:0 0 6px;font-family:${F.sans};font-size:12px;
            color:rgba(176,199,241,0.8);line-height:1.6">
            Tour Vacation Travel &nbsp;·&nbsp;
            <a href="${siteUrl}" style="color:${C.teal};text-decoration:none">
              tourvacation.com
            </a>
          </p>
          <p style="margin:0;font-family:${F.sans};font-size:11px;color:rgba(135,158,198,0.7)">
            Recibiste este correo porque estás en nuestra lista de clientes y prospectos.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}
