import nodemailer, { type Transporter, type SendMailOptions } from 'nodemailer';
import { SMTP_PASS, SMTP_USER, SMTP_HOST, SMTP_PORT } from '../libs/config.js';

interface MailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Normalize password (Gmail App Passwords must not contain spaces)
const normalizedPass = (SMTP_PASS || '').replace(/\s+/g, '');

// Prefer explicit host/port if provided; fallback to Gmail service
const transporter: Transporter = nodemailer.createTransport(
  SMTP_HOST && SMTP_PORT
    ? {
        host: SMTP_HOST,
        port: parseInt(SMTP_PORT, 10),
        secure: parseInt(SMTP_PORT, 10) === 465, // true for 465, false for other ports
        auth: {
          user: SMTP_USER,
          pass: normalizedPass,
        },
        ...(parseInt(SMTP_PORT, 10) === 587 && { requireTLS: true }),
      }
    : {
        service: 'gmail',
        auth: {
          user: SMTP_USER,
          pass: normalizedPass,
        },
      }
);

let transporterVerified = false;

export const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Función para enviar email de verificación
const sendVerificationEmail = async (
  email: string,
  fullname: string,
  verificationCode: string
): Promise<MailResult> => {
  // verificar credenciales
  try {
    if (!transporterVerified) {
      await transporter.verify();
      transporterVerified = true;
      console.log('[emailConfig] transporter verified');
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[emailConfig] transporter verification failed:', msg);
    return { success: false, error: msg };
  }

  const mailOptions: SendMailOptions = {
    from: SMTP_USER,
    to: email,
    subject: 'MedCore | Verifica tu correo para activar tu cuenta',
    html: `
    <!-- VERIFICATION_CODE:${verificationCode} -->
    <div style="max-width:640px;margin:0 auto;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;background:#f6f9fc;color:#0f172a">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
        <tr>
          <td style="padding:24px 24px 0 24px; text-align:center">
            <div style="display:inline-flex;align-items:center;gap:10px">
              <div style="width:40px;height:40px;border-radius:12px;background:#0ea5e9;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700">MC</div>
              <div style="font-size:18px;font-weight:700;color:#0f172a">MedCore</div>
            </div>
            <div style="margin-top:16px;background:linear-gradient(135deg,#0ea5e9 0%, #22c55e 100%);height:4px;border-radius:9999px;width:100%"></div>
          </td>
        </tr>
        <tr>
          <td style="padding:24px">
            <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:24px">
              <h1 style="margin:0 0 12px 0;font-size:20px;color:#0f172a">Hola ${fullname},</h1>
              <p style="margin:0 0 16px 0;color:#334155;line-height:1.6">
                Para mantener la seguridad de la información clínica, necesitamos verificar tu correo electrónico.
                Ingresa el siguiente código en la aplicación para activar tu cuenta:
              </p>
              <div style="text-align:center;margin:20px 0">
                <div style="display:inline-block;background:#0ea5e9;color:#fff;font-size:28px;font-weight:800;padding:12px 24px;border-radius:10px;letter-spacing:4px;box-shadow:0 6px 16px rgba(14,165,233,.35)">
                  ${verificationCode}
                </div>
              </div>
              <p style="margin:0;color:#334155;line-height:1.6">
                El código expira en <strong>15 minutos</strong> por motivos de seguridad. Si no fuiste tú quien solicitó esta verificación, puedes ignorar este mensaje.
              </p>
              <div style="margin-top:16px;padding:12px;border-radius:12px;background:#f0fdfa;color:#065f46;border:1px solid #a7f3d0">
                Consejo: si usas correo corporativo, revisa la carpeta de spam o añade este remitente a tu lista de contactos.
              </div>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:0 24px 24px 24px;text-align:center;color:#64748b;font-size:12px">
            © ${new Date().getFullYear()} MedCore · Sistemas para clínicas y profesionales de la salud
          </td>
        </tr>
      </table>
    </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error enviando email:', error.message);
      return { success: false, error: error.message };
    }
    console.error('Error desconocido enviando email:', error);
    return { success: false, error: 'Error desconocido' };
  }
};

export default {
  transporter,
  generateVerificationCode,
  sendVerificationEmail,
};
