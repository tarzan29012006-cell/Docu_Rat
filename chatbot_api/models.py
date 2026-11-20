import uuid
from django.db import models
from django.utils import timezone
from datetime import timedelta

class ChatSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField(blank=True, null=True)

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(hours=24)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Session {self.id}"


class Document(models.Model):
    FILE_TYPES = [
        ('pdf', 'PDF Document'),
        ('docx', 'Word Document'),
        ('txt', 'Plain Text'),
        ('text', 'Pasted Text'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name='documents')
    filename = models.CharField(max_length=255)
    file_type = models.CharField(max_length=20, choices=FILE_TYPES)
    file_size = models.BigIntegerField(default=0)  # in bytes
    page_count = models.IntegerField(default=1)
    chunk_count = models.IntegerField(default=0)
    extracted_text = models.TextField(blank=True)
    is_default_policy = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.filename} ({self.session_id})"


class DocumentChunk(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='chunks')
    chunk_index = models.IntegerField()
    page_number = models.IntegerField(null=True, blank=True)
    heading = models.CharField(max_length=255, blank=True)
    content = models.TextField()
    token_count = models.IntegerField(default=0)

    class Meta:
        ordering = ['chunk_index']

    def __str__(self):
        return f"Doc {self.document_id} Chunk #{self.chunk_index} (Page {self.page_number})"


class ChatMessage(models.Model):
    ROLE_CHOICES = [
        ('user', 'User'),
        ('assistant', 'Assistant'),
        ('system', 'System'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name='messages')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    content = models.TextField()
    cited_pages = models.JSONField(default=list, blank=True)
    cited_passages = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"[{self.role}] {self.content[:40]}..."
