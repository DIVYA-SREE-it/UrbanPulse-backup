"""Dependency-free transport checks. Test fixtures never enter the demo database."""
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import tempfile
import threading
import unittest
from urllib.error import HTTPError
from uuid import uuid4
from edge.outbox import Outbox
from edge.runtime import load_config, route_position


class TestOutbox(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.path = Path(self.temp.name) / 'outbox.sqlite3'
        self.received = []
        owner = self
        class Handler(BaseHTTPRequestHandler):
            def do_POST(self):
                event = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
                owner.received.append(event)
                self.send_response(owner.response_status)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'accepted': True, 'event_id': event['event_id']}).encode())
            def log_message(self, *_):
                pass
        self.response_status = 200
        self.server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.url = f'http://127.0.0.1:{self.server.server_port}'
        self.box = Outbox(self.path, self.url)

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()
        self.temp.cleanup()

    def event(self):
        return {'event_id': str(uuid4()), 'event_type': 'TEST_FIXTURE'}

    def test_cooldown_survives_restart(self):
        self.assertTrue(self.box.put(self.event(), 'same', 30))
        reopened = Outbox(self.path, self.url)
        self.assertFalse(reopened.put(self.event(), 'same', 30))
        self.assertEqual(reopened.status()['pending_events'], 1)

    def test_failure_retains_then_retry_clears(self):
        event = self.event()
        self.box.put(event, 'condition', 30)
        self.response_status = 503
        with self.assertRaises(HTTPError): self.box.sync_once()
        self.assertEqual(self.box.status()['pending_events'], 1)
        self.response_status = 200
        self.box.sync_once()
        self.assertEqual(self.box.status()['pending_events'], 0)
        self.assertEqual(self.received[0]['event_id'], self.received[1]['event_id'])

    def test_parallel_camera_writers_preserve_both_events(self):
        threads = [threading.Thread(target=self.box.put, args=(self.event(), camera, 30)) for camera in ('road','traffic')]
        for t in threads: t.start()
        for t in threads: t.join()
        self.assertEqual(self.box.status()['pending_events'], 2)
        self.box.sync_once()
        self.assertEqual(len(self.received), 2)

    def test_expired_cooldown_allows_new_observation(self):
        self.box.put(self.event(), 'condition', 30)
        with self.box.connect() as con: con.execute('UPDATE cooldowns SET until=0')
        self.assertTrue(self.box.put(self.event(), 'condition', 30))


class TestRoute(unittest.TestCase):
    def test_shared_clock_and_loop(self):
        config = load_config()
        self.assertEqual(route_position(config, 0), tuple(config['prototype_route'][0]))
        self.assertEqual(route_position(config, config['route_duration_seconds']), route_position(config, 0))
        self.assertEqual(route_position(config, 60), route_position(config, 180))
        lat, lon = route_position(config, 10)
        self.assertTrue(-90 <= lat <= 90 and -180 <= lon <= 180)
