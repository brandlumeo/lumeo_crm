import requests
import json

WEBHOOK_URL = "http://127.0.0.1:8000/api/v1/crm/webhooks/whatsapp/"

payload = {
    "object": "whatsapp_business_account",
    "entry": [
        {
            "id": "123456789",
            "changes": [
                {
                    "value": {
                        "messaging_product": "whatsapp",
                        "metadata": {
                            "display_phone_number": "1234567890",
                            "phone_number_id": "1234567890"
                        },
                        "contacts": [
                            {
                                "profile": {
                                    "name": "Shamil CV"
                                },
                                "wa_id": "971501234567"
                            }
                        ],
                        "messages": [
                            {
                                "from": "971501234567",
                                "id": "wamid.HBgLMTIzNDU2Nzg5MA==",
                                "timestamp": "1632838338",
                                "text": {
                                    "body": "Hello, I need a quotation for a glass facade."
                                },
                                "type": "text"
                            }
                        ]
                    },
                    "field": "messages"
                }
            ]
        }
    ]
}

response = requests.post(WEBHOOK_URL, json=payload)
print(f"Status Code: {response.status_code}")
print(f"Response: {response.text}")
