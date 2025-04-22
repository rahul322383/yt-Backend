// middleware/adminMiddleware.js
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';


const admin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authorization token missing",
        success: false,
      });
    }

    const token = authHeader.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        message:
          err.name === "TokenExpiredError"
            ? "Token expired"
            : "Invalid token",
        success: false,
      });
    }

    const user = await User.findById(decoded.id);

    if (!user) {
      return res
        .status(401)
        .json({ message: "User not found", success: false });
    }

    if (user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Access denied. Admins only.", success: false });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("Admin middleware error:", err);
    res.status(500).json({ message: "Internal server error", success: false });
  }
};

export default admin;