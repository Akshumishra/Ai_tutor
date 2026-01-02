from enum import Enum


class Status(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "completed"
