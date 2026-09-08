/**
 * lifecycleService.js — Centralized Order & TripBlock Lifecycle State Machine
 *
 * FarmLink Module 16: Order & Trip Lifecycle
 *
 * ORDER LIFECYCLE:
 *   RECEIVED → GROUPED → CLAIMED → COMPLETED
 *   (Abort/Exception: RECEIVED → CANCELLED, GROUPED → CANCELLED, CLAIMED → CANCELLED)
 *
 * TRIPBLOCK LIFECYCLE:
 *   CREATED → CLAIMED → COMPLETED
 *   (Abort/Exception: CREATED → CANCELLED, CLAIMED → CANCELLED)
 */

const mongoose = require("mongoose");

// Canonical Order Statuses
const ORDER_STATUS = Object.freeze({
    RECEIVED: "RECEIVED",
    GROUPED: "GROUPED",
    CLAIMED: "CLAIMED",
    COMPLETED: "COMPLETED",
    CANCELLED: "CANCELLED",
});

// Canonical TripBlock Statuses
const TRIP_STATUS = Object.freeze({
    CREATED: "CREATED",
    CLAIMED: "CLAIMED",
    COMPLETED: "COMPLETED",
    CANCELLED: "CANCELLED",
});

// Allowed Order Transitions
const ALLOWED_ORDER_TRANSITIONS = Object.freeze({
    [ORDER_STATUS.RECEIVED]: [ORDER_STATUS.GROUPED, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.GROUPED]: [ORDER_STATUS.CLAIMED, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.CLAIMED]: [ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.COMPLETED]: [], // Terminal
    [ORDER_STATUS.CANCELLED]: [], // Terminal
});

// Allowed TripBlock Transitions
const ALLOWED_TRIP_TRANSITIONS = Object.freeze({
    [TRIP_STATUS.CREATED]: [TRIP_STATUS.CLAIMED, TRIP_STATUS.CANCELLED],
    [TRIP_STATUS.CLAIMED]: [TRIP_STATUS.COMPLETED, TRIP_STATUS.CANCELLED],
    [TRIP_STATUS.COMPLETED]: [], // Terminal
    [TRIP_STATUS.CANCELLED]: [], // Terminal
});

class InvalidStateTransitionError extends Error {
    constructor(entityType, currentStatus, targetStatus, allowed = []) {
        const allowedStr = allowed.length > 0 ? allowed.join(", ") : "none (terminal state)";
        super(
            `Invalid ${entityType} transition: Cannot transition from '${currentStatus}' to '${targetStatus}'. Allowed next state(s): [${allowedStr}].`
        );
        this.name = "InvalidStateTransitionError";
        this.statusCode = 400;
        this.entityType = entityType;
        this.currentStatus = currentStatus;
        this.targetStatus = targetStatus;
        this.allowedTransitions = allowed;
    }
}

/**
 * Normalizes legacy mixed-case / deprecated statuses to canonical uppercase
 */
const normalizeOrderStatus = (status) => {
    if (!status) return ORDER_STATUS.RECEIVED;
    const s = String(status).trim();
    if (s.toUpperCase() === "RECEIVED" || s === "Pending") return ORDER_STATUS.RECEIVED;
    if (s.toUpperCase() === "GROUPED" || s === "Grouped") return ORDER_STATUS.GROUPED;
    if (s.toUpperCase() === "CLAIMED" || s === "Accepted" || s === "Out for Delivery") return ORDER_STATUS.CLAIMED;
    if (s.toUpperCase() === "COMPLETED" || s === "Completed") return ORDER_STATUS.COMPLETED;
    if (s.toUpperCase() === "CANCELLED" || s === "Cancelled") return ORDER_STATUS.CANCELLED;
    return s.toUpperCase();
};

const normalizeTripStatus = (status) => {
    if (!status) return TRIP_STATUS.CREATED;
    const s = String(status).trim();
    if (s.toUpperCase() === "CREATED" || s.toUpperCase() === "OPEN" || s === "Pending") return TRIP_STATUS.CREATED;
    if (s.toUpperCase() === "CLAIMED" || s.toUpperCase() === "OUT_FOR_DELIVERY") return TRIP_STATUS.CLAIMED;
    if (s.toUpperCase() === "COMPLETED") return TRIP_STATUS.COMPLETED;
    if (s.toUpperCase() === "CANCELLED") return TRIP_STATUS.CANCELLED;
    return s.toUpperCase();
};

/**
 * Validates Order status transition
 * @returns {boolean} true if valid, otherwise throws InvalidStateTransitionError
 */
const validateOrderTransition = (currentStatus, targetStatus) => {
    const current = normalizeOrderStatus(currentStatus);
    const target = normalizeOrderStatus(targetStatus);

    // Terminal states cannot undergo any transitions
    if (current === ORDER_STATUS.COMPLETED || current === ORDER_STATUS.CANCELLED) {
        throw new InvalidStateTransitionError("Order", current, target, []);
    }

    if (current === target) {
        return true; // Non-terminal idempotent check
    }

    const allowed = ALLOWED_ORDER_TRANSITIONS[current] || [];
    if (!allowed.includes(target)) {
        throw new InvalidStateTransitionError("Order", current, target, allowed);
    }
    return true;
};

/**
 * Validates TripBlock status transition
 * @returns {boolean} true if valid, otherwise throws InvalidStateTransitionError
 */
const validateTripTransition = (currentStatus, targetStatus) => {
    const current = normalizeTripStatus(currentStatus);
    const target = normalizeTripStatus(targetStatus);

    // Terminal states cannot undergo any transitions
    if (current === TRIP_STATUS.COMPLETED || current === TRIP_STATUS.CANCELLED) {
        throw new InvalidStateTransitionError("TripBlock", current, target, []);
    }

    if (current === target) {
        return true; // Non-terminal idempotent check
    }

    const allowed = ALLOWED_TRIP_TRANSITIONS[current] || [];
    if (!allowed.includes(target)) {
        throw new InvalidStateTransitionError("TripBlock", current, target, allowed);
    }
    return true;
};

/**
 * Checks whether an Order transition is valid without throwing
 */
const canTransitionOrder = (currentStatus, targetStatus) => {
    try {
        validateOrderTransition(currentStatus, targetStatus);
        return true;
    } catch {
        return false;
    }
};

/**
 * Checks whether a TripBlock transition is valid without throwing
 */
const canTransitionTrip = (currentStatus, targetStatus) => {
    try {
        validateTripTransition(currentStatus, targetStatus);
        return true;
    } catch {
        return false;
    }
};

/**
 * Transaction Helper:
 * Executes an asynchronous function within a MongoDB transaction if supported by the deployment
 * (e.g. replica sets or Mongo Atlas). Falls back seamlessly to non-transactional execution on
 * standalone MongoDB environments (common in local developer setups).
 */
const withTransaction = async (operation) => {
    let session = null;
    try {
        session = await mongoose.startSession();
        session.startTransaction();
        const result = await operation(session);
        await session.commitTransaction();
        return result;
    } catch (error) {
        if (session) {
            try {
                await session.abortTransaction();
            } catch {
                // Ignore abort errors if transaction never started
            }
        }

        // Detect if error was due to standalone MongoDB not supporting transactions
        const isReplicaSetError =
            error.message &&
            (error.message.includes("Transaction numbers are only allowed on a replica set member") ||
             error.message.includes("standalone"));

        if (isReplicaSetError) {
            // Gracefully retry without session for standalone dev MongoDB
            return await operation(null);
        }

        throw error;
    } finally {
        if (session) {
            await session.endSession();
        }
    }
};

module.exports = {
    ORDER_STATUS,
    TRIP_STATUS,
    ALLOWED_ORDER_TRANSITIONS,
    ALLOWED_TRIP_TRANSITIONS,
    InvalidStateTransitionError,
    normalizeOrderStatus,
    normalizeTripStatus,
    validateOrderTransition,
    validateTripTransition,
    canTransitionOrder,
    canTransitionTrip,
    withTransaction,
};
