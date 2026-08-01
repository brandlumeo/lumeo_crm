import json
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.conf import settings
from crm.models import Lead
from companies.models import Company

class WhatsAppWebhookView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        """
        WhatsApp Webhook Verification
        """
        mode = request.GET.get('hub.mode')
        token = request.GET.get('hub.verify_token')
        challenge = request.GET.get('hub.challenge')

        # Use a setting or a hardcoded token for verification
        verify_token = getattr(settings, 'WHATSAPP_VERIFY_TOKEN', 'lumeo_crm_whatsapp_token')

        if mode == 'subscribe' and token == verify_token:
            return Response(int(challenge), status=200)
        return Response({'error': 'Invalid verification token'}, status=403)

    def post(self, request):
        """
        Receive WhatsApp Messages
        """
        try:
            body = request.data
            
            # WhatsApp Cloud API payload structure
            if body.get('object') == 'whatsapp_business_account':
                for entry in body.get('entry', []):
                    for change in entry.get('changes', []):
                        value = change.get('value', {})
                        messages = value.get('messages', [])
                        contacts = value.get('contacts', [])
                        
                        if messages and contacts:
                            message = messages[0]
                            contact = contacts[0]
                            
                            phone_number = contact.get('wa_id')
                            name = contact.get('profile', {}).get('name', f"WhatsApp Lead {phone_number}")
                            
                            # Simple logic to find the primary company (tenant)
                            # In a real multi-tenant setup, the webhook URL would include the tenant ID
                            # e.g., /api/crm/webhooks/whatsapp/<company_id>/
                            # For Leskor, we just pick the first company or Leskor directly
                            company = Company.objects.filter(name__icontains="Leskor").first()
                            if not company:
                                company = Company.objects.first()

                            # Check if lead already exists
                            lead, created = Lead.objects.get_or_create(
                                company=company,
                                mobile=phone_number,
                                defaults={
                                    'name': name,
                                    'source': 'WhatsApp',
                                    'status': 'new', # "New Enquiry" mapped to "new"
                                    'email': f"{phone_number}@whatsapp.local",
                                }
                            )
                            
                            if created:
                                # You can add note creation or trigger sequence here
                                pass
                                
            return Response({'status': 'ok'})
        except Exception as e:
            return Response({'error': str(e)}, status=500)
