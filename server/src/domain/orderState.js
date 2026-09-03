// Centralized Order State Machine & Lifecycle Transition Rules

const ORDER_STATUSES = {
  PLACED: 'PLACED',
  ACCEPTED: 'ACCEPTED',
  PREPARING: 'PREPARING',
  READY: 'READY',
  SERVED: 'SERVED',
  CANCELLED: 'CANCELLED',
};

// Explicit transition rules matrix
const TRANSITIONS = {
  [ORDER_STATUSES.PLACED]: [ORDER_STATUSES.ACCEPTED, ORDER_STATUSES.CANCELLED],
  [ORDER_STATUSES.ACCEPTED]: [ORDER_STATUSES.PREPARING, ORDER_STATUSES.CANCELLED],
  [ORDER_STATUSES.PREPARING]: [ORDER_STATUSES.READY],
  [ORDER_STATUSES.READY]: [ORDER_STATUSES.SERVED],
  [ORDER_STATUSES.SERVED]: [],
  [ORDER_STATUSES.CANCELLED]: [],
};

/**
 * Validates whether moving from currentStatus to nextStatus is allowed.
 */
function canTransition(currentStatus, nextStatus) {
  const allowed = TRANSITIONS[currentStatus] || [];
  return allowed.includes(nextStatus);
}

/**
 * Returns an array of allowed next statuses for a given current status.
 */
function getAllowedTransitions(currentStatus) {
  return TRANSITIONS[currentStatus] || [];
}

module.exports = {
  ORDER_STATUSES,
  TRANSITIONS,
  canTransition,
  getAllowedTransitions,
};
