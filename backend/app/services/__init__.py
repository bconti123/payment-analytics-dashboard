class NotFoundError(Exception):
    """Raised when a requested resource does not exist."""


class BusinessRuleError(Exception):
    """Raised when a request violates a domain rule (e.g. refund > transaction)."""


__all__ = ["BusinessRuleError", "NotFoundError"]
