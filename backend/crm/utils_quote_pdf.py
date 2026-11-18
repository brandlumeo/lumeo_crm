import io
import os
import html
import urllib.request
import urllib.parse
from datetime import datetime, date

from django.http import HttpResponse
from reportlab.lib.pagesizes import letter
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, Image as RLImage, PageBreak, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing


# ── Font Registration for Crisp Typography & Unicode Rupee (₹) ──────────────

FONT_REG = "Helvetica"
FONT_BOLD = "Helvetica-Bold"

def esc(val):
    if val is None:
        return ""
    return html.escape(str(val))

def init_fonts():
    global FONT_REG, FONT_BOLD
    candidates = [
        ("C:/Windows/Fonts/segoeui.ttf", "C:/Windows/Fonts/segoeuib.ttf", "SegoeUI"),
        ("C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/arialbd.ttf", "Arial"),
        ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "DejaVuSans"),
        ("/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf", "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf", "LiberationSans"),
    ]
    for reg, bold, name in candidates:
        if os.path.exists(reg) and os.path.exists(bold):
            try:
                pdfmetrics.registerFont(TTFont(name, reg))
                pdfmetrics.registerFont(TTFont(f"{name}-Bold", bold))
                FONT_REG = name
                FONT_BOLD = f"{name}-Bold"
                break
            except Exception:
                continue

init_fonts()


# ── Two-Pass Numbered Canvas for Dynamic Page Counts & Footers ───────────────

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        self.footer_company_name = kwargs.pop("footer_company_name", "BrandLumeo Marketing LLP")
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_footer(num_pages)
            super().showPage()
        super().save()

    def draw_page_footer(self, page_count):
        self.saveState()
        self.setFont(FONT_REG, 7.5)
        self.setFillColor(colors.HexColor("#64748B"))

        # Single page proposal
        if page_count == 1:
            left_text = self.footer_company_name or "BrandLumeo Marketing LLP"
            self.drawString(36, 16, left_text)
            self.drawRightString(self._pagesize[0] - 36, 16, "Page 1 of 1")
            self.restoreState()
            return

        # 2+ pages proposal:
        # Page 1: Company legal name on left, Page 1 of 2 on right
        # Page 2+: "Thank you for your business." on left, Page X of Y on right
        if self._pageNumber == 1:
            left_text = self.footer_company_name or "BrandLumeo Marketing LLP"
        else:
            left_text = "Thank you for your business."

        self.drawString(36, 20, left_text)
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(self._pagesize[0] - 36, 20, page_str)
        self.restoreState()


# ── Currency & Number to Words (Indian Numbering Format) ──────────────────────

def amount_to_inr_words(amount):
    try:
        val = int(round(float(amount)))
    except Exception:
        return ""
    if val == 0:
        return "Indian Rupees Zero Only"

    ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
            "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
            "Seventeen", "Eighteen", "Nineteen"]
    tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

    def two_digits(n):
        if n < 20:
            return ones[n]
        rem = n % 10
        return tens[n // 10] + ("" if rem == 0 else "-" + ones[rem])

    def three_digits(n):
        h = n // 100
        rem = n % 100
        res = ""
        if h > 0:
            res += ones[h] + " Hundred"
        if rem > 0:
            res += (" " if res else "") + two_digits(rem)
        return res

    parts = []
    # Crores (10,000,000)
    crores = val // 10000000
    val %= 10000000
    if crores > 0:
        parts.append(two_digits(crores) + " Crore")

    # Lakhs (100,000)
    lakhs = val // 100000
    val %= 100000
    if lakhs > 0:
        parts.append(two_digits(lakhs) + " Lakh")

    # Thousands (1,000)
    thousands = val // 1000
    val %= 1000
    if thousands > 0:
        parts.append(two_digits(thousands) + " Thousand")

    # Hundreds + remainder
    if val > 0:
        parts.append(three_digits(val))

    words = " ".join(parts).strip()
    return f"Indian Rupees {words} Only"


CURRENCY_WORD_NAMES = {
    "INR": "Indian Rupees", "AED": "UAE Dirhams", "SAR": "Saudi Riyals", "QAR": "Qatari Riyals",
    "KWD": "Kuwaiti Dinars", "OMR": "Omani Rials", "BHD": "Bahraini Dinars", "USD": "US Dollars",
    "EUR": "Euros", "GBP": "British Pounds", "AUD": "Australian Dollars", "CAD": "Canadian Dollars",
    "SGD": "Singapore Dollars",
}


def format_currency_inr(val, currency="INR"):
    """Format an amount in the quote's currency (₹ 15,999.00 / AED 15,999.00)."""
    currency = (currency or "INR").upper()
    prefix = "₹" if currency == "INR" else currency
    try:
        return f"{prefix} {float(val or 0):,.2f}"
    except Exception:
        return f"{prefix} 0.00"


def amount_to_words(amount, currency="INR"):
    """Indian numbering (lakh/crore) for INR, international (million) for others."""
    currency = (currency or "INR").upper()
    if currency == "INR":
        return amount_to_inr_words(amount)
    try:
        val = int(round(float(amount)))
    except Exception:
        return ""
    name = CURRENCY_WORD_NAMES.get(currency, currency)
    if val == 0:
        return f"{name} Zero Only"
    ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
            "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
            "Seventeen", "Eighteen", "Nineteen"]
    tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

    def three(n):
        h, rem = divmod(n, 100)
        out = [ones[h] + " Hundred"] if h else []
        if rem:
            out.append(ones[rem] if rem < 20 else tens[rem // 10] + ("" if rem % 10 == 0 else "-" + ones[rem % 10]))
        return " ".join(out)

    parts = []
    for size, label in ((1_000_000_000, "Billion"), (1_000_000, "Million"), (1000, "Thousand"), (1, "")):
        chunk, val = divmod(val, size)
        if chunk:
            parts.append((three(chunk) + (" " + label if label else "")).strip())
    return f"{name} {' '.join(parts)} Only"


# ── Story Builder (Smart Adaptive Layout) ────────────────────────────────────

def _build_quote_story(quote, is_compact=False):
    """
    Builds the flowable story for the quotation.
    When is_compact is True, margins, spacers, and typography are optimized so
    standard/short proposals (<= 3 items) fit seamlessly on 1 page with ZERO blank gaps.
    When is_compact is False, generous spacing and a page break are used to create the
    full 2-page Agency Statement of Work matching the reference design.
    """
    story = []
    comp = quote.company
    qcur = (quote.currency or getattr(comp, "currency", None) or "INR").upper()
    settings = getattr(comp, "invoice_settings", None)
    accent_green = "#55B334"
    ink_slate = "#0F172A"
    muted_slate = "#64748B"
    body_slate = "#334155"
    border_color = colors.HexColor("#E2E8F0")

    styles = getSampleStyleSheet()

    def ps(name, **kwargs):
        if "fontName" not in kwargs:
            kwargs["fontName"] = FONT_REG
        if "fontSize" in kwargs and "leading" not in kwargs:
            kwargs["leading"] = int(kwargs["fontSize"] * 1.3)
        return ParagraphStyle(name, parent=styles["Normal"], **kwargs)

    # Company Details & Branding
    company_name = getattr(comp, "legal_name", None) or comp.name or "BrandLumeo Marketing LLP"
    addr_parts = [p for p in [comp.address_line1, comp.address_line2, comp.city, comp.state, comp.postal_code] if p]
    company_address = ", ".join(addr_parts) if addr_parts else "Payyoli Perambra Rd, Kizhur, Kerala 673522"
    company_phone = getattr(comp, "phone", None) or getattr(settings, "company_phone", None) or "+91 97464 57565"
    company_email = getattr(comp, "company_email", None) or getattr(comp, "email", None) or "info@brandlumeo.com"

    # Logo resolution
    logo_flowable = None
    logo_url = getattr(settings, "invoice_logo", None) or getattr(comp, "logo", None)
    if logo_url:
        try:
            req = urllib.request.Request(logo_url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=4) as response:
                img_data = io.BytesIO(response.read())
                logo_h = 28 if is_compact else 34
                logo_w = int(logo_h * 3.5)
                logo_flowable = RLImage(img_data, width=logo_w, height=logo_h)
        except Exception:
            logo_flowable = None

    if not logo_flowable:
        logo_flowable = Paragraph(
            f'<font name="Helvetica-Bold" size="{"16" if is_compact else "18"}" color="{ink_slate}">Brand</font>'
            f'<font name="Helvetica-Bold" size="{"16" if is_compact else "18"}" color="{accent_green}">Lumeo</font>',
            ps("BrandLogo", fontSize=16 if is_compact else 18, leading=20 if is_compact else 22)
        )

    def build_header():
        company_info_text = (
            f'<font name="Helvetica-Bold" size="{"7.5" if is_compact else "8.5"}" color="{ink_slate}">{company_name.upper()}</font><br/>'
            f'<font size="{"6.5" if is_compact else "7"}" color="{muted_slate}">{company_address}</font><br/>'
            f'<font size="{"6.5" if is_compact else "7"}" color="{muted_slate}">{company_phone} &nbsp;·&nbsp; {company_email}</font>'
        )
        header_table = Table(
            [[logo_flowable, Paragraph(company_info_text, ps("HeaderRight", fontSize=6.5 if is_compact else 7, leading=9.5 if is_compact else 10, alignment=2))]],
            colWidths=[200, 340]
        )
        header_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4 if is_compact else 6),
        ]))
        return [header_table, HRFlowable(width="100%", thickness=0.75, color=border_color, spaceBefore=3, spaceAfter=8 if is_compact else 14)]

    # ── Page 1 Content ────────────────────────────────────────────────────────
    for item in build_header():
        story.append(item)

    # Document Title
    story.append(Paragraph(
        f'<font name="Helvetica-Bold" size="{"12" if is_compact else "13"}" color="{ink_slate}">Q U O T A T I O N</font>',
        ps("DocTitle", fontSize=12 if is_compact else 13, leading=15 if is_compact else 16)
    ))
    story.append(Spacer(1, 6 if is_compact else 12))

    # Prepared For vs Meta Information Grid
    client_name = quote.client_name or ""
    client_address = quote.client_address or ""
    client_phone = quote.client_phone or ""

    if not client_name:
        if quote.lead:
            client_name = quote.lead.name or getattr(quote.lead, "company", "") or ""
            client_phone = client_phone or quote.lead.mobile or ""
        elif quote.customer:
            client_name = getattr(quote.customer, "name", "") or ""
            custom_data = getattr(quote.customer, "custom_data", {}) or {}
            cust_addr = custom_data.get("address") if isinstance(custom_data, dict) else ""
            client_address = client_address or cust_addr or getattr(quote.customer, "email", "") or ""
            client_phone = client_phone or getattr(quote.customer, "phone", "") or ""
        elif quote.deal:
            client_name = quote.deal.title or ""

    client_name = (client_name or "CLIENT / PROSPECT").upper()
    client_address = client_address or "Calicut, Kerala"
    client_phone = client_phone or ""

    prepared_for_html = (
        f'<font name="{FONT_BOLD}" size="{"6.5" if is_compact else "7"}" color="{muted_slate}">PREPARED FOR</font><br/>'
        f'<font name="{FONT_BOLD}" size="{"9" if is_compact else "9.5"}" color="{ink_slate}">{esc(client_name)}</font><br/>'
        f'<font size="{"7" if is_compact else "7.5"}" color="{body_slate}">{esc(client_address)}</font>'
        + (f'<br/><font size="{"7" if is_compact else "7.5"}" color="{body_slate}">{esc(client_phone)}</font>' if client_phone else '')
    )

    created_date_str = quote.created_at.strftime("%d-%m-%Y") if quote.created_at else datetime.now().strftime("%d-%m-%Y")
    valid_until_str = quote.valid_until.strftime("%d-%m-%Y") if quote.valid_until else "15 Days"
    duration_str = quote.duration or "1 Month"

    meta_rows = [
        [Paragraph(f'<font size="{"7" if is_compact else "7.5"}" color="{muted_slate}">Quotation No.</font>', ps("M1", fontSize=7 if is_compact else 7.5)),
         Paragraph(f'<font name="Helvetica" size="{"7" if is_compact else "7.5"}" color="{ink_slate}">{quote.quote_number}</font>', ps("M2", fontSize=7 if is_compact else 7.5, alignment=2))],
        [Paragraph(f'<font size="{"7" if is_compact else "7.5"}" color="{muted_slate}">Date</font>', ps("M3", fontSize=7 if is_compact else 7.5)),
         Paragraph(f'<font name="Helvetica" size="{"7" if is_compact else "7.5"}" color="{ink_slate}">{created_date_str}</font>', ps("M4", fontSize=7 if is_compact else 7.5, alignment=2))],
        [Paragraph(f'<font size="{"7" if is_compact else "7.5"}" color="{muted_slate}">Valid Until</font>', ps("M5", fontSize=7 if is_compact else 7.5)),
         Paragraph(f'<font name="Helvetica" size="{"7" if is_compact else "7.5"}" color="{ink_slate}">{valid_until_str}</font>', ps("M6", fontSize=7 if is_compact else 7.5, alignment=2))],
        [Paragraph(f'<font size="{"7" if is_compact else "7.5"}" color="{muted_slate}">Duration</font>', ps("M7", fontSize=7 if is_compact else 7.5)),
         Paragraph(f'<font name="Helvetica" size="{"7" if is_compact else "7.5"}" color="{ink_slate}">{duration_str}</font>', ps("M8", fontSize=7 if is_compact else 7.5, alignment=2))],
    ]
    meta_table = Table(meta_rows, colWidths=[90, 140])
    meta_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 1 if is_compact else 1.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1 if is_compact else 1.5),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))

    info_grid = Table(
        [[Paragraph(prepared_for_html, ps("PrepFor", fontSize=7 if is_compact else 7.5, leading=10 if is_compact else 11)), meta_table]],
        colWidths=[310, 230]
    )
    info_grid.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(info_grid)
    story.append(Spacer(1, 6 if is_compact else 14))

    # ── Section: OVERVIEW ─────────────────────────────────────────────────────
    overview_text = quote.overview.strip() if quote.overview else ""
    if not overview_text:
        overview_text = (
            f"This quotation covers our <b>{esc(quote.title or 'Growth Package')}</b> for {esc(client_name.title())} "
            f"— a dedicated digital marketing and brand visibility programme to establish market presence, "
            f"engage qualified prospective customers, and accelerate business growth through professional execution."
        )
    else:
        overview_text = esc(overview_text).replace("&lt;b&gt;", "<b>").replace("&lt;/b&gt;", "</b>")

    story.append(Paragraph(
        f'<font name="{FONT_BOLD}" size="{"7.5" if is_compact else "8"}" color="{accent_green}">OVERVIEW</font>',
        ps("OverviewHead", fontSize=7.5 if is_compact else 8, leading=10 if is_compact else 11)
    ))
    story.append(Spacer(1, 2 if is_compact else 3))
    story.append(Paragraph(
        f'<font size="{"7" if is_compact else "7.5"}" color="{body_slate}">{overview_text}</font>',
        ps("OverviewBody", fontSize=7 if is_compact else 7.5, leading=9.5 if is_compact else 11)
    ))
    story.append(Spacer(1, 6 if is_compact else 14))

    # ── Section: SCOPE & PRICING TABLE ────────────────────────────────────────
    story.append(Paragraph(
        f'<font name="{FONT_BOLD}" size="{"7.5" if is_compact else "8"}" color="{accent_green}">SCOPE &amp; PRICING</font>',
        ps("ScopeHead", fontSize=7.5 if is_compact else 8, leading=10 if is_compact else 11)
    ))
    story.append(Spacer(1, 3 if is_compact else 4))

    # Table Header
    items_table_data = [
        [
            Paragraph(f'<font name="{FONT_BOLD}" size="{"6.5" if is_compact else "7"}" color="{muted_slate}">#</font>', ps("TH1", fontSize=6.5 if is_compact else 7, alignment=0)),
            Paragraph(f'<font name="{FONT_BOLD}" size="{"6.5" if is_compact else "7"}" color="{muted_slate}">DESCRIPTION</font>', ps("TH2", fontSize=6.5 if is_compact else 7, alignment=0)),
            Paragraph(f'<font name="{FONT_BOLD}" size="{"6.5" if is_compact else "7"}" color="{muted_slate}">QTY</font>', ps("TH3", fontSize=6.5 if is_compact else 7, alignment=1)),
            Paragraph(f'<font name="{FONT_BOLD}" size="{"6.5" if is_compact else "7"}" color="{muted_slate}">RATE</font>', ps("TH4", fontSize=6.5 if is_compact else 7, alignment=2)),
            Paragraph(f'<font name="{FONT_BOLD}" size="{"6.5" if is_compact else "7"}" color="{muted_slate}">AMOUNT</font>', ps("TH5", fontSize=6.5 if is_compact else 7, alignment=2)),
        ]
    ]

    line_items = list(quote.items.all().order_by("id"))
    
    # Fallback sample if quote has no items yet
    if not line_items:
        items_table_data.append([
            Paragraph(f'<font name="{FONT_BOLD}" size="{"7.5" if is_compact else "8"}" color="{ink_slate}">1</font>', ps("TB_N", fontSize=7.5 if is_compact else 8)),
            Paragraph(f'<font name="{FONT_BOLD}" size="{"7.5" if is_compact else "8"}" color="{ink_slate}">{esc(quote.title or "Growth Package")}</font>', ps("TB_D", fontSize=7.5 if is_compact else 8)),
            Paragraph(f'<font name="{FONT_BOLD}" size="{"7.5" if is_compact else "8"}" color="{ink_slate}">1</font>', ps("TB_Q", fontSize=7.5 if is_compact else 8, alignment=1)),
            Paragraph(f'<font name="{FONT_BOLD}" size="{"7.5" if is_compact else "8"}" color="{ink_slate}">{format_currency_inr(quote.total, qcur)}</font>', ps("TB_R", fontSize=7.5 if is_compact else 8, alignment=2)),
            Paragraph(f'<font name="{FONT_BOLD}" size="{"7.5" if is_compact else "8"}" color="{ink_slate}">{format_currency_inr(quote.total, qcur)}</font>', ps("TB_A", fontSize=7.5 if is_compact else 8, alignment=2)),
        ])
    else:
        for idx, item in enumerate(line_items, 1):
            is_inc = getattr(item, "is_included", False)
            item_num = getattr(item, "item_number", "") or str(idx)
            
            # Format quantity
            qty_str = str(item.quantity)
            if getattr(item, "unit", None):
                qty_str = f"{item.quantity} {item.unit}"
            elif is_inc and item.quantity > 1:
                qty_str = str(item.quantity)

            # Description block
            if is_inc:
                desc_html = (
                    f'<font name="{FONT_BOLD}" size="{"7" if is_compact else "7.5"}" color="{ink_slate}">{esc(item.name)}</font>'
                )
                if item.description:
                    desc_html += f'<br/><font size="{"6" if is_compact else "6.5"}" color="{muted_slate}">{esc(item.description)}</font>'
                rate_str = ""
                amt_str = f'<font size="{"6.5" if is_compact else "7"}" color="{muted_slate}"><i>included</i></font>'
                font_name = FONT_REG
            else:
                desc_html = f'<font name="{FONT_BOLD}" size="{"7.5" if is_compact else "8"}" color="{ink_slate}">{esc(item.name)}</font>'
                if item.description:
                    desc_html += f'<br/><font size="{"6" if is_compact else "6.5"}" color="{muted_slate}">{esc(item.description)}</font>'
                rate_str = format_currency_inr(item.unit_price, qcur)
                amt_str = format_currency_inr(item.subtotal, qcur)
                font_name = FONT_BOLD

            items_table_data.append([
                Paragraph(f'<font name="{font_name}" size="{"7" if is_compact else "7.5"}" color="{ink_slate}">{item_num}</font>', ps(f"TN_{idx}", fontSize=7 if is_compact else 7.5)),
                Paragraph(desc_html, ps(f"TD_{idx}", fontSize=7 if is_compact else 7.5, leading=9 if is_compact else 9.5)),
                Paragraph(f'<font size="{"7" if is_compact else "7.5"}" color="{ink_slate}">{qty_str}</font>', ps(f"TQ_{idx}", fontSize=7 if is_compact else 7.5, alignment=1)),
                Paragraph(f'<font size="{"7" if is_compact else "7.5"}" color="{ink_slate}">{rate_str}</font>', ps(f"TR_{idx}", fontSize=7 if is_compact else 7.5, alignment=2)),
                Paragraph(amt_str if is_inc else f'<font name="{font_name}" size="{"7" if is_compact else "7.5"}" color="{ink_slate}">{amt_str}</font>', ps(f"TA_{idx}", fontSize=7 if is_compact else 7.5, alignment=2)),
            ])

    # Totals Rows
    subtotal_str = format_currency_inr(quote.subtotal or quote.total, qcur)
    total_str = format_currency_inr(quote.total, qcur)

    items_table_data.append([
        "", Paragraph(f'<font size="{"7" if is_compact else "7.5"}" color="{ink_slate}">Sub Total</font>', ps("ST1", fontSize=7 if is_compact else 7.5, alignment=2)),
        "", "", Paragraph(f'<font size="{"7" if is_compact else "7.5"}" color="{ink_slate}">{subtotal_str}</font>', ps("ST2", fontSize=7 if is_compact else 7.5, alignment=2))
    ])

    if quote.tax_amount and quote.tax_amount > 0:
        tax_str = format_currency_inr(quote.tax_amount, qcur)
        items_table_data.append([
            "", Paragraph(f'<font size="{"7" if is_compact else "7.5"}" color="{ink_slate}">Tax</font>', ps("TX1", fontSize=7 if is_compact else 7.5, alignment=2)),
            "", "", Paragraph(f'<font size="{"7" if is_compact else "7.5"}" color="{ink_slate}">{tax_str}</font>', ps("TX2", fontSize=7 if is_compact else 7.5, alignment=2))
        ])

    items_table_data.append([
        "", Paragraph(f'<font name="Helvetica-Bold" size="{"7.5" if is_compact else "8"}" color="{ink_slate}">Total</font>', ps("TT1", fontSize=7.5 if is_compact else 8, alignment=2)),
        "", "", Paragraph(f'<font name="Helvetica-Bold" size="{"7.5" if is_compact else "8"}" color="{ink_slate}">{total_str}</font>', ps("TT2", fontSize=7.5 if is_compact else 8, alignment=2))
    ])

    scope_table = Table(items_table_data, colWidths=[28, 272, 60, 90, 90])
    
    total_row_idx = len(items_table_data) - 1
    subtotal_row_idx = total_row_idx - (1 if not (quote.tax_amount and quote.tax_amount > 0) else 2)

    table_styles = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEABOVE", (0, 0), (-1, 0), 0.75, colors.HexColor("#94A3B8")),
        ("LINEBELOW", (0, 0), (-1, 0), 0.75, colors.HexColor("#94A3B8")),
        ("TOPPADDING", (0, 0), (-1, -1), 2.5 if is_compact else 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5 if is_compact else 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 2),
        ("RIGHTPADDING", (0, 0), (-1, -1), 2),
        ("LINEABOVE", (1, subtotal_row_idx), (-1, subtotal_row_idx), 0.5, colors.HexColor("#E2E8F0")),
        ("LINEABOVE", (1, total_row_idx), (-1, total_row_idx), 0.75, colors.HexColor("#94A3B8")),
        ("LINEBELOW", (1, total_row_idx), (-1, total_row_idx), 0.75, colors.HexColor("#94A3B8")),
    ]

    scope_table.setStyle(TableStyle(table_styles))
    story.append(scope_table)
    story.append(Spacer(1, 4 if is_compact else 12))

    # Amount in words
    amount_words = amount_to_words(quote.total, qcur)
    story.append(Paragraph(
        f'<font name="Helvetica-Bold" size="{"6.5" if is_compact else "7"}" color="{ink_slate}">Amount in words: </font>'
        f'<font size="{"6.5" if is_compact else "7"}" color="{ink_slate}">{amount_words}</font>',
        ps("AmtWords", fontSize=6.5 if is_compact else 7, leading=8.5 if is_compact else 9)
    ))

    # ── Section Transition ────────────────────────────────────────────────────
    if not is_compact:
        story.append(PageBreak())
        for item in build_header():
            story.append(item)
    else:
        story.append(Spacer(1, 6))

    # ── Section: PAYMENT SCHEDULE ─────────────────────────────────────────────
    story.append(Paragraph(
        f'<font name="Helvetica-Bold" size="{"7.5" if is_compact else "8"}" color="{accent_green}">PAYMENT SCHEDULE</font>',
        ps("PayScheduleHead", fontSize=7.5 if is_compact else 8, leading=10 if is_compact else 11)
    ))
    story.append(Spacer(1, 2 if is_compact else 4))

    payment_schedule = quote.payment_schedule or []
    if not payment_schedule:
        half_1 = round(float(quote.total) * 0.5, 2)
        half_2 = round(float(quote.total) - half_1, 2)
        payment_schedule = [
            {"milestone": "50% Advance — on confirmation, to commence the project", "amount": half_1},
            {"milestone": "50% Balance — on completion of the monthly scope", "amount": half_2}
        ]

    pay_rows = []
    for p in payment_schedule:
        m_label = p.get("milestone", "")
        m_amt = p.get("amount", 0)
        pay_rows.append([
            Paragraph(f'<font size="{"7" if is_compact else "7.5"}" color="{body_slate}">{esc(m_label)}</font>', ps("PS1", fontSize=7 if is_compact else 7.5)),
            Paragraph(f'<font name="{FONT_BOLD}" size="{"7" if is_compact else "7.5"}" color="{ink_slate}">{format_currency_inr(m_amt, qcur)}</font>', ps("PS2", fontSize=7 if is_compact else 7.5, alignment=2))
        ])

    pay_table = Table(pay_rows, colWidths=[430, 110])
    pay_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 1.5 if is_compact else 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1.5 if is_compact else 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(pay_table)
    story.append(Spacer(1, 6 if is_compact else 12))

    # ── Section: TIMELINE ─────────────────────────────────────────────────────
    story.append(Paragraph(
        f'<font name="{FONT_BOLD}" size="{"7.5" if is_compact else "8"}" color="{accent_green}">TIMELINE</font>',
        ps("TimelineHead", fontSize=7.5 if is_compact else 8, leading=10 if is_compact else 11)
    ))
    story.append(Spacer(1, 2 if is_compact else 4))

    timeline_items = quote.timeline or []
    if not timeline_items:
        timeline_items = [
            {"phase": "Week 1", "description": "Onboarding, brand review, content calendar approval, Google Business Profile optimisation, Meta ads setup"},
            {"phase": "Week 2-3", "description": "Video production and publishing, trending video, regular posting, ad launch and optimisation"},
            {"phase": "Week 4", "description": "Remaining deliverables, campaign optimisation, performance report and recommendations"}
        ]

    timeline_rows = []
    for t in timeline_items:
        p_name = t.get("phase", "")
        p_desc = t.get("description", "")
        timeline_rows.append([
            Paragraph(f'<font name="{FONT_BOLD}" size="{"7" if is_compact else "7.5"}" color="{ink_slate}">{esc(p_name)}</font>', ps("TL1", fontSize=7 if is_compact else 7.5)),
            Paragraph(f'<font size="{"7" if is_compact else "7.5"}" color="{body_slate}">{esc(p_desc)}</font>', ps("TL2", fontSize=7 if is_compact else 7.5, leading=9 if is_compact else 10))
        ])

    timeline_table = Table(timeline_rows, colWidths=[70 if is_compact else 80, 470 if is_compact else 460])
    timeline_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 1.5 if is_compact else 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1.5 if is_compact else 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(timeline_table)
    story.append(Spacer(1, 6 if is_compact else 12))

    # ── 2-Column: CLIENT RESPONSIBILITIES vs EXCLUSIONS ────────────────────────
    resp_items = quote.client_responsibilities or [
        "Access to Instagram, Facebook, Meta Business Manager and Google Business Profile",
        "Logo, brand assets and course details",
        "Availability of premises and staff for video shoots",
        "Content approvals within 2 working days"
    ]
    excl_items = quote.exclusions or [
        "Meta ad spend (paid directly by the client to Meta)",
        "Website development, stock assets, influencer fees",
        "Work beyond the stated scope"
    ]

    resp_html = f'<font name="{FONT_BOLD}" size="{"7.5" if is_compact else "8"}" color="{accent_green}">CLIENT RESPONSIBILITIES</font><br/>'
    for r in resp_items:
        resp_html += f'<font size="{"6.5" if is_compact else "7.5"}" color="{body_slate}">• &nbsp;{esc(r)}</font><br/>'

    excl_html = f'<font name="{FONT_BOLD}" size="{"7.5" if is_compact else "8"}" color="{accent_green}">EXCLUSIONS</font><br/>'
    for e in excl_items:
        excl_html += f'<font size="{"6.5" if is_compact else "7.5"}" color="{body_slate}">• &nbsp;{esc(e)}</font><br/>'

    resp_excl_table = Table([
        [Paragraph(resp_html, ps("RespP", fontSize=6.5 if is_compact else 7.5, leading=9 if is_compact else 11)),
         Paragraph(excl_html, ps("ExclP", fontSize=6.5 if is_compact else 7.5, leading=9 if is_compact else 11))]
    ], colWidths=[270, 270])
    resp_excl_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(resp_excl_table)
    story.append(Spacer(1, 6 if is_compact else 12))

    # ── Section: TERMS & CONDITIONS ───────────────────────────────────────────
    terms = quote.terms_conditions or [
        "A 50% advance payment is required to commence the project; the balance is payable on completion.",
        "The client must provide all necessary account credentials and materials on time.",
        "Any work beyond the scope of this quotation will be charged additionally.",
        "Each deliverable includes up to two rounds of revisions.",
        "This quotation is valid for 15 days from the date of issue.",
        "Advertising and social media results depend on platform and market factors and are not guaranteed."
    ]

    terms_html = f'<font name="{FONT_BOLD}" size="{"7.5" if is_compact else "8"}" color="{accent_green}">TERMS &amp; CONDITIONS</font><br/>'
    for t in terms:
        terms_html += f'<font size="{"6.5" if is_compact else "7.5"}" color="{body_slate}">• &nbsp;{esc(t)}</font><br/>'

    story.append(Paragraph(terms_html, ps("TermsP", fontSize=6.5 if is_compact else 7.5, leading=9 if is_compact else 11)))
    story.append(Spacer(1, 6 if is_compact else 14))

    # ── 2-Column Bottom: BANK DETAILS vs AUTHORIZED SIGNATORY ─────────────────
    bank_name = getattr(settings, "bank_name", None) or "HDFC Bank"
    bank_acc_name = getattr(settings, "bank_account_name", None) or company_name
    bank_acc_no = getattr(settings, "bank_account_number", None) or "50200109172854"
    bank_ifsc = getattr(settings, "bank_routing_number", None) or "HDFC0008363"
    upi_id = getattr(settings, "upi_id", None) or "info@brandlumeo.com"

    is_inr = qcur == "INR"

    # Generate UPI QR Code
    tot_val = float(quote.total or 0)
    upi_payload = f"upi://pay?pa={upi_id}&pn={urllib.parse.quote(company_name)}&am={tot_val:.2f}&cu=INR"
    qr_widget = QrCodeWidget(upi_payload)
    qr_size = 44 if is_compact else 56
    qr_widget.barWidth = qr_size
    qr_widget.barHeight = qr_size
    qr_widget.qrVersion = 1
    qr_drawing = Drawing(qr_size, qr_size)
    qr_drawing.add(qr_widget)

    bank_details_html = (
        f'<font size="{"7" if is_compact else "7.5"}" color="{muted_slate}">Account Name:</font> &nbsp;'
        f'<font name="{FONT_REG}" size="{"7" if is_compact else "7.5"}" color="{ink_slate}">{esc(bank_acc_name)}</font><br/>'
        f'<font size="{"7" if is_compact else "7.5"}" color="{muted_slate}">Bank:</font> &nbsp;'
        f'<font name="{FONT_REG}" size="{"7" if is_compact else "7.5"}" color="{ink_slate}">{esc(bank_name)}</font><br/>'
        f'<font size="{"7" if is_compact else "7.5"}" color="{muted_slate}">Account No.:</font> &nbsp;'
        f'<font name="{FONT_REG}" size="{"7" if is_compact else "7.5"}" color="{ink_slate}">{esc(bank_acc_no)}</font><br/>'
        f'<font size="{"7" if is_compact else "7.5"}" color="{muted_slate}">{"IFSC" if is_inr else "SWIFT / Routing"}:</font> &nbsp;'
        f'<font name="{FONT_REG}" size="{"7" if is_compact else "7.5"}" color="{ink_slate}">{esc(bank_ifsc)}</font>'
    )
    if is_inr:
        # UPI only settles in INR, so the QR is shown on rupee quotes only.
        bank_details_html += (
            f'<br/><font size="{"7" if is_compact else "7.5"}" color="{muted_slate}">UPI:</font> &nbsp;'
            f'<font size="{"7" if is_compact else "7.5"}" color="{ink_slate}">Scan QR to pay</font>'
        )

    bank_para = Paragraph(bank_details_html, ps("BankP", fontSize=7 if is_compact else 7.5, leading=9.5 if is_compact else 10.5))
    if is_inr:
        bank_inner_table = Table([[qr_drawing, bank_para]], colWidths=[qr_size + 8, 260 - (qr_size + 8)])
    else:
        bank_inner_table = Table([[bank_para]], colWidths=[260])
    bank_inner_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))

    bank_block = [
        Paragraph(f'<font name="Helvetica-Bold" size="{"7.5" if is_compact else "8"}" color="{accent_green}">BANK DETAILS</font>', ps("BankHead", fontSize=7.5 if is_compact else 8, leading=9 if is_compact else 10)),
        Spacer(1, 2 if is_compact else 3),
        bank_inner_table
    ]

    sig_lead = "<br/>" if is_compact else "<br/><br/><br/>"
    signatory_html = (
        f'<font name="Helvetica-Bold" size="{"7.5" if is_compact else "8"}" color="{ink_slate}">For {company_name.upper()}</font>{sig_lead}'
        f'<font size="7.5" color="{muted_slate}">____________________________________</font><br/>'
        f'<font size="{"6.5" if is_compact else "7"}" color="{muted_slate}">Authorized Signatory</font>'
    )

    bottom_grid = Table([
        [bank_block, Paragraph(signatory_html, ps("SigRight", fontSize=7 if is_compact else 7.5, leading=9.5 if is_compact else 10.5, alignment=2))]
    ], colWidths=[290, 250])
    bottom_grid.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(bottom_grid)
    story.append(Spacer(1, 6 if is_compact else 14))

    # ── Section: CLIENT ACCEPTANCE ────────────────────────────────────────────
    story.append(Paragraph(
        f'<font name="Helvetica-Bold" size="{"7.5" if is_compact else "8"}" color="{accent_green}">CLIENT ACCEPTANCE</font>',
        ps("AcceptHead", fontSize=7.5 if is_compact else 8, leading=9 if is_compact else 10)
    ))
    story.append(Spacer(1, 1 if is_compact else 2))
    story.append(Paragraph(
        f'<font size="{"6.5" if is_compact else "7"}" color="{body_slate}">We accept the scope, pricing and terms of this quotation.</font>',
        ps("AcceptBody", fontSize=6.5 if is_compact else 7, leading=8.5 if is_compact else 9)
    ))
    story.append(Spacer(1, 6 if is_compact else 18))

    acc_fs = "6.5" if is_compact else "7"
    acceptance_table = Table([
        [
            Paragraph(f'<font size="{acc_fs}" color="#CBD5E1">________________________________</font><br/><font size="{acc_fs}" color="#64748B">Name &amp; Designation</font>', ps("AC1", fontSize=6.5 if is_compact else 7)),
            Paragraph(f'<font size="{acc_fs}" color="#CBD5E1">________________________________</font><br/><font size="{acc_fs}" color="#64748B">Signature &amp; Seal</font>', ps("AC2", fontSize=6.5 if is_compact else 7, alignment=1)),
            Paragraph(f'<font size="{acc_fs}" color="#CBD5E1">____________________</font><br/><font size="{acc_fs}" color="#64748B">Date</font>', ps("AC3", fontSize=6.5 if is_compact else 7, alignment=2)),
        ]
    ], colWidths=[200, 200, 140])
    acceptance_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(acceptance_table)

    return story


def generate_agency_quote_pdf_response(quote):
    """
    Renders an executive Agency Statement of Work (SOW) Quotation PDF
    matching the exact BrandLumeo visual specification and layout.
    Dynamically adapts between a sleek single-page quotation for standard scopes (<= 3 items)
    and a comprehensive 2-page Agency proposal for full package deliverables.
    """
    comp = quote.company
    company_name = getattr(comp, "legal_name", None) or getattr(comp, "name", None) or "BrandLumeo Marketing LLP"
    line_items_count = quote.items.count()
    can_be_compact = line_items_count <= 3 and len(quote.overview or "") < 600

    def render_pdf(is_compact):
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            leftMargin=36,
            rightMargin=36,
            topMargin=24 if is_compact else 36,
            bottomMargin=24 if is_compact else 36
        )
        story = _build_quote_story(quote, is_compact=is_compact)
        canvasmaker = lambda *args, **kwargs: NumberedCanvas(*args, footer_company_name=company_name, **kwargs)
        doc.build(story, canvasmaker=canvasmaker)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes, doc.page

    if can_be_compact:
        pdf_bytes, page_count = render_pdf(is_compact=True)
        # If it genuinely fit onto 1 page, use it! Otherwise fallback to 2-page layout
        if page_count > 1:
            pdf_bytes, _ = render_pdf(is_compact=False)
    else:
        pdf_bytes, _ = render_pdf(is_compact=False)

    clean_num = quote.quote_number.replace("/", "_")
    response = HttpResponse(pdf_bytes, content_type="application/pdf")
    response["Content-Disposition"] = f'inline; filename="Quotation_{clean_num}.pdf"'
    response["Content-Length"] = len(pdf_bytes)
    return response
