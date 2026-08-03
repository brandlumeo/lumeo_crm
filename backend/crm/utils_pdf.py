def generate_receipt_pdf_response(payment):
    from django.http import HttpResponse
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    import io
    import urllib.request

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    story = []
    styles = getSampleStyleSheet()
    
    invoice = payment.invoice
    comp = invoice.company
    settings = getattr(comp, 'invoice_settings', None)
    
    def get_setting(name, mapped_name=None, default=None):
        if settings and hasattr(settings, mapped_name or name):
            return getattr(settings, mapped_name or name)
        return default

    template = get_setting("invoice_template", "template_id", "template1")
    
    # Theme colors based on template
    primary_color = colors.HexColor("#2563EB")
    
    title_style = ParagraphStyle(
        'DocTitle', parent=styles['Heading1'], fontSize=16, leading=20, textColor=primary_color, alignment=0
    )
    
    # Header Section
    left_p = None
    logo_url = get_setting("invoice_logo")
    if logo_url:
        try:
            req = urllib.request.Request(logo_url, headers={'User-Agent': 'Mozilla/5.0'})
            img_data = io.BytesIO(urllib.request.urlopen(req, timeout=5).read())
            left_p = RLImage(img_data, width=140, height=50, kind='proportional')
        except Exception:
            pass
    
    if not left_p:
        left_p = Paragraph(f"<b>{comp.name}</b>", title_style)
    
    meta_info = f"<font size=16 color='#111827'><b>PAYMENT RECEIPT</b></font><br/>"
    meta_info += f"<font size=10 color='#6B7280'>#{payment.receipt_number}</font><br/><br/>"
    meta_info += f"<font size=9 color='#6B7280'>Date:</font> <font size=9 color='#111827'>{payment.payment_date}</font><br/>"
    meta_info += f"<font size=9 color='#6B7280'>Invoice Ref:</font> <font size=9 color='#111827'>{invoice.invoice_number}</font><br/>"
    
    right_p_style = ParagraphStyle('RightHeader', alignment=2)
    right_p = Paragraph(meta_info, right_p_style)
    
    header_table = Table([[left_p, right_p]], colWidths=[250, 250])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'), 
        ('BOTTOMPADDING', (0,0), (-1,-1), 15),
        ('LINEBELOW', (0,0), (-1,-1), 0.5, colors.HexColor("#E5E7EB"))
    ]))
    story.append(header_table)
    story.append(Spacer(1, 20))
    
    # Payment Details
    details_data = [
        ["Payment Method:", payment.payment_method],
        ["Transaction ID:", payment.transaction_id or "-"],
        ["Amount Received:", f"{payment.amount} {invoice.currency or comp.currency or ''}"],
        ["Notes:", payment.notes or "-"],
    ]
    
    details_table = Table(details_data, colWidths=[150, 350])
    details_table.setStyle(TableStyle([
        ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
        ('FONTSIZE', (0,0), (-1,-1), 10),
        ('TEXTCOLOR', (0,0), (0,-1), colors.HexColor("#6B7280")),
        ('TEXTCOLOR', (1,0), (1,-1), colors.HexColor("#111827")),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    
    story.append(Paragraph("<b>Payment Details</b>", styles['Heading3']))
    story.append(Spacer(1, 10))
    story.append(details_table)
    story.append(Spacer(1, 30))
    
    # Thank you note
    story.append(Paragraph("<i>Thank you for your business.</i>", styles['Normal']))
    
    doc.build(story)
    
    pdf_bytes = buffer.getvalue()
    buffer.close()
    
    response = HttpResponse(pdf_bytes, content_type='application/pdf')
    filename = f"Receipt_{payment.receipt_number}.pdf"
    response['Content-Disposition'] = f'inline; filename="{filename}"'
    return response
