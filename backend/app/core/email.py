import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

logger = logging.getLogger(__name__)

def send_critical_stock_alert(
    to_email: str,
    deposit_name: str,
    asset_code: str,
    asset_description: str,
) -> None:
    if not settings.SMTP_HOST or not settings.SMTP_FROM:
        logger.warning("SMTP no configurado — alerta de stock crítico no enviada a %s", to_email)
        return

    subject = f"[Stock IT] Alerta crítica: {asset_code} en {deposit_name}"
    body = (
        f"El activo <strong>{asset_code} — {asset_description}</strong> "
        f"en el depósito <strong>{deposit_name}</strong> ha alcanzado stock <strong>CRÍTICO (0 unidades)</strong>.<br><br>"
        f"Ingresá al sistema para registrar un reabastecimiento."
    )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to_email
    msg.attach(MIMEText(body, "html"))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            server.ehlo()
            server.starttls()
            if settings.SMTP_USER:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM, [to_email], msg.as_string())
        logger.info("Alerta de stock crítico enviada a %s (%s)", to_email, asset_code)
    except Exception as exc:
        logger.error("Error al enviar alerta de stock crítico: %s", exc)
