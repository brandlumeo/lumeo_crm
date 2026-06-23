from rest_framework_nested import routers
from rest_framework.routers import DefaultRouter
from django.urls import path

from .views import (
    CustomerViewSet,
    DealViewSet,
    LeadViewSet,
    NoteViewSet,
    TaskViewSet,
    GlobalSearchView,
    ActivityViewSet,
    AttachmentViewSet,
    ProductViewSet,
    QuoteViewSet,
    InvoiceViewSet,
    CustomFieldDefinitionViewSet,
    WorkflowRuleViewSet,
    WorkflowSequenceViewSet,
    SMTPConfigViewSet,
    EmailTemplateViewSet,
    WebhookSubscriptionViewSet,
    WebhookDeliveryLogViewSet,
    EmailSendView,
    EmailAccountViewSet,
    EmailMessageViewSet,
    CalendarAccountViewSet,
    BookingLinkViewSet,
    PublicBookingView,
    AIAssistantView,
    CampaignViewSet,
    TicketViewSet,
    TicketCommentViewSet,
    QuoteViewSet,
    InvoiceViewSet,
    PublicQuoteView,
    PublicInvoiceView,
    OrderViewSet,
    EventViewSet,
    NoticeViewSet,
)

from .ai_views import AIChatView

app_name = "crm"


router = DefaultRouter()
router.register("leads", LeadViewSet, basename="lead")
router.register("customers", CustomerViewSet, basename="customer")
router.register("deals", DealViewSet, basename="deal")
router.register("tasks", TaskViewSet, basename="task")
router.register("notes", NoteViewSet, basename="note")
router.register("activities", ActivityViewSet, basename="activity")
router.register("attachments", AttachmentViewSet, basename="attachment")
router.register("products", ProductViewSet, basename="product")
router.register("quotes", QuoteViewSet, basename="quote")
router.register("invoices", InvoiceViewSet, basename="invoice")
router.register("custom-fields", CustomFieldDefinitionViewSet, basename="custom-field")
router.register("workflow-rules", WorkflowRuleViewSet, basename="workflow-rule")
router.register("workflow-sequences", WorkflowSequenceViewSet, basename="workflow-sequence")
router.register("smtp-config", SMTPConfigViewSet, basename="smtp-config")
router.register("email-templates", EmailTemplateViewSet, basename="email-template")
router.register("webhooks/subscriptions", WebhookSubscriptionViewSet, basename="webhook-subscription")
router.register("webhooks/logs", WebhookDeliveryLogViewSet, basename="webhook-log")
router.register("email-accounts", EmailAccountViewSet, basename="email-account")
router.register("email-messages", EmailMessageViewSet, basename="email-message")
router.register("calendar-accounts", CalendarAccountViewSet, basename="calendar-account")
router.register("booking-links", BookingLinkViewSet, basename="booking-link")
router.register("campaigns", CampaignViewSet, basename="campaign")
router.register("tickets", TicketViewSet, basename="ticket")
router.register("orders", OrderViewSet, basename="order")
router.register("events", EventViewSet, basename="event")
router.register("notices", NoticeViewSet, basename="notice")

tickets_router = routers.NestedDefaultRouter(router, "tickets", lookup="ticket")
tickets_router.register("comments", TicketCommentViewSet, basename="ticket-comments")

from .analytics_views import PremiumAnalyticsView

urlpatterns = [
    path('search/', GlobalSearchView.as_view(), name='global_search'),
    path('analytics/', PremiumAnalyticsView.as_view(), name='premium_analytics'),
    path('emails/send/', EmailSendView.as_view(), name='email_send'),
    path('ai/assistant/', AIAssistantView.as_view(), name='ai_assistant'),
    path('ai-chat/', AIChatView.as_view(), name='ai-chat'),
    path('book/<slug:slug>/', PublicBookingView.as_view(), name='public_booking'),
    path('public/quote/<uuid:token>/', PublicQuoteView.as_view(), name='public_quote'),
    path('public/invoice/<uuid:token>/', PublicInvoiceView.as_view(), name='public_invoice'),
] + router.urls + tickets_router.urls
