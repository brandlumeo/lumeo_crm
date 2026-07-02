"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import include, path
from django.conf import settings
from django.conf.urls.static import static

from crm.payment_webhooks import (
    stripe_webhook,
    paypal_webhook,
    razorpay_webhook,
    paystack_webhook
)

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Global Webhook endpoints (Matching frontend URL strings precisely)
    path('verify_webhook/<uuid:company_id>', stripe_webhook, name='stripe_webhook'),
    path('paypal-webhook/<uuid:company_id>', paypal_webhook, name='paypal_webhook'),
    path('razorpay-webhook/<uuid:company_id>', razorpay_webhook, name='razorpay_webhook'),
    path('paystack-webhook/<uuid:company_id>', paystack_webhook, name='paystack_webhook'),

    path('api/v1/accounts/', include('accounts.urls')),
    path('api/v1/companies/', include('companies.urls')),
    path('api/v1/crm/', include('crm.urls')),
    path('api/v1/subscriptions/', include('subscriptions.urls')),
    path('api/v1/notifications/', include('notifications.urls')),
    path('api/v1/attendance/', include('attendance.urls')),
    path('api/v1/saas/', include('crm.saas_urls')),
]

from django.urls import re_path
from django.views.static import serve

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
else:
    # Fallback to serve media files through Django in production (e.g. on Render without Nginx)
    urlpatterns += [
        re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
    ]
