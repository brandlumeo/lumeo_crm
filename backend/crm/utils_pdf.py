def generate_receipt_pdf_response(payment):
    from django.http import HttpResponse
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage, HRFlowable
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas as pdfgen_canvas
    import io
    import urllib.request

    # ── Helpers ────────────────────────────────────────────────────────────────

    CURRENCY_SYMBOLS = {
        "INR": "₹", "USD": "$", "EUR": "€", "GBP": "£",
        "AED": "AED ", "SGD": "S$", "AUD": "A$", "CAD": "C$",
    }

    def fmt_currency(amount, currency_code):
        symbol = CURRENCY_SYMBOLS.get((currency_code or "").upper(), f"{currency_code} " if currency_code else "")
        try:
            return f"{symbol}{float(amount):,.2f}"
        except Exception:
            return f"{symbol}{amount}"

    def safe(val, fallback="-"):
        if val is None or str(val).strip() == "":
            return fallback
        return str(val).strip()

    # ── Data ───────────────────────────────────────────────────────────────────

    invoice   = payment.invoice
    comp      = invoice.company
    customer  = invoice.customer
    settings  = getattr(comp, "invoice_settings", None)
    currency  = invoice.currency or (settings.currency if settings else None) or comp.currency or "INR"
    is_cheque = payment.payment_method in ("Cheque", "Check")
    accent    = colors.HexColor(getattr(settings, "template_accent_color", "#1E3A5F") or "#1E3A5F")
    dark      = colors.HexColor("#111827")
    mid       = colors.HexColor("#6B7280")
    light_bg  = colors.HexColor("#F9FAFB")
    border    = colors.HexColor("#E5E7EB")
    green     = colors.HexColor("#16A34A")
    green_bg  = colors.HexColor("#F0FDF4")

    # Company info
    comp_address_parts = filter(None, [
        getattr(comp, "address_line1", None),
        getattr(comp, "address_line2", None),
        getattr(comp, "city", None),
        getattr(comp, "state", None),
        getattr(comp, "country", None),
    ])
    comp_address = ", ".join(comp_address_parts) or ""
    comp_email   = getattr(comp, "company_email", None) or ""
    comp_website = getattr(comp, "company_website", None) or ""
    comp_tax_id  = None
    tax_id_label = None
    if settings:
        comp_tax_id  = getattr(settings, "company_tax_id", None)
        tax_id_label = getattr(comp, "tax_id_label", None) or "Tax ID"
        reg_number   = getattr(settings, "company_registration_number", None)
    else:
        reg_number = None

    # ── Buffer & Document ──────────────────────────────────────────────────────

    buffer = io.BytesIO()
    PAGE_W, PAGE_H = letter
    MARGIN = 36

    # We use a canvas-based approach for the background/stamp, then flowables
    class ReceiptCanvas(pdfgen_canvas.Canvas):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
            self._saved_page_states = []

        def showPage(self):
            self._saved_page_states.append(dict(self.__dict__))
            self._startPage()

        def save(self):
            for state in self._saved_page_states:
                self.__dict__.update(state)
                self._draw_page()
                super().showPage()
            super().save()

        def _draw_page(self):
            # Top accent bar
            self.setFillColor(accent)
            self.rect(0, PAGE_H - 6, PAGE_W, 6, fill=1, stroke=0)

            # Bottom accent bar
            self.setFillColor(accent)
            self.rect(0, 0, PAGE_W, 4, fill=1, stroke=0)

            # Subtle background watermark "RECEIPT"
            self.saveState()
            self.setFillColor(colors.HexColor("#F3F4F6"))
            self.setFont("Helvetica-Bold", 72)
            self.translate(PAGE_W / 2, PAGE_H / 2)
            self.rotate(35)
            self.drawCentredString(0, 0, "RECEIPT")
            self.restoreState()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=MARGIN,
        leftMargin=MARGIN,
        topMargin=MARGIN + 10,
        bottomMargin=MARGIN + 10,
    )

    styles = getSampleStyleSheet()
    story  = []

    # ── Style helpers ──────────────────────────────────────────────────────────

    def ps(name, **kw):
        return ParagraphStyle(name, parent=styles["Normal"], **kw)

    bold_dark  = ps("BoldDark", fontName="Helvetica-Bold", fontSize=10, textColor=dark)
    normal_mid = ps("NormMid",  fontSize=9, textColor=mid)
    normal_dark= ps("NormDark", fontSize=9, textColor=dark)
    small_mid  = ps("SmallMid", fontSize=8, textColor=mid)
    small_dark = ps("SmallDark",fontSize=8, textColor=dark)
    right_align= ps("Right", alignment=2)
    right_mid  = ps("RightMid", alignment=2, fontSize=9, textColor=mid)
    right_dark = ps("RightDark",alignment=2, fontSize=9, textColor=dark)

    # ── HEADER: Logo + Title block ─────────────────────────────────────────────

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
            f'<font name="Helvetica-Bold" size="18" color="{accent.hexval() if hasattr(accent,"hexval") else "#1E3A5F"}">{comp.name}</font>',
            ps("LogoText"),
        )

    # Right side: document title
    title_block_text = (
        f'<font name="Helvetica-Bold" size="20" color="#111827">PAYMENT RECEIPT</font><br/>'
        f'<font size="11" color="#6B7280">#{safe(payment.receipt_number)}</font>'
    )
    title_block = Paragraph(title_block_text, ps("TitleBlock", alignment=2))

    header_tbl = Table([[logo_img, title_block]], colWidths=[260, 240])
    header_tbl.setStyle(TableStyle([
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
    ]))
    story.append(header_tbl)
    story.append(HRFlowable(width="100%", thickness=1.2, color=accent, spaceAfter=12))

    # ── META ROW: Date / Invoice Ref / Status ──────────────────────────────────

    status_label = "PAID" if float(invoice.amount_due) <= 0 else "PARTIALLY PAID"
    status_color = "#16A34A" if status_label == "PAID" else "#D97706"

    meta_left = Paragraph(
        f'<font size="8" color="#6B7280">Payment Date</font><br/>'
        f'<font name="Helvetica-Bold" size="10" color="#111827">{safe(payment.payment_date)}</font>',
        ps("MetaL"),
    )
    meta_mid_p = Paragraph(
        f'<font size="8" color="#6B7280">Invoice Reference</font><br/>'
        f'<font name="Helvetica-Bold" size="10" color="#111827">{safe(invoice.invoice_number)}</font>',
        ps("MetaM"),
    )
    status_badge = Paragraph(
        f'<font name="Helvetica-Bold" size="10" color="{status_color}">{status_label}</font>',
        ps("MetaR", alignment=2),
    )

    meta_tbl = Table([[meta_left, meta_mid_p, status_badge]], colWidths=[160, 200, 140])
    meta_tbl.setStyle(TableStyle([
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("BACKGROUND",    (0, 0), (-1, -1), light_bg),
        ("ROUNDEDCORNERS",(0, 0), (-1, -1), [4, 4, 4, 4]),
        ("BOX",           (0, 0), (-1, -1), 0.5, border),
        ("TOPPADDING",    (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING",   (0, 0), (-1, -1), 12),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 12),
    ]))
    story.append(meta_tbl)
    story.append(Spacer(1, 18))

    # ── PARTY SECTION: From / Billed To ───────────────────────────────────────

    def party_cell(heading, name, lines):
        parts = [Paragraph(f'<font size="7" color="#6B7280">{heading}</font>', ps("PartyHead"))]
        parts.append(Spacer(1, 3))
        parts.append(Paragraph(f'<font name="Helvetica-Bold" size="10" color="#111827">{name}</font>', ps("PartyName")))
        for line in lines:
            if line:
                parts.append(Paragraph(f'<font size="8" color="#6B7280">{line}</font>', ps("PartyLine")))
        return parts

    # FROM: company
    from_lines = [l for l in [comp_address, comp_email, comp_website] if l]
    if comp_tax_id:
        from_lines.append(f"{tax_id_label}: {comp_tax_id}")
    if reg_number:
        from_lines.append(f"Reg: {reg_number}")

    # TO: customer
    to_lines = []
    if customer.email:
        to_lines.append(customer.email)
    if customer.phone:
        to_lines.append(customer.phone)

    from_cell = party_cell("FROM", comp.name, from_lines)
    to_cell   = party_cell("BILLED TO", customer.name, to_lines)

    # Use nested tables inside each cell
    from_inner = Table([[p] for p in from_cell], colWidths=[230])
    from_inner.setStyle(TableStyle([("TOPPADDING",(0,0),(-1,-1),1),("BOTTOMPADDING",(0,0),(-1,-1),1)]))
    to_inner = Table([[p] for p in to_cell], colWidths=[230])
    to_inner.setStyle(TableStyle([("TOPPADDING",(0,0),(-1,-1),1),("BOTTOMPADDING",(0,0),(-1,-1),1)]))

    party_tbl = Table([[from_inner, to_inner]], colWidths=[250, 250])
    party_tbl.setStyle(TableStyle([
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING",   (0, 0), (-1, -1), 0),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
    ]))
    story.append(party_tbl)
    story.append(Spacer(1, 20))

    # ── AMOUNT HERO BOX ────────────────────────────────────────────────────────

    amount_str = fmt_currency(payment.amount, currency)
    amount_label = Paragraph('<font size="9" color="#6B7280">Amount Received</font>', ps("AmtLabel", alignment=1))
    amount_value = Paragraph(
        f'<font name="Helvetica-Bold" size="26" color="#111827">{amount_str}</font>',
        ps("AmtValue", alignment=1),
    )
    paid_stamp = Paragraph(
        f'<font name="Helvetica-Bold" size="9" color="#16A34A">✓ PAYMENT CONFIRMED</font>',
        ps("PaidStamp", alignment=1),
    )

    amount_tbl = Table([[amount_label], [amount_value], [paid_stamp]], colWidths=[500])
    amount_tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), green_bg),
        ("BOX",           (0, 0), (-1, -1), 1, green),
        ("TOPPADDING",    (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("LEFTPADDING",   (0, 0), (-1, -1), 20),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 20),
    ]))
    story.append(amount_tbl)
    story.append(Spacer(1, 20))

    # ── PAYMENT DETAILS TABLE ─────────────────────────────────────────────────

    story.append(Paragraph(
        '<font name="Helvetica-Bold" size="11" color="#111827">Payment Details</font>',
        ps("SectionHead"),
    ))
    story.append(Spacer(1, 8))

    # Label for Transaction ID changes based on payment method
    txn_label = "Cheque No." if is_cheque else "Transaction ID"
    method_display = "Cheque" if is_cheque else safe(payment.payment_method)

    details_rows = [
        [
            Paragraph('<font size="9" color="#6B7280">Payment Method</font>', ps("DL")),
            Paragraph(f'<font name="Helvetica-Bold" size="9" color="#111827">{method_display}</font>', ps("DV")),
        ],
        [
            Paragraph(f'<font size="9" color="#6B7280">{txn_label}</font>', ps("DL")),
            Paragraph(f'<font size="9" color="#111827">{safe(payment.transaction_id)}</font>', ps("DV")),
        ],
    ]

    # For cheque, add extra context row
    if is_cheque:
        details_rows.append([
            Paragraph('<font size="9" color="#6B7280">Payment Type</font>', ps("DL")),
            Paragraph('<font size="9" color="#111827">Cheque / Demand Draft</font>', ps("DV")),
        ])

    details_rows.append([
        Paragraph('<font size="9" color="#6B7280">Payment Date</font>', ps("DL")),
        Paragraph(f'<font size="9" color="#111827">{safe(payment.payment_date)}</font>', ps("DV")),
    ])

    if payment.notes and payment.notes.strip():
        details_rows.append([
            Paragraph('<font size="9" color="#6B7280">Notes</font>', ps("DL")),
            Paragraph(f'<font size="9" color="#111827">{payment.notes.strip()}</font>', ps("DV")),
        ])

    # Invoice summary rows
    details_rows.append([
        Paragraph('<font size="9" color="#6B7280">Invoice Total</font>', ps("DL")),
        Paragraph(f'<font size="9" color="#111827">{fmt_currency(invoice.total, currency)}</font>', ps("DV")),
    ])
    details_rows.append([
        Paragraph('<font size="9" color="#6B7280">Amount Paid (this receipt)</font>', ps("DL")),
        Paragraph(f'<font name="Helvetica-Bold" size="9" color="#111827">{fmt_currency(payment.amount, currency)}</font>', ps("DV")),
    ])

    remaining = float(invoice.amount_due)
    remaining_color = "#DC2626" if remaining > 0 else "#16A34A"
    remaining_label = "Balance Due" if remaining > 0 else "Fully Paid"
    details_rows.append([
        Paragraph(f'<font size="9" color="#6B7280">{remaining_label}</font>', ps("DL")),
        Paragraph(f'<font name="Helvetica-Bold" size="9" color="{remaining_color}">{fmt_currency(remaining, currency)}</font>', ps("DV")),
    ])

    details_tbl = Table(details_rows, colWidths=[200, 300])
    row_styles = [
        ("FONTNAME",      (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE",      (0, 0), (-1, -1), 9),
        ("TOPPADDING",    (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LEFTPADDING",   (0, 0), (-1, -1), 12),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 12),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("BOX",           (0, 0), (-1, -1), 0.5, border),
        ("LINEBELOW",     (0, 0), (-1, -1), 0.3, border),
    ]
    # Alternate row shading
    for i in range(len(details_rows)):
        if i % 2 == 0:
            row_styles.append(("BACKGROUND", (0, i), (-1, i), light_bg))
        else:
            row_styles.append(("BACKGROUND", (0, i), (-1, i), colors.white))

    # Highlight last 3 rows (invoice summary)
    summary_start = len(details_rows) - 3
    row_styles.append(("LINEABOVE", (0, summary_start), (-1, summary_start), 1, accent))

    details_tbl.setStyle(TableStyle(row_styles))
    story.append(details_tbl)
    story.append(Spacer(1, 24))

    # ── FOOTER ─────────────────────────────────────────────────────────────────

    footer_text = (getattr(settings, "footer_text", None) or "Thank you for your business.") if settings else "Thank you for your business."

    story.append(HRFlowable(width="100%", thickness=0.5, color=border, spaceBefore=0, spaceAfter=10))

    footer_left = Paragraph(
        f'<font size="8" color="#6B7280"><i>{footer_text}</i></font>',
        ps("FooterL"),
    )
    footer_right = Paragraph(
        f'<font size="8" color="#6B7280">Receipt #{safe(payment.receipt_number)}</font>',
        ps("FooterR", alignment=2),
    )
    footer_tbl = Table([[footer_left, footer_right]], colWidths=[350, 150])
    footer_tbl.setStyle(TableStyle([
        ("VALIGN",  (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING",  (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(footer_tbl)

    # ── Build ──────────────────────────────────────────────────────────────────

    doc.build(story, canvasmaker=ReceiptCanvas)

    pdf_bytes = buffer.getvalue()
    buffer.close()

    response = HttpResponse(pdf_bytes, content_type="application/pdf")
    filename = f"Receipt_{payment.receipt_number}.pdf"
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response
