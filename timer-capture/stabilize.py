from __future__ import annotations

from collections import deque, Counter


class Stabilizer:
    def __init__(self, window: int = 10, min_freq: int = 6) -> None:
        self.window = window
        self.min_freq = min_freq
        self.buffer: deque[str | None] = deque(maxlen=window)
        self.emitted: str | None = None

    def push(self, value: str | None) -> str | None:
        self.buffer.append(value)
        if len(self.buffer) < self.window:
            return None
            
        valid_values = [v for v in self.buffer if v is not None]
        if not valid_values:
            return None
            
        counter = Counter(valid_values)
        most_common_val, count = counter.most_common(1)[0]
        
        if count >= self.min_freq:
            stable = most_common_val
            if stable != self.emitted:
                self.emitted = stable
                return stable
            return stable # Return the stable value even if it hasn't changed
        return None

    def reset(self) -> None:
        self.buffer.clear()
        self.emitted = None
