"""Document currencies and exchange rates.

Every money document (quote, invoice, order, purchase order, bill) is stored
in its own currency plus an ``exchange_rate``: how many units of the company's
base currency one unit of the document currency is worth, frozen when the
document is created. Dashboards multiply by it so mixed currencies are never
added together raw.
"""
import json
import logging
import urllib.request
from decimal import Decimal, InvalidOperation

from django.core.cache import cache
from django.db.models import DecimalField, ExpressionWrapper, F

logger = logging.getLogger(__name__)

# code -> (name, symbol)
SUPPORTED_CURRENCIES = {
    "INR": ("Indian Rupee", "₹"),
    "AED": ("UAE Dirham", "AED"),
    "SAR": ("Saudi Riyal", "SAR"),
    "QAR": ("Qatari Riyal", "QAR"),
    "KWD": ("Kuwaiti Dinar", "KWD"),
    "OMR": ("Omani Rial", "OMR"),
    "BHD": ("Bahraini Dinar", "BHD"),
    "USD": ("US Dollar", "$"),
    "EUR": ("Euro", "€"),
    "GBP": ("British Pound", "£"),
    "AUD": ("Australian Dollar", "A$"),
    "CAD": ("Canadian Dollar", "C$"),
    "SGD": ("Singapore Dollar", "S$"),
}

# Plain-text symbols for the PDF engine (Helvetica has no ₹ glyph).
PDF_SYMBOLS = {"INR": "Rs. ", "USD": "$", "EUR": "€", "GBP": "£"}

RATE_API = "https://open.er-api.com/v6/latest/{base}"
RATE_CACHE_SECONDS = 6 * 60 * 60


def company_base_currency(company):
    return ((getattr(company, "currency", None) or "USD").strip().upper())[:3]


def pdf_symbol(code):
    code = (code or "").upper()
    return PDF_SYMBOLS.get(code, f"{code} ")


def fetch_rate(source, target):
    """Units of ``target`` per 1 ``source``. Returns Decimal, or None on failure.

    Only the two currency codes are sent to the public rate service.
    """
    source, target = (source or "").upper(), (target or "").upper()
    if not source or not target:
        return None
    if source == target:
        return Decimal("1")

    cache_key = f"fx:{source}"
    try:
        rates = cache.get(cache_key)
    except Exception:  # a broken cache backend must never block saving a document
        rates = None
    if rates is None:
        try:
            req = urllib.request.Request(RATE_API.format(base=source), headers={"User-Agent": "crm-fx/1.0"})
            with urllib.request.urlopen(req, timeout=6) as resp:
                payload = json.loads(resp.read().decode("utf-8"))
            if payload.get("result") != "success":
                raise ValueError(payload.get("error-type", "unknown error"))
            rates = payload.get("rates") or {}
            try:
                cache.set(cache_key, rates, RATE_CACHE_SECONDS)
            except Exception:
                pass
        except Exception as exc:  # network, JSON, provider error
            logger.warning("FX rate lookup failed for %s->%s: %s", source, target, exc)
            return None

    try:
        value = rates.get(target)
        return Decimal(str(value)).quantize(Decimal("0.000001")) if value else None
    except (InvalidOperation, TypeError):
        return None


def in_base(field, rate_field="exchange_rate"):
    """ORM expression converting a document money field to base currency."""
    return ExpressionWrapper(F(field) * F(rate_field), output_field=DecimalField(max_digits=20, decimal_places=6))
