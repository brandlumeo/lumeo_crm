from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Conversation, Message

User = get_user_model()

class UserMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'email', 'avatar']

class MessageSerializer(serializers.ModelSerializer):
    sender = UserMiniSerializer(read_only=True)
    is_read_by_me = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ['id', 'conversation', 'sender', 'body', 'created_at', 'is_read_by_me']
        read_only_fields = ['id', 'conversation', 'sender', 'created_at', 'is_read_by_me']

    def get_is_read_by_me(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.read_by.filter(id=request.user.id).exists()
        return False

class ConversationSerializer(serializers.ModelSerializer):
    participants = UserMiniSerializer(many=True, read_only=True)
    latest_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    other_user = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ['id', 'type', 'name', 'participants', 'latest_message', 'unread_count', 'other_user', 'updated_at']

    def get_latest_message(self, obj):
        msg = obj.messages.last()
        if msg:
            return MessageSerializer(msg, context=self.context).data
        return None

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.messages.exclude(sender=request.user).exclude(read_by=request.user).count()
        return 0

    def get_other_user(self, obj):
        request = self.context.get('request')
        if obj.type == 'DIRECT' and request and request.user.is_authenticated:
            other = obj.participants.exclude(id=request.user.id).first()
            if other:
                return UserMiniSerializer(other).data
        return None
