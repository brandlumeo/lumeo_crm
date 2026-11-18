"""Share quotes, invoices, orders, purchase orders and receipts (WhatsApp / email / link).

GET  /crm/share/<doc_type>/<id>/   -> recipient, amounts, links, team members, saved message templates
POST /crm/share/<doc_type>/<id>/   -> log the share on the timeline and optionally mark the document Sent
GET  /crm/public/<doc_type>/<token>/pdf/  -> the PDF, for anyone holding the link
"""
from django.http import Http404
from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

DOC_TYPES = ("quote", "invoice", "order", "purchase_order", "receipt")
DOC_LABELS = {
    "quote": "Quotation",
    "invoice": "Invoice",
    "order": "Order",
    "purchase_order": "Purchase Order",
    "receipt": "Payment Receipt",
}
CHANNELS = ("whatsapp", "email", "native", "copy", "download")


def _models():
    from .models import Invoice, InvoicePayment, Order, PurchaseOrder, Quote
    return {"quote": Quote, "invoice": Invoice, "order": Order, "purchase_order": PurchaseOrder, "receipt": InvoicePayment}


def _get_doc(doc_type, pk, company):
    if doc_type not in DOC_TYPES:
        raise Http404
    Model = _models()[doc_type]
    if doc_type == "receipt":
        return get_object_or_404(Model.objects.select_related("invoice", "invoice__customer"), pk=pk, invoice__company=company)
    return get_object_or_404(Model, pk=pk, company=company)


def _company_of(doc_type, doc):
    return doc.invoice.company if doc_type == "receipt" else doc.company


def _party(doc_type, doc):
    """Who the document is addressed to: (kind, name, phone, email)."""
    if doc_type == "purchase_order":
        v = doc.vendor
        return "vendor", v.name, getattr(v, "phone", "") or "", getattr(v, "email", "") or ""
    if doc_type == "receipt":
        doc = doc.invoice
    customer = getattr(doc, "customer", None)
    if customer is not None:
        return "client", customer.name, customer.phone or "", customer.email or ""
    lead = getattr(doc, "lead", None)
    if lead is not None:
        return "client", lead.name, getattr(lead, "mobile", "") or "", getattr(lead, "email", "") or ""
    return "client", getattr(doc, "client_name", "") or "", getattr(doc, "client_phone", "") or "", ""


def _facts(doc_type, doc):
    """Number, amount, balance, currency, key date and status for the message."""
    company = _company_of(doc_type, doc)
    base = (company.currency or "USD").upper()
    if doc_type == "receipt":
        inv = doc.invoice
        return {
            "number": doc.receipt_number or f"RCPT-{doc.pk}",
            "reference": inv.invoice_number,
            "amount": str(doc.amount),
            "balance": str(inv.amount_due),
            "currency": (inv.currency or base).upper(),
            "date": doc.payment_date.isoformat() if doc.payment_date else None,
            "date_label": "paid on",
            "status": "paid",
        }
    number = {"quote": "quote_number", "invoice": "invoice_number", "order": "order_number", "purchase_order": "po_number"}[doc_type]
    total = doc.total_amount if doc_type == "purchase_order" else doc.total
    date_field, date_label = {
        "quote": ("valid_until", "valid until"),
        "invoice": ("due_date", "due on"),
        "order": (None, ""),
        "purchase_order": ("expected_delivery_date", "expected by"),
    }[doc_type]
    date = getattr(doc, date_field, None) if date_field else None
    return {
        "number": getattr(doc, number),
        "reference": "",
        "amount": str(total),
        "balance": str(doc.amount_due) if doc_type == "invoice" else str(total),
        "currency": (doc.currency or base).upper(),
        "date": date.isoformat() if date else None,
        "date_label": date_label,
        "status": doc.status,
    }


def _links(doc_type, doc, request):
    pdf_url = request.build_absolute_uri(f"/api/v1/crm/public/{doc_type}/{doc.public_token}/pdf/")
    page_path = f"/public/{doc_type}/{doc.public_token}" if doc_type in ("quote", "invoice") else None
    return page_path, pdf_url


def _can_mark_sent(doc_type, doc):
    if doc_type in ("quote", "invoice"):
        return doc.status == "draft"
    if doc_type == "purchase_order":
        return doc.status == "approved"
    return False


def render_pdf(doc_type, doc):
    from .views import generate_pdf_response
    if doc_type == "quote":
        from .utils_quote_pdf import generate_agency_quote_pdf_response
        return generate_agency_quote_pdf_response(doc)
    if doc_type == "receipt":
        from .utils_pdf import generate_receipt_pdf_response
        return generate_receipt_pdf_response(doc)
    return generate_pdf_response(doc, doc_type={"invoice": "Invoice", "order": "Order", "purchase_order": "Purchase Order"}[doc_type])


class ShareLogSerializer(serializers.Serializer):
    channel = serializers.ChoiceField(choices=CHANNELS)
    recipient_type = serializers.ChoiceField(choices=("client", "vendor", "team", "other"))
    recipient_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    recipient_phone = serializers.CharField(max_length=30, required=False, allow_blank=True)
    mark_sent = serializers.BooleanField(default=False)


class DocumentShareView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, doc_type, pk):
        company = request.user.company
        doc = _get_doc(doc_type, pk, company)
        party_kind, name, phone, email = _party(doc_type, doc)
        page_path, pdf_url = _links(doc_type, doc, request)
        from accounts.models import User
        team = [
            {"id": u.id, "name": (f"{u.first_name} {u.last_name}".strip() or u.email), "role": u.role, "designation": u.designation or "", "mobile": u.mobile or ""}
            for u in User.objects.filter(company=company, is_active=True).exclude(pk=request.user.pk).order_by("first_name", "email")
        ]
        try:
            templates = company.invoice_settings.share_templates or {}
        except Exception:
            templates = {}
        return Response({
            "doc_type": doc_type,
            "doc_label": DOC_LABELS[doc_type],
            **_facts(doc_type, doc),
            "company_name": company.name,
            "company_country": company.country or "",
            "sender_name": f"{request.user.first_name} {request.user.last_name}".strip() or request.user.email,
            "recipient": {"kind": party_kind, "name": name, "phone": phone, "email": email},
            "page_path": page_path,
            "pdf_url": pdf_url,
            "can_mark_sent": _can_mark_sent(doc_type, doc),
            "team": team,
            "templates": templates,
        })

    def post(self, request, doc_type, pk):
        company = request.user.company
        doc = _get_doc(doc_type, pk, company)
        ser = ShareLogSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        facts = _facts(doc_type, doc)

        marked = False
        if data["mark_sent"] and data["recipient_type"] in ("client", "vendor") and _can_mark_sent(doc_type, doc):
            # Saved directly so the automatic "sent" email isn't also fired.
            type(doc).objects.filter(pk=doc.pk).update(status="sent")
            marked = True

        channel_label = {"whatsapp": "WhatsApp", "email": "email", "native": "the share sheet", "copy": "a copied link", "download": "PDF download"}[data["channel"]]
        who = data.get("recipient_name") or data["recipient_type"]
        if data.get("recipient_phone"):
            who += f" ({data['recipient_phone']})"
        description = f"Shared {DOC_LABELS[doc_type]} {facts['number']} via {channel_label} with {who}."
        if marked:
            description += " Marked as Sent."

        target = doc.invoice if doc_type == "receipt" else doc
        links = {
            "customer": getattr(target, "customer", None),
            "lead": getattr(target, "lead", None),
            "deal": getattr(target, "deal", None),
        }
        if any(links.values()):
            from .models import Activity
            Activity.objects.create(
                company=company,
                activity_type=Activity.ActivityType.SHARE,
                description=description,
                created_by=request.user,
                **{k: v for k, v in links.items() if v is not None},
            )
        return Response({"logged": True, "marked_sent": marked, "status": "sent" if marked else facts["status"]}, status=status.HTTP_201_CREATED)


class PublicDocumentPdfView(APIView):
    """Anyone with the (unguessable) link can download the PDF, like the public quote/invoice pages."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, doc_type, token):
        if doc_type not in DOC_TYPES:
            raise Http404
        doc = get_object_or_404(_models()[doc_type], public_token=token)
        response = render_pdf(doc_type, doc)
        if hasattr(response, "__setitem__") and response.get("Content-Disposition", "").startswith("attachment"):
            response["Content-Disposition"] = response["Content-Disposition"].replace("attachment", "inline", 1)
        return response
