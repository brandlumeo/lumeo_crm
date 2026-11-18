"""Payment QR for quote / invoice PDFs (configured in Finance settings)."""
import io
import logging
import urllib.parse
import urllib.request

logger = logging.getLogger(__name__)


def _settings(company):
    try:
        return company.invoice_settings
    except Exception:
        return None


def payment_qr_config(company, doc_kind, currency):
    """('image', url) | ('upi', upi_id) | None."""
    settings = _settings(company)
    if settings is None or not hasattr(settings, "payment_qr_for"):
        return None
    return settings.payment_qr_for(doc_kind, currency)


def upi_payload(upi_id, payee_name, amount=None, note=""):
    params = {"pa": upi_id, "pn": payee_name or "", "cu": "INR"}
    if amount and float(amount) > 0:
        params["am"] = f"{float(amount):.2f}"
    if note:
        params["tn"] = note[:50]
    return "upi://pay?" + urllib.parse.urlencode(params, quote_via=urllib.parse.quote, safe="@")


def _image_bytes(url):
    from django.conf import settings as dj_settings
    from django.core.files.storage import default_storage

    media_url = getattr(dj_settings, "MEDIA_URL", "/media/") or "/media/"
    if url.startswith(media_url):
        with default_storage.open(url[len(media_url):], "rb") as fh:
            return fh.read()
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=6) as resp:
        return resp.read()


def payment_qr_flowable(company, doc_kind, currency, amount, size, note=""):
    """A reportlab flowable (QR drawing or uploaded image) and its caption, or (None, "")."""
    config = payment_qr_config(company, doc_kind, currency)
    if not config:
        return None, ""
    settings = _settings(company)
    caption = (getattr(settings, "payment_qr_label", "") or "Scan to pay").strip()
    kind, value = config
    try:
        if kind == "upi":
            from reportlab.graphics.barcode.qr import QrCodeWidget
            from reportlab.graphics.shapes import Drawing

            widget = QrCodeWidget(upi_payload(value, company.name, amount, note))
            x1, y1, x2, y2 = widget.getBounds()
            drawing = Drawing(size, size, transform=[size / (x2 - x1), 0, 0, size / (y2 - y1), 0, 0])
            drawing.add(widget)
            return drawing, f"{caption} (UPI: {value})"
        from reportlab.platypus import Image as RLImage

        return RLImage(io.BytesIO(_image_bytes(value)), width=size, height=size, kind="proportional"), caption
    except Exception as exc:  # a broken image must never break the PDF
        logger.warning("Payment QR could not be rendered for company %s: %s", getattr(company, "id", "?"), exc)
        return None, ""
