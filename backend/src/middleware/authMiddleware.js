const jwt = require("jsonwebtoken");

const auth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Access denied! No token provided"
            });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // Normalize claims for backward and forward compatibility
        req.user = {
            ...decoded,
            userId: decoded.userId || decoded.user,
            user: decoded.userId || decoded.user
        };

        next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                code: "TOKEN_EXPIRED",
                message: "Token has expired. Please refresh your session."
            });
        }

        return res.status(401).json({
            success: false,
            code: "INVALID_TOKEN",
            message: "Invalid or expired token"
        });
    }
};

module.exports = auth;