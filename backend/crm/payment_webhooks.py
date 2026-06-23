import json
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import get_object_or_404
from companies.models import Company
from .models import Invoice

@csrf_exempt
def stripe_webhook(request, company_id):
    """
    Handle Stripe webhooks (e.g. invoice.payment_succeeded).
    Mapped to: /verify_webhook/<company_id>
    """
    company = get_object_or_404(Company, id=company_id)
    
    # NOTE: In a production environment, you MUST use the Stripe Python SDK 
    # to verify the webhook signature using the 'stripe_secret_key' or a 
    # dedicated 'webhook_signing_secret'.
    # Example: stripe.Webhook.construct_event(payload, sig_header, endpoint_secret)
    
    if request.method == "POST":
        try:
            payload = json.loads(request.body)
            event_type = payload.get("type")
            
            # Here you would typically extract your CRM invoice ID from 
            # payload['data']['object']['metadata'] or similar, and mark it PAID.
            
            if event_type in ["invoice.payment_succeeded", "payment_intent.succeeded"]:
                # invoice = Invoice.objects.get(...)
                # invoice.status = Invoice.Status.PAID
                # invoice.save()
                pass
                
            return HttpResponse(status=200)
        except Exception as e:
            return HttpResponse(str(e), status=400)
            
    return HttpResponse("Stripe Webhook Endpoint", status=200)

@csrf_exempt
def paypal_webhook(request, company_id):
    """
    Handle PayPal webhooks.
    Mapped to: /paypal-webhook/<company_id>
    """
    company = get_object_or_404(Company, id=company_id)
    
    if request.method == "POST":
        try:
            payload = json.loads(request.body)
            event_type = payload.get("event_type")
            
            if event_type == "PAYMENT.SALE.COMPLETED":
                # Process payment completion
                pass
                
            return HttpResponse(status=200)
        except Exception as e:
            return HttpResponse(str(e), status=400)
            
    return HttpResponse("PayPal Webhook Endpoint", status=200)

@csrf_exempt
def razorpay_webhook(request, company_id):
    """
    Handle Razorpay webhooks.
    Mapped to: /razorpay-webhook/<company_id>
    """
    company = get_object_or_404(Company, id=company_id)
    
    if request.method == "POST":
        try:
            payload = json.loads(request.body)
            event_type = payload.get("event")
            
            if event_type == "payment.captured":
                # Process payment completion
                pass
                
            return HttpResponse(status=200)
        except Exception as e:
            return HttpResponse(str(e), status=400)
            
    return HttpResponse("Razorpay Webhook Endpoint", status=200)

@csrf_exempt
def paystack_webhook(request, company_id):
    """
    Handle Paystack webhooks.
    Mapped to: /paystack-webhook/<company_id>
    """
    company = get_object_or_404(Company, id=company_id)
    
    if request.method == "POST":
        try:
            payload = json.loads(request.body)
            event_type = payload.get("event")
            
            if event_type == "charge.success":
                # Process payment completion
                pass
                
            return HttpResponse(status=200)
        except Exception as e:
            return HttpResponse(str(e), status=400)
            
    return HttpResponse("Paystack Webhook Endpoint", status=200)
