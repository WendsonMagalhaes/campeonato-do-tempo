import unittest

from stabilize import Stabilizer


class StabilizeTests(unittest.TestCase):
    def test_emits_only_after_stable_window(self) -> None:
        s = Stabilizer(window=3)
        self.assertIsNone(s.push("1.56"))
        self.assertIsNone(s.push("1.56"))
        self.assertEqual(s.push("1.56"), "1.56")
        self.assertIsNone(s.push("1.56"))

    def test_value_change_resets_emit(self) -> None:
        s = Stabilizer(window=2)
        self.assertIsNone(s.push("1.50"))
        self.assertEqual(s.push("1.50"), "1.50")
        self.assertIsNone(s.push("1.51"))
        self.assertEqual(s.push("1.51"), "1.51")


if __name__ == "__main__":
    unittest.main()
