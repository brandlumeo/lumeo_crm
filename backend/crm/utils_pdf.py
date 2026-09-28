def generate_receipt_pdf_response(payment):
    from django.http import HttpResponse
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import (
        BaseDocTemplate, Frame, PageTemplate,
        Paragraph, Spacer, Table, TableStyle,
        Image as RLImage, HRFlowable,
    )
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    import io
    import urllib.request

    # ── Helpers ────────────────────────────────────────────────────────────────

    CURRENCY_SYMBOLS = {
        "INR": "Rs.", "USD": "$", "EUR": "€", "GBP": "£",
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

    # ── Data ───────────────────────────────────────────────────────────────────

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
    accent     = colors.HexColor(raw_accent)
    dark       = colors.HexColor("#111827")
    mid        = colors.HexColor("#6B7280")
    light_bg   = colors.HexColor("#F9FAFB")
    border_col = colors.HexColor("#E5E7EB")
    green      = colors.HexColor("#16A34A")
    green_bg   = colors.HexColor("#F0FDF4")
    green_dark = colors.HexColor("#14532D")

    # Company info lines (split cleanly)
    addr_parts = [
        getattr(comp, "address_line1", None),
        getattr(comp, "address_line2", None),
    ]
    city_state = ", ".join(filter(None, [
        getattr(comp, "city", None),
        getattr(comp, "state", None),
        getattr(comp, "postal_code", None),
    ]))
    if city_state:
        addr_parts.append(city_state)
    country = getattr(comp, "country", None)
    if country:
        addr_parts.append(country)

    comp_email   = getattr(comp, "company_email", None) or ""
    comp_website = getattr(comp, "company_website", None) or ""
    comp_tax_id  = None
    tax_id_label = "Tax ID"
    reg_number   = None
    if settings:
        comp_tax_id  = getattr(settings, "company_tax_id", None)
        tax_id_label = getattr(comp, "tax_id_label", None) or "Tax ID"
        reg_number   = getattr(settings, "company_registration_number", None)

    footer_text = "Thank you for your business."
    if settings:
        footer_text = getattr(settings, "footer_text", None) or footer_text

    # ── Page geometry ──────────────────────────────────────────────────────────

    PAGE_W, PAGE_H = letter
    MARGIN = 38

    # ── Canvas decorator for header / footer / watermark ──────────────────────

    def draw_page_decorations(c, doc):
        c.saveState()

        # Top accent bar
        c.setFillColor(accent)
        c.rect(0, PAGE_H - 7, PAGE_W, 7, fill=1, stroke=0)

        # Bottom accent bar
        c.setFillColor(accent)
        c.rect(0, 0, PAGE_W, 5, fill=1, stroke=0)

        # Very faint diagonal watermark — well behind content
        c.setFillColorRGB(0.88, 0.88, 0.88, alpha=0.18)
        c.setFont("Helvetica-Bold", 80)
        c.saveState()
        c.translate(PAGE_W / 2, PAGE_H / 2)
        c.rotate(35)
        c.drawCentredString(0, 0, "RECEIPT")
        c.restoreState()

        c.restoreState()

    # ── Document setup ─────────────────────────────────────────────────────────

    buffer = io.BytesIO()

    frame = Frame(
        MARGIN, MARGIN + 10,
        PAGE_W - 2 * MARGIN,
        PAGE_H - 2 * MARGIN - 20,
        id="main",
    )

    doc = BaseDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=MARGIN,
        leftMargin=MARGIN,
        topMargin=MARGIN + 20,
        bottomMargin=MARGIN + 10,
    )
    doc.addPageTemplates([PageTemplate(
        id="receipt",
        frames=[frame],
        onPage=draw_page_decorations,
    )])

    styles = getSampleStyleSheet()
    story  = []

    # ── Style helper ───────────────────────────────────────────────────────────

    def ps(name, **kw):
        return ParagraphStyle(name, parent=styles["Normal"], **kw)

    # ── HEADER: Logo + Title ───────────────────────────────────────────────────

    logo_img = None
    logo_url = getattr(settings, "invoice_logo", None) if settings else None
    if logo_url:
        try:
            req      = urllib.request.Request(logo_url, headers={"User-Agent": "Mozilla/5.0"})
            img_data = io.BytesIO(urllib.request.urlopen(req, timeout=5).read())
            logo_img = RLImage(img_data, width=130, height=45, kind="proportional")
        except Exception:
            pass

    if not logo_img:
        logo_img = Paragraph(
            f'<font name="Helvetica-Bold" size="18" color="{raw_accent}">{comp.name}</font>',
            ps("LogoText"),
        )

    title_block = Paragraph(
        '<font name="Helvetica-Bold" size="22" color="#111827">PAYMENT RECEIPT</font><br/>'
        f'<font size="10" color="#6B7280">#{safe(payment.receipt_number, "—")}</font>',
        ps("TitleBlock", alignment=2),
    )

    header_tbl = Table([[logo_img, title_block]], colWidths=[260, 240])
    header_tbl.setStyle(TableStyle([
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING",    (0, 0), (-1, -1), 4),
    ]))
    story.append(header_tbl)
    story.append(HRFlowable(
        width="100%", thickness=1.5, color=accent,
        spaceAfter=14, spaceBefore=2,
    ))

    # ── META STRIP: date / invoice ref / status badge ──────────────────────────

    amount_due = float(invoice.amount_due)
    if amount_due <= 0:
        status_text  = "PAID"
        status_color = "#15803D"
        status_bg    = "#DCFCE7"
        status_border= "#86EFAC"
    else:
        status_text  = "PARTIAL"
        status_color = "#B45309"
        status_bg    = "#FEF3C7"
        status_border= "#FCD34D"

    meta_data = [[
        Paragraph(
            '<font size="7" color="#9CA3AF">PAYMENT DATE</font><br/>'
            f'<font name="Helvetica-Bold" size="10" color="#111827">{safe(payment.payment_date, "—")}</font>',
            ps("M1"),
        ),
        Paragraph(
            '<font size="7" color="#9CA3AF">INVOICE REFERENCE</font><br/>'
            f'<font name="Helvetica-Bold" size="10" color="#111827">{safe(invoice.invoice_number, "—")}</font>',
            ps("M2"),
        ),
        Paragraph(
            f'<font name="Helvetica-Bold" size="10" color="{status_color}">{status_text}</font>',
            ps("M3", alignment=2),
        ),
    ]]
    meta_tbl = Table(meta_data, colWidths=[150, 210, 140])
    meta_tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), colors.HexColor(light_bg.hexval())),
        ("BOX",           (0, 0), (-1, -1), 0.6, border_col),
        ("TOPPADDING",    (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
        ("LEFTPADDING",   (0, 0), (-1, -1), 14),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 14),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        # Status cell own background
        ("BACKGROUND",    (2, 0), (2, 0), colors.HexColor(status_bg)),
        ("BOX",           (2, 0), (2, 0), 0.6, colors.HexColor(status_border)),
    ]))
    story.append(meta_tbl)
    story.append(Spacer(1, 18))

    # ── PARTY SECTION ─────────────────────────────────────────────────────────

    def party_lines(heading, name, detail_lines):
        """Build a list of Paragraph objects for one party cell."""
        result = []
        result.append(Paragraph(
            f'<font size="7" color="#9CA3AF">{heading}</font>',
            ps(f"PH_{heading}"),
        ))
        result.append(Spacer(1, 3))
        result.append(Paragraph(
            f'<font name="Helvetica-Bold" size="10" color="#111827">{name}</font>',
            ps(f"PN_{heading}"),
        ))
        for line in detail_lines:
            if line:
                result.append(Paragraph(
                    f'<font size="8" color="#6B7280">{line}</font>',
                    ps(f"PL_{heading}_{line[:6]}"),
                ))
        return result

    from_details = [l for l in addr_parts if l] + \
                   ([comp_email] if comp_email else []) + \
                   ([comp_website] if comp_website else []) + \
                   ([f"{tax_id_label}: {comp_tax_id}"] if comp_tax_id else []) + \
                   ([f"Reg: {reg_number}"] if reg_number else [])

    to_details = ([customer.email] if customer.email else []) + \
                 ([customer.phone] if customer.phone else [])

    from_paras = party_lines("FROM", comp.name, from_details)
    to_paras   = party_lines("BILLED TO", customer.name, to_details)

    def wrap_in_table(paras, width):
        rows = [[p] for p in paras]
        t = Table(rows, colWidths=[width])
        t.setStyle(TableStyle([
            ("TOPPADDING",    (0, 0), (-1, -1), 1),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
            ("LEFTPADDING",   (0, 0), (-1, -1), 0),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
        ]))
        return t

    party_tbl = Table(
        [[wrap_in_table(from_paras, 230), wrap_in_table(to_paras, 230)]],
        colWidths=[252, 248],
    )
    party_tbl.setStyle(TableStyle([
        ("VALIGN",       (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING",  (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(party_tbl)
    story.append(Spacer(1, 20))

    # ── AMOUNT HERO BOX ────────────────────────────────────────────────────────

    amount_str = fmt_currency(payment.amount, currency)

    amount_data = [
        [Paragraph(
            '<font size="9" color="#15803D">AMOUNT RECEIVED</font>',
            ps("ALabel", alignment=1),
        )],
        [Paragraph(
            f'<font name="Helvetica-Bold" size="28" color="#111827">{amount_str}</font>',
            ps("AValue", alignment=1),
        )],
        [Paragraph(
            '<font name="Helvetica-Bold" size="8" color="#15803D">  ✓  PAYMENT CONFIRMED  </font>',
            ps("AStamp", alignment=1),
        )],
    ]
    amount_tbl = Table(amount_data, colWidths=[500])
    amount_tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), green_bg),
        ("BOX",           (0, 0), (-1, -1), 1.2, green),
        ("TOPPADDING",    (0, 0), (0, 0), 10),
        ("BOTTOMPADDING", (0, 2), (0, 2), 10),
        ("TOPPADDING",    (0, 1), (0, 1), 4),
        ("BOTTOMPADDING", (0, 1), (0, 1), 4),
        ("LEFTPADDING",   (0, 0), (-1, -1), 20),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 20),
    ]))
    story.append(amount_tbl)
    story.append(Spacer(1, 22))

    # ── PAYMENT DETAILS TABLE ─────────────────────────────────────────────────

    story.append(Paragraph(
        '<font name="Helvetica-Bold" size="11" color="#111827">Payment Details</font>',
        ps("SecHead"),
    ))
    story.append(Spacer(1, 8))

    def detail_row(label, value, bold_value=False):
        v_font = "Helvetica-Bold" if bold_value else "Helvetica"
        return [
            Paragraph(f'<font size="9" color="#6B7280">{label}</font>', ps(f"DL_{label}")),
            Paragraph(f'<font name="{v_font}" size="9" color="#111827">{value}</font>', ps(f"DV_{label}")),
        ]

    def colored_row(label, value, color_hex, bold_value=True):
        v_font = "Helvetica-Bold" if bold_value else "Helvetica"
        return [
            Paragraph(f'<font size="9" color="#6B7280">{label}</font>', ps(f"DLC_{label}")),
            Paragraph(f'<font name="{v_font}" size="9" color="{color_hex}">{value}</font>', ps(f"DVC_{label}")),
        ]

    # Cheque-specific label
    txn_label   = "Cheque No." if is_cheque else "Transaction ID"
    method_disp = "Cheque" if is_cheque else safe(payment.payment_method, "—")
    txn_val     = safe(payment.transaction_id)

    details_rows = [detail_row("Payment Method", method_disp)]

    # Only show Cheque No. / Transaction ID if it has a value
    if txn_val:
        details_rows.append(detail_row(txn_label, txn_val))

    details_rows.append(detail_row("Payment Date", safe(payment.payment_date, "—")))

    # Only show notes if present
    if payment.notes and payment.notes.strip():
        details_rows.append(detail_row("Notes", payment.notes.strip()))

    # Invoice summary divider rows
    details_rows.append(detail_row("Invoice Total", fmt_currency(invoice.total, currency)))
    details_rows.append(detail_row(
        "Amount Paid (this receipt)",
        fmt_currency(payment.amount, currency),
        bold_value=True,
    ))

    if amount_due <= 0:
        details_rows.append(colored_row("Balance Due", fmt_currency(0, currency), "#15803D"))
    else:
        details_rows.append(colored_row("Balance Due", fmt_currency(amount_due, currency), "#DC2626"))

    # Build table
    summary_start = len(details_rows) - 3  # last 3 = invoice summary block

    row_styles = [
        ("FONTNAME",      (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE",      (0, 0), (-1, -1), 9),
        ("TOPPADDING",    (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LEFTPADDING",   (0, 0), (-1, -1), 14),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 14),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("BOX",           (0, 0), (-1, -1), 0.6, border_col),
        ("LINEBELOW",     (0, 0), (-1, -2), 0.4, border_col),
        # Accent line above summary block
        ("LINEABOVE",     (0, summary_start), (-1, summary_start), 1.0, accent),
    ]

    # Alternating row backgrounds
    for i in range(len(details_rows)):
        bg = light_bg if i % 2 == 0 else colors.white
        row_styles.append(("BACKGROUND", (0, i), (-1, i), bg))

    # Last row (balance) always white + slightly highlighted
    row_styles.append(("BACKGROUND", (0, -1), (-1, -1), colors.white))

    details_tbl = Table(details_rows, colWidths=[210, 290])
    details_tbl.setStyle(TableStyle(row_styles))
    story.append(details_tbl)
    story.append(Spacer(1, 24))

    # ── FOOTER ─────────────────────────────────────────────────────────────────

    story.append(HRFlowable(
        width="100%", thickness=0.5, color=border_col,
        spaceBefore=0, spaceAfter=10,
    ))

    footer_tbl = Table(
        [[
            Paragraph(
                f'<font size="8" color="#9CA3AF"><i>{footer_text}</i></font>',
                ps("FL"),
            ),
            Paragraph(
                f'<font size="8" color="#9CA3AF">Receipt #{safe(payment.receipt_number, "—")}</font>',
                ps("FR", alignment=2),
            ),
        ]],
        colWidths=[340, 160],
    )
    footer_tbl.setStyle(TableStyle([
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING",   (0, 0), (-1, -1), 0),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
    ]))
    story.append(footer_tbl)

    # ── Build ──────────────────────────────────────────────────────────────────

    doc.build(story)

    pdf_bytes = buffer.getvalue()
    buffer.close()

    response = HttpResponse(pdf_bytes, content_type="application/pdf")
    filename = f"Receipt_{payment.receipt_number}.pdf"
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response
