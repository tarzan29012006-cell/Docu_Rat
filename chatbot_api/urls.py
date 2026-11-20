from django.urls import path
from .views import (
    SessionView,
    DocumentView,
    ChatView,
    ConfigView,
    AcceptanceTestSuiteView
)

urlpatterns = [
    # Session management
    path('session', SessionView.as_view(), name='api-session-create'),
    path('session/<uuid:session_id>', SessionView.as_view(), name='api-session-detail'),

    # Document management
    path('documents', DocumentView.as_view(), name='api-document-list'),
    path('documents/<uuid:document_id>', DocumentView.as_view(), name='api-document-detail'),

    # Chat management
    path('chat', ChatView.as_view(), name='api-chat-create'),
    path('chat/<uuid:session_id>', ChatView.as_view(), name='api-chat-history'),

    # Configuration & Settings (FR-20)
    path('config', ConfigView.as_view(), name='api-config'),

    # Acceptance Test Suite (SRS Section 9.1)
    path('test-suite', AcceptanceTestSuiteView.as_view(), name='api-test-suite'),
]
