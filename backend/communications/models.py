from django.db import models
from django.conf import settings

class Conversation(models.Model):
    TYPE_CHOICES = (
        ('DIRECT', 'Direct Message'),
        ('GROUP', 'Group Chat'),
    )
    company = models.ForeignKey('companies.Company', on_delete=models.CASCADE, related_name='conversations')
    type = models.CharField(max_length=10, choices=TYPE_CHOICES, default='DIRECT')
    name = models.CharField(max_length=100, blank=True, null=True) # For groups
    participants = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='conversations')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        if self.type == 'GROUP' and self.name:
            return f"Group: {self.name}"
        return f"Conversation {self.id}"

class Message(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_messages')
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    read_by = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='read_messages', blank=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Message {self.id} by {self.sender.email}"
