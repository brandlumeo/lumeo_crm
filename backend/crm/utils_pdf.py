def generate_receipt_pdf_response(payment):
    from django.http import HttpResponse
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
        HRFlowable, Image as RLImage, KeepTogether
    )
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    import io
    import urllib.request
    from datetime import datetime, date

    # ── Amount to Words Helper ─────────────────────────────────────────────────

    def amount_to_words(amount, currency_code="INR"):
        try:
            num = round(float(amount), 2)
        except Exception:
            return ""
        if num <= 0:
            return "Zero Only"

        ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
                "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
                "Seventeen", "Eighteen", "Nineteen"]
        tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

        def two_digits(n):
            if n < 20:
                return ones[n]
            return tens[n // 10] + ("" if n % 10 == 0 else "-" + ones[n % 10])

        def three_digits(n):
            h = n // 100
            rem = n % 100
            res = ""
            if h > 0:
                res += ones[h] + " Hundred"
            if rem > 0:
                res += (" and " if res else "") + two_digits(rem)
            return res

        int_part = int(num)
        dec_part = int(round((num - int_part) * 100))
        currency = (currency_code or "INR").upper()

        if currency == "INR":
            crores = int_part // 10000000
            rem = int_part % 10000000
            lakhs = rem // 100000
            rem = rem % 100000
            thousands = rem // 1000
            rem = rem % 1000
            parts = []
            if crores > 0:
                parts.append(two_digits(crores) + " Crore")
            if lakhs > 0:
                parts.append(two_digits(lakhs) + " Lakh")
            if thousands > 0:
                parts.append(two_digits(thousands) + " Thousand")
            if rem > 0:
                parts.append(three_digits(rem))
            words = " ".join(parts).strip()
            main_unit, sub_unit = "Rupees", "Paise"
        else:
            billions = int_part // 1000000000
            rem = int_part % 1000000000
            millions = rem // 1000000
            rem = rem % 1000000
            thousands = rem // 1000
            rem = rem % 1000
            parts = []
            if billions > 0:
                parts.append(three_digits(billions) + " Billion")
            if millions > 0:
                parts.append(three_digits(millions) + " Million")
            if thousands > 0:
                parts.append(three_digits(thousands) + " Thousand")
            if rem > 0:
                parts.append(three_digits(rem))
            words = " ".join(parts).strip()
            curr_units = {
                "USD": ("US Dollars", "Cents"),
                "EUR": ("Euros", "Cents"),
                "GBP": ("Pounds Sterling", "Pence"),
                "AED": ("UAE Dirhams", "Fils"),
                "CAD": ("Canadian Dollars", "Cents"),
                "AUD": ("Australian Dollars", "Cents"),
                "SGD": ("Singapore Dollars", "Cents"),
            }
            main_unit, sub_unit = curr_units.get(currency, (currency, "Cents"))

        res = f"{words} {main_unit}"
        if dec_part > 0:
            res += f" and {two_digits(dec_part)} {sub_unit}"
        return res + " Only"

    # ── Formatting Helpers ─────────────────────────────────────────────────────

    CURRENCY_SYMBOLS = {
        "INR": "Rs. ", "USD": "$", "EUR": "€", "GBP": "£",
        "AED": "AED ", "SGD": "S$", "AUD": "A$", "CAD": "C$",
    }

    def fmt_currency(amount, currency_code):
        symbol = CURRENCY_SYMBOLS.get((currency_code or "").upper(),
                                      f"{currency_code} " if currency_code else "")
        try:
            return f"{symbol}{float(amount):,.2f}"
        except Exception:
            return f"{symbol}{amount}"

    def safe(val, fallback=None):
        if val is None or str(val).strip() in ("", "-"):
            return fallback
        return str(val).strip()

    def fmt_date(d):
        if not d:
            return "—"
        try:
            if isinstance(d, (datetime, date)):
                return d.strftime("%d %b %Y")
            dt = datetime.strptime(str(d).strip()[:10], "%Y-%m-%d")
            return dt.strftime("%d %b %Y")
        except Exception:
            return str(d)

    def format_title(val):
        if not val:
            return ""
        val = str(val).strip()
        return val.title() if val.islower() else val

    # ── Data Extraction ────────────────────────────────────────────────────────

    invoice   = payment.invoice
    comp      = invoice.company
    customer  = invoice.customer
    settings  = getattr(comp, "invoice_settings", None)
    currency  = (invoice.currency
                 or (settings.currency if settings else None)
                 or comp.currency or "INR")
    is_cheque = payment.payment_method in ("Cheque", "Check")

    raw_accent = "#1E3A5F"
    if settings:
        raw_accent = getattr(settings, "template_accent_color", "#1E3A5F") or "#1E3A5F"

    accent      = colors.HexColor(raw_accent)
    border_col  = colors.HexColor("#E2E8F0")
    light_card  = colors.HexColor("#F8FAFC")
    green_bg    = colors.HexColor("#DCFCE7")
    green_bord  = colors.HexColor("#86EFAC")
    green_text  = colors.HexColor("#15803D")
    amber_bg    = colors.HexColor("#FEF3C7")
    amber_bord  = colors.HexColor("#FCD34D")
    amber_text  = colors.HexColor("#B45309")

    # Clean Company Address (avoid repeating company name if already in line 1)
    addr1 = getattr(comp, "address_line1", None) or ""
    if addr1 and addr1.lower().startswith(comp.name.lower()):
        addr1 = addr1[len(comp.name):].lstrip(" ,-\n\r")

    comp_address_lines = []
    if addr1:
        comp_address_lines.append(addr1)
    addr2 = getattr(comp, "address_line2", None)
    if addr2 and addr2.strip():
        comp_address_lines.append(addr2.strip())

    city_state_zip = ", ".join(filter(None, [
        getattr(comp, "city", None),
        getattr(comp, "state", None),
        getattr(comp, "postal_code", None),
    ]))
    country = getattr(comp, "country", None)
    loc_parts = []
    if city_state_zip:
        loc_parts.append(city_state_zip)
    if country:
        loc_parts.append(country)
    if loc_parts:
        comp_address_lines.append(", ".join(loc_parts))

    comp_email   = getattr(comp, "company_email", None) or ""
    comp_website = getattr(comp, "company_website", None) or ""
    comp_tax_id  = None
    tax_id_label = "Tax ID"
    reg_number   = None
    if settings:
        comp_tax_id  = getattr(settings, "company_tax_id", None) or getattr(comp, "tax_id", None)
        tax_id_label = getattr(comp, "tax_id_label", None) or "GSTIN / Tax ID"
        reg_number   = getattr(settings, "company_registration_number", None)

    footer_text = "Thank you for your business."
    if settings:
        footer_text = getattr(settings, "footer_text", None) or footer_text

    # ── Document Setup ─────────────────────────────────────────────────────────

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=26,
        bottomMargin=26,
    )

    styles = getSampleStyleSheet()

    def ps(name, **kw):
        if "fontSize" in kw and "leading" not in kw:
            kw["leading"] = int(kw["fontSize"] * 1.3)
        return ParagraphStyle(name, parent=styles["Normal"], **kw)

    story = []

    # ── 1. Top Brand Accent Stripe ─────────────────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=3.5, color=accent, spaceBefore=0, spaceAfter=14))

    # ── 2. Header: Logo & Receipt Title ────────────────────────────────────────
    logo_img = None
    logo_url = getattr(settings, "invoice_logo", None) if settings else None
    if logo_url:
        try:
            req      = urllib.request.Request(logo_url, headers={"User-Agent": "Mozilla/5.0"})
            img_data = io.BytesIO(urllib.request.urlopen(req, timeout=5).read())
            logo_img = RLImage(img_data, width=140, height=45, kind="proportional")
        except Exception:
            pass

    if not logo_img:
        logo_img = Paragraph(
            f'<font name="Helvetica-Bold" size="16" color="{raw_accent}">{comp.name}</font>',
            ps("LogoText", fontSize=16, leading=20),
        )

    receipt_no_disp = safe(payment.receipt_number, "—")
    payment_date_disp = fmt_date(payment.payment_date)

    title_block = Paragraph(
        '<font name="Helvetica-Bold" size="18" color="#0F172A">PAYMENT RECEIPT</font><br/>'
        f'<font size="9" color="#64748B">Receipt No: </font>'
        f'<font name="Helvetica-Bold" size="9" color="#0F172A">#{receipt_no_disp}</font>'
        f'&nbsp;&nbsp;|&nbsp;&nbsp;'
        f'<font size="9" color="#64748B">Date: </font>'
        f'<font name="Helvetica-Bold" size="9" color="#0F172A">{payment_date_disp}</font>',
        ps("HeaderRight", fontSize=9, leading=15, alignment=2),
    )

    header_tbl = Table([[logo_img, title_block]], colWidths=[270, 270])
    header_tbl.setStyle(TableStyle([
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(header_tbl)
    story.append(HRFlowable(width="100%", thickness=0.8, color=border_col, spaceBefore=2, spaceAfter=14))

    # ── 3. Executive Hero Summary Card ─────────────────────────────────────────
    amt_in_words = amount_to_words(payment.amount, currency)
    amt_str      = fmt_currency(payment.amount, currency)
    amount_due   = float(invoice.amount_due)
    is_paid      = amount_due <= 0

    status_txt   = "PAID IN FULL" if is_paid else "PARTIAL PAYMENT"
    badge_bg     = green_bg if is_paid else amber_bg
    badge_bord   = green_bord if is_paid else amber_bord
    badge_hex    = "#15803D" if is_paid else "#B45309"

    badge_p = Paragraph(
        f'<font name="Helvetica-Bold" size="9" color="{badge_hex}">{status_txt}</font>',
        ps("BadgeP", fontSize=9, leading=11, alignment=1),
    )
    badge_table = Table([[badge_p]], colWidths=[110])
    badge_table.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), badge_bg),
        ("BOX",           (0, 0), (-1, -1), 0.8, badge_bord),
        ("TOPPADDING",    (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 8),
        ("ALIGN",         (0, 0), (-1, -1), "CENTER"),
    ]))

    hero_left = [
        Paragraph('<font size="8" color="#64748B"><b>TOTAL AMOUNT RECEIVED</b></font>',
                  ps("HL1", fontSize=8, leading=11)),
        Spacer(1, 4),
        Paragraph(f'<font name="Helvetica-Bold" size="22" color="#0F172A">{amt_str}</font>',
                  ps("HL2", fontSize=22, leading=26)),
        Spacer(1, 4),
        Paragraph(f'<font size="8" color="#475569"><b>Amount in Words:</b> <i>{amt_in_words}</i></font>',
                  ps("HL3", fontSize=8, leading=12)),
    ]
    hero_right = [
        badge_table,
        Spacer(1, 8),
        Paragraph(f'<font size="8" color="#64748B">Towards Invoice: <b>#{safe(invoice.invoice_number, "—")}</b></font>',
                  ps("HR1", fontSize=8, leading=12, alignment=2)),
    ]

    hero_tbl = Table([[hero_left, hero_right]], colWidths=[380, 160])
    hero_tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), light_card),
        ("BOX",           (0, 0), (-1, -1), 1, border_col),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
        ("LEFTPADDING",   (0, 0), (-1, -1), 16),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 16),
    ]))
    story.append(hero_tbl)
    story.append(Spacer(1, 14))

    # ── 4. Parties Section (FROM & RECEIVED WITH THANKS FROM) ───────────────────
    from_lines = [
        Paragraph('<font size="7" color="#94A3B8"><b>PAYMENT RECEIVED BY (ISSUER)</b></font>',
                  ps("PHead1", fontSize=7, leading=10)),
        Spacer(1, 2),
        Paragraph(f'<font name="Helvetica-Bold" size="10" color="#0F172A">{comp.name}</font>',
                  ps("PName1", fontSize=10, leading=13)),
    ]
    for l in comp_address_lines:
        from_lines.append(Paragraph(f'<font size="8" color="#475569">{l}</font>',
                                    ps(f"PAddr_{l[:6]}", fontSize=8, leading=11)))

    contact_parts = " | ".join(filter(None, [comp_email, comp_website]))
    if contact_parts:
        from_lines.append(Paragraph(f'<font size="8" color="#64748B">{contact_parts}</font>',
                                    ps("PCont", fontSize=8, leading=11)))

    tax_reg = []
    if comp_tax_id:
        tax_reg.append(f"{tax_id_label}: {comp_tax_id}")
    if reg_number:
        tax_reg.append(f"Reg No: {reg_number}")
    if tax_reg:
        from_lines.append(Paragraph(f'<font size="8" color="#64748B">{" | ".join(tax_reg)}</font>',
                                    ps("PTax", fontSize=8, leading=11)))

    cust_name = format_title(customer.name) or "Valued Customer"
    to_lines = [
        Paragraph('<font size="7" color="#94A3B8"><b>RECEIVED WITH THANKS FROM</b></font>',
                  ps("PHead2", fontSize=7, leading=10)),
        Spacer(1, 2),
        Paragraph(f'<font name="Helvetica-Bold" size="10" color="#0F172A">{cust_name}</font>',
                  ps("PName2", fontSize=10, leading=13)),
    ]

    # Customer Company Name if available
    cust_company_name = getattr(customer, "company_name", None)
    if not cust_company_name and hasattr(customer, "company") and customer.company != comp:
        cust_company_name = getattr(customer.company, "name", None)
    if cust_company_name:
        to_lines.append(Paragraph(f'<font size="8" color="#475569"><b>{cust_company_name}</b></font>',
                                  ps("PCustComp", fontSize=8, leading=11)))

    if customer.email:
        to_lines.append(Paragraph(f'<font size="8" color="#475569">{customer.email}</font>',
                                  ps("PCustEmail", fontSize=8, leading=11)))
    if customer.phone:
        to_lines.append(Paragraph(f'<font size="8" color="#475569">{customer.phone}</font>',
                                  ps("PCustPhone", fontSize=8, leading=11)))

    # Customer Address if available
    cust_addr = None
    if hasattr(customer, "custom_data") and isinstance(customer.custom_data, dict):
        cust_addr = customer.custom_data.get("address")
    if cust_addr:
        to_lines.append(Paragraph(f'<font size="8" color="#475569">{cust_addr}</font>',
                                  ps("PCustAddr", fontSize=8, leading=11)))

    parties_tbl = Table([[from_lines, to_lines]], colWidths=[290, 250])
    parties_tbl.setStyle(TableStyle([
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING",   (0, 0), (-1, -1), 0),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
        ("TOPPADDING",    (0, 0), (-1, -1), 1),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
    ]))
    story.append(parties_tbl)
    story.append(Spacer(1, 14))

    # ── 5. Payment & Clearance Ledger ──────────────────────────────────────────
    story.append(Paragraph(
        '<font name="Helvetica-Bold" size="10" color="#0F172A">Payment & Clearance Details</font>',
        ps("LedgerHead", fontSize=10, leading=13)
    ))
    story.append(Spacer(1, 6))

    def row(label, val, bold=False, color_hex="#0F172A"):
        fn = "Helvetica-Bold" if bold else "Helvetica"
        return [
            Paragraph(f'<font size="9" color="#64748B">{label}</font>',
                      ps(f"L_{label}", fontSize=9, leading=12)),
            Paragraph(f'<font name="{fn}" size="9" color="{color_hex}">{val}</font>',
                      ps(f"V_{label}", fontSize=9, leading=12)),
        ]

    method_name = "Cheque" if is_cheque else safe(payment.payment_method, "—")
    table_data  = [row("Payment Method", method_name, bold=True)]

    txn_val = safe(payment.transaction_id)
    if txn_val:
        txn_label = "Cheque No. / Instrument #" if is_cheque else "Transaction ID / Reference"
        table_data.append(row(txn_label, txn_val, bold=True))

    table_data.append(row("Payment Date", payment_date_disp))

    if payment.notes and payment.notes.strip():
        notes_label = "Cheque Details / Notes" if is_cheque else "Payment Notes"
        table_data.append(row(notes_label, payment.notes.strip()))

    table_data.append(row("Applied to Invoice", f"#{safe(invoice.invoice_number, '—')}"))
    table_data.append(row("Original Invoice Total", fmt_currency(invoice.total, currency)))
    table_data.append(row("Amount Paid (This Voucher)", amt_str, bold=True))

    if is_paid:
        table_data.append(row(
            "Remaining Balance Due",
            f"{fmt_currency(0, currency)} (Fully Settled)",
            bold=True, color_hex="#15803D"
        ))
    else:
        table_data.append(row(
            "Remaining Balance Due",
            fmt_currency(amount_due, currency),
            bold=True, color_hex="#DC2626"
        ))

    dt_styles = [
        ("FONTNAME",      (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE",      (0, 0), (-1, -1), 9),
        ("TOPPADDING",    (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING",   (0, 0), (-1, -1), 12),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 12),
        ("BOX",           (0, 0), (-1, -1), 0.7, border_col),
        ("LINEBELOW",     (0, 0), (-1, -2), 0.4, border_col),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
    ]
    for i in range(len(table_data)):
        bg = light_card if i % 2 == 0 else colors.white
        dt_styles.append(("BACKGROUND", (0, i), (-1, i), bg))

    # Highlight summary divider
    dt_styles.append(("LINEABOVE", (0, len(table_data) - 3), (-1, len(table_data) - 3), 1, accent))

    dt_table = Table(table_data, colWidths=[220, 320])
    dt_table.setStyle(TableStyle(dt_styles))
    story.append(dt_table)
    story.append(Spacer(1, 14))

    # ── 6. Terms & Authorized Signatory Block ──────────────────────────────────
    disclaimer_lines = [
        Paragraph('<font name="Helvetica-Bold" size="8" color="#475569">PAYMENT TERMS & ACKNOWLEDGMENT</font>',
                  ps("TermsH", fontSize=8, leading=11)),
        Spacer(1, 3),
        Paragraph('<font size="8" color="#64748B">- Cheque payments are subject to bank realization / clearance.</font>',
                  ps("T1", fontSize=8, leading=11)),
        Paragraph('<font size="8" color="#64748B">- This document serves as an official receipt of payment acknowledgment.</font>',
                  ps("T2", fontSize=8, leading=11)),
        Paragraph(f'<font size="8" color="#64748B">- {footer_text}</font>',
                  ps("T3", fontSize=8, leading=11)),
    ]

    sig_content = [
        Paragraph(f'<font size="8" color="#475569">For <b>{comp.name}</b></font>',
                  ps("SigH", fontSize=8, leading=11, alignment=1)),
    ]

    # If digital signature image configured, show it
    sig_img_rendered = False
    auth_sig_url = getattr(settings, "authorised_signatory_signature", None) if settings else None
    if auth_sig_url:
        try:
            req      = urllib.request.Request(auth_sig_url, headers={"User-Agent": "Mozilla/5.0"})
            sig_data = io.BytesIO(urllib.request.urlopen(req, timeout=5).read())
            sig_img  = RLImage(sig_data, width=110, height=36, kind="proportional")
            sig_content.append(Spacer(1, 4))
            sig_content.append(sig_img)
            sig_img_rendered = True
        except Exception:
            pass

    if not sig_img_rendered:
        sig_content.append(Spacer(1, 36))

    sig_content.append(HRFlowable(
        width="75%", thickness=0.8, color=colors.HexColor("#94A3B8"),
        hAlign="CENTER", spaceBefore=2, spaceAfter=4,
    ))
    sig_content.append(Paragraph(
        '<font name="Helvetica-Bold" size="8" color="#475569">Authorized Signatory</font>',
        ps("SigA", fontSize=8, leading=11, alignment=1)
    ))

    sig_box = Table([[sig_content]], colWidths=[200])
    sig_box.setStyle(TableStyle([
        ("VALIGN",       (0, 0), (-1, -1), "TOP"),
        ("ALIGN",        (0, 0), (-1, -1), "RIGHT"),
        ("LEFTPADDING",  (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))

    bottom_tbl = Table([[disclaimer_lines, sig_box]], colWidths=[330, 210])
    bottom_tbl.setStyle(TableStyle([
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING",   (0, 0), (-1, -1), 0),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
        ("TOPPADDING",    (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(bottom_tbl)
    story.append(Spacer(1, 14))

    # ── 7. Footer ──────────────────────────────────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=0.6, color=border_col, spaceBefore=0, spaceAfter=6))
    footer_tbl = Table([[
        Paragraph('<font size="8" color="#94A3B8">This is a verified computer-generated payment receipt.</font>',
                  ps("FL", fontSize=8, leading=10)),
        Paragraph(f'<font size="8" color="#94A3B8">Receipt #{receipt_no_disp} | Page 1 of 1</font>',
                  ps("FR", fontSize=8, leading=10, alignment=2)),
    ]], colWidths=[350, 190])
    footer_tbl.setStyle(TableStyle([
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING",   (0, 0), (-1, -1), 0),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
    ]))
    story.append(footer_tbl)
    story.append(HRFlowable(width="100%", thickness=2, color=accent, spaceBefore=4, spaceAfter=0))

    # ── 8. Build PDF Response ──────────────────────────────────────────────────
    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()

    response = HttpResponse(pdf_bytes, content_type="application/pdf")
    filename = f"Receipt_{payment.receipt_number}.pdf"
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response
