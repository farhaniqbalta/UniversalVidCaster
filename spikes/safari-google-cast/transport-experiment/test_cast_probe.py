"""Offline tests for receiver-state freshness; no device or network access."""
from types import SimpleNamespace
import unittest

from cast_probe import FLOWER, ReceiverUpdates


class ReceiverUpdatesTests(unittest.TestCase):
    def setUp(self):
        self.updates = ReceiverUpdates()
        self.status = SimpleNamespace(player_state='PLAYING', current_time=1.0,
                                      duration=5.055, content_id=FLOWER)

    def test_cached_state_cannot_satisfy_check(self):
        self.updates.new_media_status(self.status)
        media = SimpleNamespace(update_status=lambda: None)
        with self.assertRaisesRegex(RuntimeError, 'No fresh'):
            self.updates.fresh(media, 'PLAYING', timeout=0.01)

    def test_new_update_satisfies_check_and_is_copied(self):
        media = SimpleNamespace(update_status=lambda: self.updates.new_media_status(self.status))
        snapshot = self.updates.fresh(media, 'PLAYING', timeout=0.01)
        self.assertTrue(snapshot['flower_media'])
        snapshot['state'] = 'IDLE'
        self.assertEqual(self.updates.snapshot['state'], 'PLAYING')

    def test_wrong_state_cannot_satisfy_check(self):
        media = SimpleNamespace(update_status=lambda: self.updates.new_media_status(self.status))
        with self.assertRaisesRegex(RuntimeError, 'No fresh PAUSED'):
            self.updates.fresh(media, 'PAUSED', timeout=0.01)


if __name__ == '__main__':
    unittest.main()
