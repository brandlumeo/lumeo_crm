from django.contrib import admin
from .models import Conversation, Message

@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ("name", "company", "type", "created_at")
    list_filter = ("type", "company")
    search_fields = ("name", "company__name")

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("conversation", "sender", "created_at")
    search_fields = ("body", "sender__username", "conversation__name")
