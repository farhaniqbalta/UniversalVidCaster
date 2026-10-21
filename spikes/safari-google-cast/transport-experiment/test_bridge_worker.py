import io
import json
import unittest
from unittest.mock import Mock, patch

from bridge_worker import BridgeWorker, MAX_MESSAGE, serve


class BridgeWorkerTests(unittest.TestCase):
    def setUp(self):
        self.transport = Mock()
        self.worker = BridgeWorker(self.transport)

    def request(self, command, **args):
        return self.worker.handle({'id': 'test-1', 'version': 1, 'command': command, 'args': args})

    def test_probe_does_not_touch_transport(self):
        self.assertFalse(self.request('probe')['result']['safariIntegrated'])
        self.assertEqual(self.transport.mock_calls, [])

    def test_unknown_command_cannot_run_code(self):
        self.assertFalse(self.request('exec', command_line='anything')['ok'])
        self.assertEqual(self.transport.mock_calls, [])

    def test_load_is_not_playback_confirmation(self):
        response = self.request('load', url='https://example.test/video.mp4', mimeType='video/mp4')
        self.assertEqual(response['result'], {'accepted': True})
        self.transport.media().play_media.assert_called_once_with('https://example.test/video.mp4', 'video/mp4', stream_type='BUFFERED')

    def test_invalid_urls_never_reach_transport(self):
        for url in ['blob:video', 'file:///movie', 'https://user:pass@example.test/a', 'https://']:
            self.assertFalse(self.request('load', url=url, mimeType='video/mp4')['ok'])
        self.assertEqual(self.transport.mock_calls, [])

    def test_seek_validation_and_conversion(self):
        for value in [True, -1, float('inf'), float('nan'), '1000']:
            self.assertFalse(self.request('seek', positionMs=value)['ok'])
        self.assertTrue(self.request('seek', positionMs=1500)['ok'])
        self.transport.media().seek.assert_called_once_with(1.5)

    def test_transport_errors_redact_private_details(self):
        self.transport.discover.side_effect = RuntimeError('192.168.0.1 private-token')
        response = self.request('discover')
        self.assertEqual(response['error']['code'], 'TRANSPORT_ERROR')
        self.assertNotIn('private-token', json.dumps(response))

    def test_invalid_envelopes(self):
        for message in [None, [], {}, {'id': 'a', 'version': 2, 'command': 'probe'}]:
            self.assertFalse(self.worker.handle(message)['ok'])

    def test_eof_closes_transport_and_response_preserves_id(self):
        output = io.StringIO()
        with patch('bridge_worker.CastTransport', return_value=self.transport):
            serve(io.StringIO('{"id":"one","version":1,"command":"probe"}\n'), output)
        self.assertEqual(json.loads(output.getvalue())['id'], 'one')
        self.transport.close.assert_called_once()

    def test_oversized_frame_stops_worker(self):
        output = io.StringIO()
        with patch('bridge_worker.CastTransport', return_value=self.transport):
            serve(io.StringIO('x' * (MAX_MESSAGE + 1) + '\n'), output)
        self.assertEqual(output.getvalue(), '')
        self.transport.close.assert_called_once()


if __name__ == '__main__':
    unittest.main()
