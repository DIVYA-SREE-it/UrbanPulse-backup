"""FastAPI checks require installed dependencies and use temporary storage."""
import importlib.util
import os
import tempfile
import unittest
from datetime import datetime, timezone
from uuid import uuid4

HAS_DEPS = all(importlib.util.find_spec(m) for m in ('fastapi','httpx','multipart'))


@unittest.skipUnless(HAS_DEPS, 'Install backend requirements for FastAPI checks')
class TestCentralAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        os.environ['CENTRAL_DATA_DIR'] = cls.temp.name
        from fastapi.testclient import TestClient
        from app.main import app
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        cls.client.close()
        cls.temp.cleanup()
        os.environ.pop('CENTRAL_DATA_DIR', None)

    def fixture(self):
        return {'event_id': str(uuid4()), 'event_type': 'TRAFFIC_CONGESTION',
                'severity':'HIGH', 'confidence':None,
                'timestamp':datetime.now(timezone.utc).isoformat(), 'bus_id':'TEST-BUS',
                'camera_id':'TRAFFIC_CAMERA', 'latitude':13.01, 'longitude':80.22,
                'gps_source':'SIMULATED_ROUTE', 'source':'PRERECORDED_VIDEO_AI',
                'vehicle_count':25, 'metadata':{'test_fixture':True}}

    def test_health_without_road_weights(self):
        self.assertEqual(self.client.get('/health').status_code, 200)

    def test_idempotency_cursor_and_persistence(self):
        event = self.fixture()
        self.assertEqual(self.client.post('/api/events', json=event).status_code, 200)
        self.assertTrue(self.client.post('/api/events', json=event).json()['duplicate'])
        page = self.client.get('/api/events').json()
        self.assertEqual(sum(r['event_id']==event['event_id'] for r in page['events']),1)
        from app.events import connect, initialize
        initialize()
        with connect() as con:
            count = con.execute('SELECT COUNT(*) FROM events WHERE event_id=?',(event['event_id'],)).fetchone()[0]
        self.assertEqual(count,1)
        self.assertEqual(self.client.get(f"/api/events?after={page['next_cursor']}").json()['events'],[])

    def test_invalid_coordinates_and_naive_timestamp(self):
        event = self.fixture()
        event['latitude'] = 200
        self.assertEqual(self.client.post('/api/events',json=event).status_code,422)
        event['latitude'] = 13
        event['timestamp'] = '2026-09-11T12:00:00'
        self.assertEqual(self.client.post('/api/events',json=event).status_code,422)

    def test_workflow_order_and_persistence(self):
        event = self.fixture()
        self.client.post('/api/events',json=event)
        url = f"/api/events/{event['event_id']}/status"
        self.assertEqual(self.client.patch(url,json={'status':'RESOLVED'}).status_code,409)
        response = self.client.patch(url,json={'status':'VERIFIED','note':'Test review'})
        self.assertEqual(response.status_code,200)
        row = next(r for r in self.client.get('/api/events').json()['events'] if r['event_id']==event['event_id'])
        self.assertEqual(row['status'],'VERIFIED')
