from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from django.contrib.auth import get_user_model
from .models import Conversation, Message
from .serializers import ConversationSerializer, MessageSerializer

User = get_user_model()

class ConversationViewSet(viewsets.ModelViewSet):
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Conversation.objects.filter(company=user.company, participants=user).order_by('-updated_at')

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)

    @action(detail=False, methods=['post'])
    def start_direct(self, request):
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({'error': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            target_user = User.objects.get(id=user_id, company=request.user.company)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        if target_user == request.user:
            return Response({'error': 'Cannot start conversation with yourself'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if direct conversation already exists
        convs = Conversation.objects.filter(company=request.user.company, type='DIRECT', participants=request.user)
        convs = convs.filter(participants=target_user)
        
        if convs.exists():
            conv = convs.first()
        else:
            conv = Conversation.objects.create(company=request.user.company, type='DIRECT')
            conv.participants.add(request.user, target_user)
            
        serializer = self.get_serializer(conv)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        conv = self.get_object()
        body = request.data.get('body')
        if not body:
            return Response({'error': 'body is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        msg = Message.objects.create(
            conversation=conv,
            sender=request.user,
            body=body
        )
        msg.read_by.add(request.user)
        
        # update conversation updated_at
        conv.save()
        
        serializer = MessageSerializer(msg, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        conv = self.get_object()
        msgs = conv.messages.all()
        
        # mark unread as read
        unread = msgs.exclude(read_by=request.user)
        for u in unread:
            u.read_by.add(request.user)
            
        serializer = MessageSerializer(msgs, many=True, context={'request': request})
        return Response(serializer.data)
