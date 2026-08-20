import os
import requests
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

class AIChatView(APIView):
    """
    POST /api/v1/crm/ai-chat/
    Connects to Google Gemini API (Free Tier) to power the Lumeo AI Assistant.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user_message = request.data.get("message", "")
        history = request.data.get("history", [])

        if not user_message:
            return Response({"reply": "I didn't receive a message!"})

        api_key = os.environ.get("GEMINI_API_KEY")

        if not api_key:
            return Response({
                "reply": "⚠️ **AI Offline**\n\nTo activate me for free:\n1. Get a free API key from Google AI Studio\n2. Add `GEMINI_API_KEY=your_key` to your `backend/.env` file.\n3. Restart your Django server!\n\nOnce you do that, I will be fully functional."
            })

        # Format context for the AI
        user = request.user
        company = getattr(user, "company", None)
        company_name = company.name if company else "Lumeo CRM"

        if company:
            from crm.models import Lead, Deal, Task
            total_leads = Lead.objects.filter(company=company).count()
            won_deals = Deal.objects.filter(company=company, stage='won').count()
            open_tasks = Task.objects.filter(company=company, status__in=['todo', 'in_progress']).count()
            data_context = f"Company Database Status: You currently have {total_leads} total leads, {won_deals} successfully won deals, and {open_tasks} open tasks."
        else:
            data_context = "No database information available."
        
        context_prompt = f"You are Lumeo AI, a helpful and professional CRM assistant for {company_name}. The user you are talking to is {user.first_name or user.username} and their role is {user.role}. {data_context} Keep responses concise, professional, and friendly. Do not use markdown headers."

        # Call Gemini REST API
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
        
        contents = [{"role": "user", "parts": [{"text": context_prompt}]}]
        contents.append({"role": "model", "parts": [{"text": "Understood. I am Lumeo AI."}]})
        
        # Add history
        for msg in history:
            role = "user" if msg.get("role") == "user" else "model"
            # Exclude the exact system trigger string to avoid confusion
            if msg.get("content", "").startswith("⚠️ **AI Offline**"):
                continue
            contents.append({
                "role": role,
                "parts": [{"text": msg.get("content", "")}]
            })
            
        # Add current message
        contents.append({
            "role": "user",
            "parts": [{"text": user_message}]
        })

        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 800,
            }
        }

        import time
        max_retries = 3
        for attempt in range(max_retries):
            try:
                resp = requests.post(url, json=payload, timeout=10)
                resp_data = resp.json()
                
                if resp.status_code == 200:
                    reply = resp_data["candidates"][0]["content"]["parts"][0]["text"]
                    return Response({"reply": reply})
                elif resp.status_code == 503 and attempt < max_retries - 1:
                    time.sleep(1) # wait 1 second before retrying
                    continue
                else:
                    return Response({"reply": f"Gemini API Error: {resp_data.get('error', {}).get('message', 'Unknown error')}"})
            except Exception as e:
                return Response({"reply": f"Failed to connect to AI: {str(e)}"})
        return Response({"reply": "Gemini API Error: The free API is currently overloaded. Please try again in a few seconds."})


class AIEmailDraftView(APIView):
    """
    POST /api/v1/crm/ai-email-draft/
    Generates an email draft using Gemini based on CRM context.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        lead_id = request.data.get("lead_id")
        customer_id = request.data.get("customer_id")
        prompt = request.data.get("prompt", "")

        if not lead_id and not customer_id:
            return Response({"error": "Must provide lead_id or customer_id"}, status=400)

        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            return Response({"error": "GEMINI_API_KEY is not configured."}, status=503)

        user = request.user
        company = getattr(user, "company", None)
        
        target = None
        if lead_id:
            from crm.models import Lead
            target = Lead.objects.filter(id=lead_id, company=company).first()
        else:
            from crm.models import Customer
            target = Customer.objects.filter(id=customer_id, company=company).first()
            
        if not target:
            return Response({"error": "Record not found"}, status=404)

        # Build Context
        target_name = f"{target.first_name} {target.last_name}"
        context_parts = [
            f"You are Lumeo AI, drafting an email for {user.first_name or user.username} ({user.role}).",
            f"The recipient is {target_name}, and their company is {target.company_name if hasattr(target, 'company_name') else target.company}."
        ]
        
        # Add recent notes/activities
        # limit to last 3 for brevity
        from crm.models import Note, Activity
        notes = Note.objects.filter(lead=target if lead_id else None, customer=target if customer_id else None).order_by('-created_at')[:3]
        if notes:
            context_parts.append("Recent notes on this person:")
            for n in notes:
                context_parts.append(f"- {n.content}")

        activities = Activity.objects.filter(lead=target if lead_id else None, customer=target if customer_id else None).order_by('-created_at')[:3]
        if activities:
            context_parts.append("Recent activities:")
            for a in activities:
                context_parts.append(f"- {a.type}: {a.title} ({a.description})")
                
        if prompt:
            context_parts.append(f"Specific instructions from user: {prompt}")
        else:
            context_parts.append("Draft a polite, professional follow-up email.")

        context_parts.append("IMPORTANT: Output ONLY a JSON object with 'subject' and 'body' keys. No markdown blocks, no other text.")

        final_prompt = "\n".join(context_parts)
        
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
        
        payload = {
            "contents": [{"role": "user", "parts": [{"text": final_prompt}]}],
            "generationConfig": {
                "temperature": 0.7,
                "responseMimeType": "application/json"
            }
        }
        
        import time
        for attempt in range(3):
            try:
                resp = requests.post(url, json=payload, timeout=10)
                resp_data = resp.json()
                
                if resp.status_code == 200:
                    reply = resp_data["candidates"][0]["content"]["parts"][0]["text"]
                    import json
                    try:
                        parsed = json.loads(reply)
                        return Response(parsed)
                    except:
                        return Response({"subject": "Follow Up", "body": reply})
                        
                elif resp.status_code == 503 and attempt < 2:
                    time.sleep(1)
                    continue
                else:
                    return Response({"error": f"Gemini Error: {resp_data.get('error', {}).get('message')}"}, status=400)
            except Exception as e:
                return Response({"error": str(e)}, status=500)
                
        return Response({"error": "API overloaded"}, status=503)
