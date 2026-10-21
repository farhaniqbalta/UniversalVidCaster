"""Isolated macOS transport test. Never imported by the Safari extension.

Run without arguments for discovery only. --device NAME --exercise explicitly
loads the public flower MP4 and exercises controls on the selected device.
"""
import argparse
import json
import logging
import threading
import time

import pychromecast

FLOWER = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'


class ReceiverUpdates:
    """Keep immutable snapshots so a cached state cannot pass a fresh check."""
    def __init__(self):
        self.condition = threading.Condition()
        self.sequence = 0
        self.snapshot = {}

    def new_media_status(self, status):
        with self.condition:
            self.sequence += 1
            self.snapshot = {
                'state': status.player_state, 'position': status.current_time,
                'duration': status.duration, 'flower_media': status.content_id == FLOWER,
            }
            self.condition.notify_all()

    def fresh(self, media, expected=None, timeout=15):
        with self.condition:
            before = self.sequence
        media.update_status()
        with self.condition:
            if not self.condition.wait_for(
                lambda: self.sequence > before and (expected is None or self.snapshot['state'] == expected),
                timeout=timeout,
            ):
                raise RuntimeError(f'No fresh {expected or "media"} status; last snapshot: {self.snapshot}')
            return dict(self.snapshot)


class TransportWarnings(logging.Handler):
    def __init__(self):
        super().__init__(logging.WARNING)
        self.count = 0

    def emit(self, record):
        self.count += 1
        # Avoid retaining library log prefixes containing private device addresses.
        report('transport_warning', kind=record.levelname,
               ssl_bad_length='BAD_LENGTH' in record.getMessage())


def report(event, **values):
    print(json.dumps({'event': event, **values}), flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--device', help='Exact discovered friendly name; no manual IP input')
    parser.add_argument('--exercise', action='store_true', help='Load media and test controls')
    parser.add_argument('--visual-only', action='store_true', help='With --exercise, replay the short clip three times for visual confirmation')
    parser.add_argument('--cycles', type=int, choices=range(1, 4), default=1, help='Bounded control cycles (1–3)')
    parser.add_argument('--no-visual', action='store_true', help='Skip final visual replay after control tests')
    args = parser.parse_args()
    if args.exercise and not args.device:
        parser.error('--exercise requires an explicit --device')
    devices = []
    browser = None
    warnings = TransportWarnings()
    logger = logging.getLogger('pychromecast')
    logger.addHandler(warnings)
    previous_propagate = logger.propagate
    logger.propagate = False
    try:
        devices, browser = pychromecast.get_chromecasts(timeout=12, tries=1)
        report('discovery', devices=[{'name': device.name, 'model': device.model_name} for device in devices])
        if not args.exercise:
            return
        matches = [device for device in devices if device.name == args.device]
        if len(matches) != 1:
            raise RuntimeError('Expected exactly one device with that name; no media sent.')
        cast = matches[0]
        cast.wait(timeout=15)
        report('connected', name=cast.name)
        media = cast.media_controller
        updates = ReceiverUpdates()
        media.register_status_listener(updates)

        def wait_state(expected, timeout=15):
            snapshot = updates.fresh(media, expected, timeout)
            report('receiver_status', **snapshot)
            if not snapshot['flower_media']:
                raise RuntimeError('Fresh receiver status did not identify the requested media.')

        if args.visual_only:
            for round_number in range(1, 4):
                report('visual_replay', round=round_number, total=3)
                media.play_media(FLOWER, 'video/mp4', title='Flower — visual check', stream_type='BUFFERED')
                wait_state('PLAYING')
                time.sleep(7)
            return

        for cycle in range(1, args.cycles + 1):
            report('cycle_started', cycle=cycle)
            report('load_requested', receiver='Default Media Receiver', media='MDN flower MP4')
            media.play_media(FLOWER, 'video/mp4', title='Flower — Cast transport probe', stream_type='BUFFERED')
            wait_state('PLAYING')
            media.pause()
            wait_state('PAUSED')
            media.seek(1.0)
            snapshot = updates.fresh(media)
            report('seek_status', requested_position=1.0, reported_position=snapshot['position'])
            if not snapshot['flower_media'] or abs(snapshot['position'] - 1.0) > 0.75:
                raise RuntimeError('Receiver did not confirm the seek within tolerance.')
            media.play()
            wait_state('PLAYING')
            media.stop()
            wait_state('IDLE')
            report('controls_completed', cycle=cycle)
        report('reliability_summary', completed_cycles=args.cycles, warning_count=warnings.count)
        if args.no_visual:
            return
        # Replay once so the user can observe the short clip on the TV.
        media.play_media(FLOWER, 'video/mp4', title='Flower — visual check', stream_type='BUFFERED')
        wait_state('PLAYING')
        report('visual_check', message='Confirm the flower video appears on the TV. Waiting 10 seconds.')
        time.sleep(10)
    finally:
        for device in devices:
            # Discovery creates clients whose worker threads may never start.
            if device.socket_client.is_alive():
                device.disconnect(timeout=5)
        if browser is not None:
            browser.stop_discovery()
        report('cleanup', message='Discovery stopped and started sender connections closed; no receiver app quit requested.')
        logger.removeHandler(warnings)
        logger.propagate = previous_propagate


if __name__ == '__main__':
    main()
