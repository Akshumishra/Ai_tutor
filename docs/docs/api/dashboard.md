# Dashboard API

Base path: `/api/dashboard`  
**File:** `backend/src/backend/api/dashboard.py`

The Dashboard API manages topics (courses), chapters, workflow status, and learning time tracking.

---

## Topic Management

### `POST /api/dashboard/topics/create`

Creates a blank topic row before starting the curriculum agent. This ensures every agent call has a real DB-backed `topic_id`.

**Request:**
```json
{"user_id": "uuid-of-user"}
```

**Response (200):**
```json
{"topic_id": "uuid-of-new-topic"}
```

!!! tip "Call This First"
    Always call this endpoint before starting a new curriculum session. Pass the returned `topic_id` to all subsequent agent and dashboard calls.

---

### `DELETE /api/dashboard/topics/{topic_id}`

Soft-deletes a topic (sets `deleted_at` timestamp). The topic and all its chapters remain in the database.

**Response:** `{"message": "Topic deleted successfully"}`

| Code | Condition |
|------|-----------|
| 200 | Success |
| 400 | Invalid UUID |
| 404 | Topic not found |

---

### `POST /api/dashboard/topics/{topic_id}/time`

Updates the cumulative learning time for a topic. Called by the frontend periodically while the learner is in a teaching session.

**Request:**
```json
{"delta_seconds": 60}
```

**Response:**
```json
{"learning_time_seconds": 3600}
```

---

## Course Listing

### `GET /api/dashboard/courses`

Returns all courses (topics) for a user with progress metrics.

**Query Parameters:** `user_id=<UUID>`

**Response (200):**
```json
[
  {
    "id":                    "uuid",
    "title":                 "Python for Data Science",
    "status":                "in_progress",
    "progress":              45,
    "chapter_count":         8,
    "completed_count":       3,
    "learning_time_seconds": 7200
  }
]
```

**Status values:**

| Value | Condition |
|-------|-----------|
| `"pending"` | No chapters yet |
| `"in_progress"` | Some chapters completed |
| `"completed"` | All chapters completed (progress = 100%) |

Only returns topics where `deleted_at IS NULL`.

---

## Curriculum & Chapter Data

### `GET /api/dashboard/curriculum/{topic_id}`

Returns the curriculum structure (chapters + topics list) for display.

**Response:**
```json
[
  {
    "module": "Introduction to Python",
    "topics": [
      "What is Python",
      "Setting up the environment",
      "Your first Python program"
    ]
  }
]
```

Each item in `topics` is a cleaned line from the chapter's `outline` field.

---

### `GET /api/dashboard/chapters/{topic_id}`

Returns detailed chapter data including chapter plan status.

**Response:**
```json
[
  {
    "id":               "uuid",
    "title":            "Introduction to Python",
    "sequence":         1,
    "status":           "completed",
    "outline":          "- What is Python\n- Setting up...",
    "content_completed": true,
    "is_planned":        true,
    "plans": [
      {
        "id":       "uuid",
        "title":    "What is Python",
        "sequence": 1,
        "status":   "completed"
      }
    ]
  }
]
```

| Field | Description |
|-------|-------------|
| `status` | Chapter-level teaching completion |
| `content_completed` | `true` if all ChapterPlan items are completed |
| `is_planned` | `true` if Planner has generated content for this chapter |
| `plans` | Ordered list of ChapterPlan items with their statuses |

---

## Workflow Status

### `GET /api/dashboard/workflow-status/{topic_id}`

Returns the status of each pipeline stage.

**Response:**
```json
{
  "curriculum": "completed",
  "planning":   "completed",
  "teaching":   "in_progress"
}
```

The frontend polls this endpoint to:
- Show "Planning..." spinner while Planner runs
- Unlock the Teaching view when planning is complete
- Display overall progress

---

## Chapter Sync & Finalize

### `POST /api/dashboard/curriculum/{topic_id}/sync-chapters`

Saves chapters parsed from the frontend curriculum canvas to the database. Called before finalizing so the Planner always has chapters to work with. Chapters are **upserted by sequence number**.

**Request:**
```json
{
  "chapters": [
    {
      "module": "Introduction to Python",
      "topics": ["What is Python", "Setting up the environment"]
    }
  ]
}
```

**Response:**
```json
{"status": "success", "chapters_saved": 5}
```

---

### `POST /api/dashboard/curriculum/{topic_id}/finalize`

Marks the curriculum as complete, enabling the Planner and Teacher stages.

- Sets `Topic.status = "completed"`
- Creates/updates `WorkflowStatus` for the `curriculum` stage to `"completed"`

**Response:** `{"status": "success"}`

| Code | Condition |
|------|-----------|
| 200 | Finalized |
| 400 | Invalid UUID |
| 404 | Topic not found |
