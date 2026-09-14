/**
 * Schema-based Request Validation Middleware
 * Validates request body, query parameters, and route parameters.
 */

const isValidObjectId = (id) => {
    return typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);
};

const isValidEmail = (email) => {
    return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/**
 * Validates target (body, query, or params) against a field definition schema.
 */
function validateFields(data, rules = {}) {
    const errors = [];

    for (const [field, rule] of Object.entries(rules)) {
        const val = data ? data[field] : undefined;

        // Check required
        if (rule.required && (val === undefined || val === null || val === "")) {
            errors.push({ field, message: rule.message || `${field} is required` });
            continue;
        }

        // If field is missing and not required, skip further checks
        if (val === undefined || val === null || val === "") {
            continue;
        }

        // Type check
        if (rule.type) {
            if (rule.type === "array") {
                if (!Array.isArray(val)) {
                    errors.push({ field, message: `${field} must be an array` });
                }
            } else if (typeof val !== rule.type) {
                errors.push({ field, message: `${field} must be a ${rule.type}` });
            }
        }

        // ObjectId check
        if (rule.isObjectId && !isValidObjectId(val)) {
            errors.push({ field, message: `${field} must be a valid 24-character hexadecimal ObjectId` });
        }

        // Email check
        if (rule.isEmail && !isValidEmail(val)) {
            errors.push({ field, message: `${field} must be a valid email address` });
        }

        // Min length
        if (rule.minLength && typeof val === "string" && val.length < rule.minLength) {
            errors.push({ field, message: `${field} must be at least ${rule.minLength} characters long` });
        }

        // Max length
        if (rule.maxLength && typeof val === "string" && val.length > rule.maxLength) {
            errors.push({ field, message: `${field} must be at most ${rule.maxLength} characters long` });
        }

        // Enum check
        if (rule.enum && Array.isArray(rule.enum) && !rule.enum.includes(val)) {
            errors.push({ field, message: `${field} must be one of: ${rule.enum.join(", ")}` });
        }

        // Custom validator
        if (typeof rule.custom === "function") {
            const customResult = rule.custom(val, data);
            if (customResult !== true) {
                errors.push({ field, message: typeof customResult === "string" ? customResult : `Invalid ${field}` });
            }
        }
    }

    return errors;
}

/**
 * Middleware factory for request validation.
 * @param {Object} schema - { body?: {}, query?: {}, params?: {} }
 */
const validate = (schema) => {
    return (req, res, next) => {
        const allErrors = [];

        if (schema.body) {
            allErrors.push(...validateFields(req.body || {}, schema.body));
        }

        if (schema.query) {
            allErrors.push(...validateFields(req.query || {}, schema.query));
        }

        if (schema.params) {
            allErrors.push(...validateFields(req.params || {}, schema.params));
        }

        if (allErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: allErrors[0].message,
                errors: allErrors
            });
        }

        next();
    };
};

/**
 * Pre-built validator for route params containing Mongo ObjectIds
 */
const validateObjectIdParam = (paramName = "id") => {
    return validate({
        params: {
            [paramName]: {
                required: true,
                isObjectId: true,
                message: `Parameter :${paramName} must be a valid MongoDB ObjectId`
            }
        }
    });
};

module.exports = {
    validate,
    validateObjectIdParam,
    isValidObjectId,
    isValidEmail
};
