"""Experimental serial JSON-lines worker over inherited stdin/stdout only.

No listener socket, HTTP server, subprocess execution, or Safari integration.
The native launcher and sandboxed runtime packaging are separate unproven gates.
"""
import contextlib
import hashlib
import json
import math
import sys
from urllib.parse import urlsplit

from cast_probe import ReceiverUpdates

MAX_MESSAGE = 16384


class RequestError(ValueError):
    """Validated local error whose message is safe to return."""


class CastTransport:
    def __init__(self):
        self.devices = []
        self.browser = None
        self.selected = None
        self.updates = None

    def discover(self):
        if self.selected:
            raise RequestError('Disconnect before rediscovery.')
        self.close()
        import pychromecast
        self.devices, self.browser = pychromecast.get_chromecasts(timeout=10, tries=1)
        return [{'id': self.device_id(device), 'name': device.name} for device in self.devices]

    @staticmethod
    def device_id(device):
        return hashlib.sha256(str(device.uuid).encode()).hexdigest()[:24]

    def connect(self, device_id):
        if self.selected:
            raise RequestError('Disconnect before connecting again.')
        matches = [device for device in self.devices if self.device_id(device) == device_id]
        if len(matches) != 1:
            raise RequestError('Select a device from the current discovery results.')
        selected = matches[0]
        try:
            selected.wait(timeout=15)
        except Exception:
            self.close()
            raise
        self.selected = selected
        self.updates = ReceiverUpdates()
        selected.media_controller.register_status_listener(self.updates)
        return {'connected': True, 'deviceId': device_id}

    def media(self):
        if not self.selected or not self.selected.socket_client.is_connected:
            raise RequestError('No active Cast connection; reconnect explicitly.')
        return self.selected.media_controller

    def status(self):
        snapshot = self.updates.fresh(self.media())
        # Transport-neutral snapshot, not the flower-specific probe assertion.
        snapshot.pop('flower_media', None)
        return {'connected': True, 'fresh': True, **snapshot}

    def close(self):
        try:
            for device in self.devices:
                if device.socket_client.is_alive():
                    device.disconnect(timeout=5)
        finally:
            if self.browser:
                self.browser.stop_discovery()
            self.devices, self.browser, self.selected, self.updates = [], None, None, None


class BridgeWorker:
    def __init__(self, transport=None):
        self.transport = transport if transport is not None else CastTransport()

    def handle(self, request):
        request_id = request.get('id') if isinstance(request, dict) else None
        try:
            if not isinstance(request_id, str) or not 1 <= len(request_id) <= 64:
                raise RequestError('A bounded string request id is required.')
            if type(request.get('version')) is not int or request.get('version') != 1:
                raise RequestError('Unsupported protocol version.')
            command = request.get('command')
            args = request.get('args', {})
            if not isinstance(args, dict):
                raise RequestError('args must be an object.')
            if command == 'probe':
                result = {'version': 1, 'experimental': True, 'safariIntegrated': False}
            elif command == 'discover':
                result = {'devices': self.transport.discover()}
            elif command == 'connect':
                if not isinstance(args.get('deviceId'), str):
                    raise RequestError('deviceId is required.')
                result = self.transport.connect(args['deviceId'])
            elif command == 'load':
                url, mime = args.get('url'), args.get('mimeType')
                if not isinstance(url, str) or not isinstance(mime, str) or len(mime) > 128 or '/' not in mime:
                    raise RequestError('A direct media URL and MIME type are required.')
                parsed = urlsplit(url)
                if parsed.scheme not in ('http', 'https') or not parsed.hostname or parsed.username or parsed.password:
                    raise RequestError('Use HTTP(S) without embedded credentials.')
                self.transport.media().play_media(url, mime, stream_type='BUFFERED')
                result = {'accepted': True}  # Not a playback confirmation.
            elif command in ('play', 'pause', 'stop'):
                getattr(self.transport.media(), command)()
                result = {'accepted': True}
            elif command == 'seek':
                position = args.get('positionMs')
                if isinstance(position, bool) or not isinstance(position, (int, float)) or not math.isfinite(position) or position < 0:
                    raise RequestError('A finite non-negative positionMs is required.')
                self.transport.media().seek(position / 1000)
                result = {'accepted': True}
            elif command == 'status':
                result = self.transport.status()
            elif command == 'disconnect':
                self.transport.close()
                result = {'connected': False}
            else:
                raise RequestError('Unsupported command.')
            return {'id': request_id, 'version': 1, 'ok': True, 'result': result}
        except RequestError as error:
            return {'id': request_id, 'version': 1, 'ok': False, 'error': {'code': 'INVALID_REQUEST_OR_STATE', 'message': str(error)}}
        except Exception:
            # Library exceptions can contain private media URLs and LAN addresses.
            return {'id': request_id, 'version': 1, 'ok': False, 'error': {'code': 'TRANSPORT_ERROR', 'message': 'Cast operation failed; refresh status or reconnect.'}}


def serve(input_stream=sys.stdin, output_stream=sys.stdout):
    worker = BridgeWorker()
    try:
        while True:
            line = input_stream.readline(MAX_MESSAGE + 1)
            if not line:
                break
            if len(line) > MAX_MESSAGE:
                # Stop rather than interpreting the remainder as another request.
                break
            try:
                request = json.loads(line)
            except (ValueError, TypeError):
                request = None
            with contextlib.redirect_stdout(sys.stderr):
                response = worker.handle(request)
            output_stream.write(json.dumps(response, allow_nan=False) + '\n')
            output_stream.flush()
    finally:
        worker.transport.close()


if __name__ == '__main__':
    serve()
