"""
Thread-safe queue bridge between backend work and the SSE response stream.

This lets the retrieval pipeline emit progress, metadata, text chunks, and
terminal results while Flask keeps the request open for the frontend.
"""

from __future__ import annotations

import queue
from dataclasses import dataclass, field
from typing import Any


@dataclass
class ProgressEvent:
    step: dict[str, Any]


@dataclass
class ResultEvent:
    answer: str
    citations: list[dict[str, Any]] = field(default_factory=list)
    sources_used: list[str] = field(default_factory=list)
    intent: str = "GENERAL"
    route: str | None = None
    route_confidence: float | None = None
    route_reasoning: str | None = None
    artifacts: list[dict[str, Any]] = field(default_factory=list)


@dataclass
class PiiStatusEvent:
    has_pii: bool
    categories: list[str] = field(default_factory=list)
    thread: str = "single"
    redacted_text: str = ""


@dataclass
class MetadataEvent:
    intent: str
    sources_used: list[str] = field(default_factory=list)
    route: str | None = None
    route_confidence: float | None = None
    route_reasoning: str | None = None
    artifacts: list[dict[str, Any]] = field(default_factory=list)


@dataclass
class TextChunkEvent:
    content: str


@dataclass
class ErrorEvent:
    message: str


DONE = object()


class ProgressEmitter:
    """Simple queue-backed emitter for request-scoped progress events."""

    def __init__(self):
        self._queue: queue.Queue[Any] = queue.Queue()

    def start(self, step_id: str, tool_name: str, input_summary: str) -> None:
        self._queue.put(
            ProgressEvent(
                step={
                    "id": step_id,
                    "toolName": tool_name,
                    "status": "running",
                    "durationMs": 0,
                    "inputSummary": input_summary,
                    "outputSummary": "Processing...",
                }
            )
        )

    def complete(
        self,
        step_id: str,
        tool_name: str,
        duration_ms: int,
        output_summary: str,
        input_summary: str,
        tokens_used: int | None = None,
    ) -> None:
        step: dict[str, Any] = {
            "id": step_id,
            "toolName": tool_name,
            "status": "completed",
            "durationMs": duration_ms,
            "inputSummary": input_summary,
            "outputSummary": output_summary,
        }
        if tokens_used is not None:
            step["tokensUsed"] = tokens_used
        self._queue.put(ProgressEvent(step=step))

    def error(
        self,
        step_id: str,
        tool_name: str,
        duration_ms: int,
        output_summary: str,
        input_summary: str,
    ) -> None:
        self._queue.put(
            ProgressEvent(
                step={
                    "id": step_id,
                    "toolName": tool_name,
                    "status": "error",
                    "durationMs": duration_ms,
                    "inputSummary": input_summary,
                    "outputSummary": output_summary,
                }
            )
        )

    def emit_pii_status(
        self,
        has_pii: bool,
        categories: list[str] | None = None,
        thread: str = "single",
        redacted_text: str = "",
    ) -> None:
        self._queue.put(
            PiiStatusEvent(
                has_pii=has_pii,
                categories=categories or [],
                thread=thread,
                redacted_text=redacted_text,
            )
        )

    def emit_metadata(self, metadata: MetadataEvent) -> None:
        self._queue.put(metadata)

    def emit_text_chunk(self, content: str) -> None:
        self._queue.put(TextChunkEvent(content=content))

    def finish_streaming(self, result: ResultEvent) -> None:
        self._queue.put(result)
        self._queue.put(DONE)

    def finish(self, result: ResultEvent) -> None:
        self.finish_streaming(result)

    def fail(self, message: str) -> None:
        self._queue.put(ErrorEvent(message=message))
        self._queue.put(DONE)

    def __iter__(self):
        while True:
            try:
                event = self._queue.get(timeout=180)
            except queue.Empty:
                yield ErrorEvent(message="Retrieval timed out")
                break
            if event is DONE:
                break
            yield event
