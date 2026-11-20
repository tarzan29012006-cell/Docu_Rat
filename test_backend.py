import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend_app.settings')
django.setup()

from rest_framework.test import APIRequestFactory
from chatbot_api.views import SessionView, DocumentView, ChatView, AcceptanceTestSuiteView

factory = APIRequestFactory()

# 1. Test Session Creation
req = factory.post('/api/session')
resp = SessionView.as_view()(req)
session_id = resp.data['session_id']
print('Session created:', session_id)

# 2. Test Loading Default College Policy PDF
req = factory.post('/api/documents', {'session_id': session_id, 'load_default': True}, format='json')
resp = DocumentView.as_view()(req)
print('Document loaded status:', resp.status_code)
print('Document filename:', resp.data['document']['filename'])
print('Document page count:', resp.data['document']['page_count'])
print('Document chunk count:', resp.data['document']['chunk_count'])

# 3. Test Chat Query
req = factory.post('/api/chat', {'session_id': session_id, 'message': 'What is the attendance requirement to appear for exams?'}, format='json')
resp = ChatView.as_view()(req)
print('Chat response cited pages:', resp.data.get('cited_pages'))
print('Chat response content excerpt:', resp.data.get('content')[:140])

# 4. Test Acceptance Test Suite
req = factory.post('/api/test-suite')
resp = AcceptanceTestSuiteView.as_view()(req)
print('Test Suite Summary:', resp.data['summary'])
for t in resp.data['tests']:
    status = 'PASS' if t['passed'] else 'FAIL'
    print(f"[{status}] {t['id']}: {t['scenario']}")
    if not t['passed']:
        print(f"    Expected: {t['expected']}")
        print(f"    Actual:   {t['actual']}")

# 5. Test Frontend Asset Serving
from django.test import Client
import re
client = Client()
r_home = client.get('/')
html = r_home.content.decode()
js_match = re.search(r'src="(/assets/[^"]+)"', html)
if js_match:
    js_url = js_match.group(1)
    r_js = client.get(js_url)
    print(f"Asset {js_url} status: {r_js.status_code} (Served successfully by Django!)")

