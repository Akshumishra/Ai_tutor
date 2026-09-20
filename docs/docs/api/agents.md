# Agents API (SSE)

Base path: `/api/agents`  
**File:** `backend/src/backend/api/agents.py`

All agent chat endpoints return **Server-Sent Event (SSE)** streams.

---

## SSE Event Format

All events follow this structure:

```
data: {"type": "...", "data": ...}\n\n
```

| Event Type | Payload | Description |
|------------|---------|-------------|
| `init` | `{"message_id": "uuid"}` | First event — ID of the `AgentChat` row |
| `text` | `{"data": "text delta"}` | Incremental text chunk |
| `tool_call` | `{"data": {"input": {...}, "output": {...}}}` | Tool called |
| `final` | `{"data": {"assistant_text": "...", "tool_calls": [...]}}` | Stream complete |
| `{"error": "..."}` | — | Unhandled exception |

---

## Endpoints

### `POST /api/agents/curriculum`

Start or continue a curriculum design conversation. Returns SSE stream.

**Request:**
```json
{
  "user_id":     "uuid-of-user",
  "topic_id":    "uuid-of-topic",
  "user_input":  "I want to learn Python for data science",
  "chat_history": [
    {"role": "user",      "content": "previous message"},
    {"role": "assistant", "content": "previous response"}
  ]
}
```

**Response:** `text/event-stream`

```
data: {"type": "init", "message_id": "uuid"}\n\n
data: {"type": "text", "data": "Great! Let me ask..."}\n\n
data: {"type": "tool_call", "data": {"input": {...}, "output": {...}}}\n\n
data: {"type": "final", "data": {"assistant_text": "..."}}\n\n
```

!!! note "Topic Pre-creation"
    Call `POST /api/dashboard/topics/create` before the first curriculum message to get a real `topic_id`. This ensures all subsequent workflow status queries find a valid DB row.

---

### `POST /api/agents/teacher`

Start or continue a teaching session for a specific chapter. Returns SSE stream.

**Request:**
```json
{
  "user_id":      "uuid-of-user",
  "chapter_id":   "uuid-of-chapter",
  "user_message": "Please start teaching",
  "chat_history": [...]
}
```

**Prerequisites:**
- The chapter must exist in the database
- `Topic.status` must be `"completed"` (curriculum finalized)

**Response:** `text/event-stream` (same format as curriculum)

| HTTP Code | Condition |
|-----------|-----------|
| 200 | SSE stream started |
| 403 | Curriculum not yet finalized |
| 404 | Chapter not found |

---

### `POST /api/agents/planner`

Triggers the Planner Agent as a background task. Returns `202 Accepted` immediately.

**Request:**
```json
{
  "user_id":  "uuid-of-user",
  "topic_id": "uuid-of-topic"
}
```

**Response (202):**
```json
{
  "status": "started",
  "message": "Planner agent started in the background."
}
```

| HTTP Code | Condition |
|-----------|-----------|
| 202 | Background task started |
| 403 | Curriculum not finalized |
| 404 | Topic not found |

Poll `GET /api/dashboard/workflow-status/{topic_id}` to track progress.

---

### `GET /api/agents/chat-history`

Retrieve the full chat history for a topic, optionally filtered by agent type or chapter.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `topic_id` | `UUID string` | ✅ | Topic to retrieve history for |
| `agent_type` | `curriculum \| planner \| teacher` | ❌ | Filter by agent |
| `chapter_id` | `UUID string` | ❌ | Filter to chapter (teacher chats only) |

**Response (200):**
```json
[
  {
    "id":         "uuid-of-message",
    "role":       "assistant",
    "text":       "Let me start by asking...",
    "status":     "completed",
    "chapter_id": null
  }
]
```

Messages are returned in chronological order (`created_at ASC`).

---

### `GET /api/agents/reconnect/{message_id}`

Reconnect to an in-progress or recently completed SSE stream.

**Path Parameter:** `message_id` — the `AgentChat.id` returned in the `init` event.

**Behavior:**

1. If the stream is already done → returns empty stream immediately
2. If still in progress → replays buffered events then subscribes to live events
3. If message not found → `404`

This is used by the frontend to handle page refreshes or network interruptions during generation.

---

## Error Handling

Errors during agent execution are sent as a data event before the stream closes:

```
data: {"error": "OpenAI rate limit exceeded"}\n\n
```

The `AgentChat` row's `status` is set to `"failed"` and the error is stored for debugging.
