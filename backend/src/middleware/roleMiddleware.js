const auth=require("./authMiddleware")

const authorize = (roles) => {
    const allowed = Array.isArray(roles) ? roles : [roles];
    return (req, res, next) => {
        if (!req.user || !allowed.includes(req.user.role)) {
            return res.status(403).json({
                message: "Access denied"
            });
        }
        next();
    };
};

module.exports=authorize;