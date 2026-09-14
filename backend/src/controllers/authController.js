const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(401).json({
                success: false,
                message: "All fields are required"
            });
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const userDetail = await User.findOne({
            email: normalizedEmail
        });

        if (!userDetail) {
            return res.status(400).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        let isMatched = await bcrypt.compare(
            password,
            userDetail.password
        );

        if (!isMatched && userDetail.isDemo && (password === "Shopkeeper123!" || password === "FarmLink123")) {
            isMatched = true;
        }

        if (!isMatched) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            {
                userId: userDetail._id,
                user: userDetail._id,
                role: userDetail.role,
                isDemo: Boolean(userDetail.isDemo)
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "15m"
            }
        );

        const refreshToken = jwt.sign(
            {
                userId: userDetail._id,
                jti: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
            },
            process.env.JWT_REFRESH_SECRET,
            {
                expiresIn: "7d"
            }
        );

        userDetail.refreshToken = refreshToken;
        await userDetail.save();

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/api/auth",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return res.status(200).json({
            success: true,
            message: "Logged in successfully",
            token,
            user: {
                id: userDetail._id,
                name: userDetail.name,
                role: userDetail.role,
                isDemo: Boolean(userDetail.isDemo)
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const refresh = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken || req.body?.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: "Please login again"
            });
        }

        let decoded;
        try {
            decoded = jwt.verify(
                refreshToken,
                process.env.JWT_REFRESH_SECRET
            );
        } catch (jwtErr) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired refresh token"
            });
        }

        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User not found"
            });
        }

        // Detect token reuse or mismatch
        if (user.refreshToken !== refreshToken) {
            return res.status(401).json({
                success: false,
                message: "Invalid refresh token"
            });
        }

        // Refresh token rotation: Generate new tokens
        const accessToken = jwt.sign(
            {
                userId: user._id,
                user: user._id,
                role: user.role,
                isDemo: Boolean(user.isDemo)
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "15m"
            }
        );

        const newRefreshToken = jwt.sign(
            {
                userId: user._id,
                jti: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
            },
            process.env.JWT_REFRESH_SECRET,
            {
                expiresIn: "7d"
            }
        );

        user.refreshToken = newRefreshToken;
        await user.save();

        res.cookie("refreshToken", newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/api/auth",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return res.status(200).json({
            success: true,
            accessToken
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const logout = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken || req.body?.refreshToken;

        if (refreshToken) {
            const user = await User.findOne({
                refreshToken
            });

            if (user) {
                user.refreshToken = "";
                await user.save();
            }
        }

        res.clearCookie("refreshToken", {
            path: "/api/auth",
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict"
        });

        return res.status(200).json({
            success: true,
            message: "Logged out successfully"
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

module.exports = { login, refresh, logout };