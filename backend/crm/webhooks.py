import json
import logging
import requests
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.conf import settings
from crm.models import Lead, WhatsAppMessage
from companies.models import Company

logger = logging.getLogger(__name__)

def process_meta_leadgen(value, entry=None):
    """
    Process incoming Meta Lead Ad (leadgen) webhook event.
    Fetches lead details from Meta Graph API using leadgen_id and creates a Lead in CRM.
    """
    try:
        leadgen_id = value.get('leadgen_id')
        form_id = value.get('form_id')
        page_id = value.get('page_id') or (entry.get('id') if entry else None)
        ad_id = value.get('ad_id')
        
        # 1. Identify Company (Multi-tenant Page ID routing with legacy fallback)
        from django.db.models import Count
        company = None
        if page_id:
            company = Company.objects.filter(meta_page_id=str(page_id)).first()
            
        if not company:
            company = Company.objects.filter(name__icontains="MARKETING LLP").first()
        if not company:
            company = Company.objects.annotate(lead_count=Count('leads')).filter(name__icontains="brandlumeo").order_by('-lead_count').first()
        if not company:
            company = Company.objects.annotate(lead_count=Count('leads')).order_by('-lead_count').first()
            
        lead_name = ""
        lead_email = ""
        lead_mobile = ""
        raw_fields = {}
        platform = "meta"
        ad_name = ""
        adset_name = ""
        campaign_name = ""
        
        # 2. Check if field_data is passed directly (testing / simulator)
        field_data = value.get('field_data') or []
        
        # 3. Fetch from Graph API if leadgen_id and token available
        access_token = (
            getattr(company, 'meta_page_access_token', None) 
            or getattr(company, 'whatsapp_access_token', None) 
            if company else None
        )
        if not access_token:
            c_with_token = Company.objects.exclude(meta_page_access_token__isnull=True).exclude(meta_page_access_token="").first()
            if not c_with_token:
                c_with_token = Company.objects.exclude(whatsapp_access_token__isnull=True).exclude(whatsapp_access_token="").first()
            if c_with_token:
                access_token = c_with_token.meta_page_access_token or c_with_token.whatsapp_access_token
                
        if leadgen_id and access_token and not field_data:
            try:
                graph_url = f"https://graph.facebook.com/v21.0/{leadgen_id}?fields=id,created_time,ad_id,ad_name,adset_name,campaign_name,form_id,field_data,platform&access_token={access_token}"
                res = requests.get(graph_url, timeout=10)
                if res.status_code == 200:
                    lead_json = res.json()
                    field_data = lead_json.get('field_data', [])
                    platform = lead_json.get('platform') or 'meta'
                    ad_name = lead_json.get('ad_name') or ''
                    adset_name = lead_json.get('adset_name') or ''
                    campaign_name = lead_json.get('campaign_name') or ''
                else:
                    logger.warning(f"Meta Graph API error fetching leadgen {leadgen_id}: {res.text}")
            except Exception as ge:
                logger.error(f"Error calling Meta Graph API for leadgen {leadgen_id}: {ge}")
                
        # Determine source: Instagram vs Facebook vs Meta
        is_instagram = str(platform).lower() in ['ig', 'instagram']
        lead_source = 'Instagram' if is_instagram else ('Facebook' if str(platform).lower() in ['fb', 'facebook'] else 'Meta')

        # Parse field_data
        for field in field_data:
            fn = str(field.get('name', '')).lower()
            vals = field.get('values', [])
            val = vals[0] if (vals and isinstance(vals, list)) else field.get('value', '')
            raw_fields[fn] = val
            
            if fn in ['full_name', 'name']:
                lead_name = val
            elif fn == 'first_name':
                lead_name = f"{val} {raw_fields.get('last_name', '')}".strip()
            elif fn == 'last_name' and not lead_name:
                lead_name = f"{raw_fields.get('first_name', '')} {val}".strip()
            elif 'phone' in fn or 'mobile' in fn:
                lead_mobile = str(val).strip()
            elif 'email' in fn:
                lead_email = str(val).strip()
                
        if not lead_name and lead_mobile:
            lead_name = f"{lead_source} Lead {lead_mobile}"
        elif not lead_name and lead_email:
            lead_name = lead_email.split('@')[0]
        elif not lead_name:
            lead_name = f"{lead_source} Lead {leadgen_id or 'Ad'}"
            
        if not lead_email:
            lead_email = f"lead_{leadgen_id or lead_mobile or 'meta'}@{lead_source.lower()}.local"
            
        custom_data = {
            'leadgen_id': leadgen_id,
            'page_id': page_id,
            'form_id': form_id,
            'ad_id': ad_id,
            'ad_name': ad_name,
            'adset_name': adset_name,
            'campaign_name': campaign_name,
            'platform': platform,
            'raw_fields': raw_fields,
        }
        
        # Create or update Lead
        if lead_mobile:
            lead, created = Lead.objects.get_or_create(
                company=company,
                mobile=lead_mobile,
                defaults={
                    'name': lead_name,
                    'email': lead_email,
                    'source': lead_source,
                    'status': 'new',
                    'custom_data': custom_data
                }
            )
            if not created:
                existing_custom = lead.custom_data or {}
                existing_custom['last_meta_ad'] = custom_data
                lead.custom_data = existing_custom
                lead.save(update_fields=['custom_data'])
        else:
            lead = Lead.objects.create(
                company=company,
                name=lead_name,
                email=lead_email,
                source=lead_source,
                status='new',
                custom_data=custom_data
            )
        return lead
    except Exception as e:
        logger.error(f"Failed to process Meta Leadgen webhook: {e}")
        return None

import hashlib
import time

def send_meta_lead_quality_event(lead):
    """
    Send QualifiedLead or DisqualifiedLead event to Meta Conversions API (CAPI).
    Meta uses this feedback loop to optimize ad delivery and find only high-quality leads.
    """
    try:
        company = lead.company
        if not company:
            return
        
        pixel_id = getattr(company, 'meta_pixel_id', None)
        access_token = getattr(company, 'meta_page_access_token', None) or getattr(company, 'whatsapp_access_token', None)
        if not pixel_id or not access_token:
            logger.info("Meta CAPI: Skipped sending quality event (meta_pixel_id or access_token not set)")
            return

        event_name = "QualifiedLead" if lead.quality == "high_quality" else ("DisqualifiedLead" if lead.quality == "low_quality" else None)
        if not event_name:
            return

        leadgen_id = lead.custom_data.get('leadgen_id') if isinstance(lead.custom_data, dict) else None

        user_data = {}
        if leadgen_id:
            user_data['lead_id'] = str(leadgen_id)
        if lead.mobile:
            cleaned_phone = "".join(filter(str.isdigit, str(lead.mobile)))
            user_data['ph'] = [hashlib.sha256(cleaned_phone.encode('utf-8')).hexdigest()]
        if lead.email and not lead.email.endswith('.local'):
            user_data['em'] = [hashlib.sha256(lead.email.strip().lower().encode('utf-8')).hexdigest()]

        payload = {
            "data": [
                {
                    "event_name": event_name,
                    "event_time": int(time.time()),
                    "action_source": "system_generated",
                    "user_data": user_data,
                    "custom_data": {
                        "lead_quality": lead.quality,
                        "lead_event_source": "Lumeo CRM",
                    }
                }
            ]
        }

        capi_url = f"https://graph.facebook.com/v21.0/{pixel_id}/events"
        res = requests.post(capi_url, params={"access_token": access_token}, json=payload, timeout=6)
        logger.info(f"Meta CAPI Lead Quality sent for lead {lead.id} ({event_name}): {res.status_code}")
    except Exception as e:
        logger.error(f"Failed to send Meta CAPI Lead Quality event for lead {lead.id}: {e}")

class WhatsAppWebhookView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        mode = request.GET.get('hub.mode')
        token = request.GET.get('hub.verify_token')
        challenge = request.GET.get('hub.challenge')

        verify_token = getattr(settings, 'WHATSAPP_VERIFY_TOKEN', 'lumeo_crm_whatsapp_token')

        if mode == 'subscribe' and token in [verify_token, 'lumeo_crm_whatsapp_token', 'lumeo_crm_meta_token']:
            return Response(int(challenge), status=200)
        return Response({'error': 'Invalid verification token'}, status=403)

    def post(self, request):
        try:
            body = request.data
            
            # 1. WhatsApp Cloud API payload structure
            if body.get('object') == 'whatsapp_business_account':
                for entry in body.get('entry', []):
                    for change in entry.get('changes', []):
                        value = change.get('value', {})
                        messages = value.get('messages', [])
                        contacts = value.get('contacts', [])
                        
                        if messages and contacts:
                            message = messages[0]
                            contact = contacts[0]
                            metadata = value.get('metadata', {})
                            
                            phone_number = contact.get('wa_id')
                            name = contact.get('profile', {}).get('name', f"WhatsApp Lead {phone_number}")
                            
                            wamid = message.get('id')
                            msg_type = message.get('type')
                            
                            content = ""
                            if msg_type == 'text':
                                content = message.get('text', {}).get('body', '')
                            else:
                                content = f"[{msg_type} message received]"
                            
                            phone_number_id = metadata.get('phone_number_id')
                            
                            company = None
                            if phone_number_id:
                                company = Company.objects.filter(whatsapp_phone_number_id=phone_number_id).first()
                            
                            if not company:
                                from django.db.models import Count
                                company = Company.objects.filter(name__icontains="MARKETING LLP").first()
                            if not company:
                                company = Company.objects.annotate(lead_count=Count('leads')).filter(name__icontains="brandlumeo").order_by('-lead_count').first()
                            if not company:
                                company = Company.objects.annotate(lead_count=Count('leads')).order_by('-lead_count').first()

                            lead, created = Lead.objects.get_or_create(
                                company=company,
                                mobile=phone_number,
                                defaults={
                                    'name': name,
                                    'source': 'WhatsApp',
                                    'status': 'new',
                                    'email': f"{phone_number}@whatsapp.local",
                                }
                            )
                            
                            if wamid:
                                WhatsAppMessage.objects.get_or_create(
                                    message_id=wamid,
                                    defaults={
                                        'company': company,
                                        'lead': lead,
                                        'direction': 'inbound',
                                        'content': content,
                                        'status': 'received',
                                        'raw_payload': message
                                    }
                                )

            # 2. Check for Leadgen in any entry changes (Page / Lead Ads / Click-to-WhatsApp)
            for entry in body.get('entry', []):
                for change in entry.get('changes', []):
                    if change.get('field') == 'leadgen':
                        process_meta_leadgen(change.get('value', {}), entry)
            
            # 3. Direct Sample test payload from Meta App Dashboard
            if 'sample' in body:
                sample = body.get('sample', {})
                if sample.get('field') == 'leadgen':
                    process_meta_leadgen(sample.get('value', {}))
                                
            return Response({'status': 'ok'})
        except Exception as e:
            logger.error(f"Webhook error: {e}")
            return Response({'error': str(e)}, status=500)


class MetaLeadAdsWebhookView(APIView):
    """
    Dedicated endpoint for Meta Lead Ads (Facebook & Instagram Lead Generation).
    """
    permission_classes = [AllowAny]

    def get(self, request):
        from django.http import HttpResponse
        mode = request.GET.get('hub.mode')
        token = request.GET.get('hub.verify_token')
        challenge = request.GET.get('hub.challenge')

        verify_token = getattr(settings, 'META_LEADGEN_VERIFY_TOKEN', 'lumeo_crm_meta_token')

        if mode == 'subscribe' and token in [verify_token, 'lumeo_crm_meta_token', 'lumeo_crm_whatsapp_token']:
            return HttpResponse(challenge, content_type="text/plain", status=200)
        return Response({'error': 'Invalid verification token'}, status=403)

    def post(self, request):
        try:
            body = request.data
            for entry in body.get('entry', []):
                for change in entry.get('changes', []):
                    if change.get('field') == 'leadgen':
                        process_meta_leadgen(change.get('value', {}), entry)
            if 'sample' in body:
                sample = body.get('sample', {})
                if sample.get('field') == 'leadgen':
                    process_meta_leadgen(sample.get('value', {}))
            return Response({'status': 'ok'})
        except Exception as e:
            logger.error(f"Meta Lead Ads Webhook error: {e}")
            return Response({'error': str(e)}, status=500)

