import { Request, Response, NextFunction } from "express";
import { auth } from "@/config/firebase";

export interface AuthenticatedRequest extends Request {
    user?: {
        uid: string;
        email?: string | undefined;
        name?: string | undefined;
        picture?: string | undefined;
    };
}

export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

        if (!token) {
            res.status(401).json({ error: "Access token required" });
            return;
        }

        // Verify the token with Firebase
        const decodedToken = await auth.verifyIdToken(token);

        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email || undefined,
            name: decodedToken["name"] || undefined,
            picture: decodedToken.picture || undefined,
        };

        next();
    } catch (error) {
        console.error("Error verifying token:", error);
        res.status(403).json({ error: "Invalid or expired token" });
        return;
    }
};

export const optionalAuth = async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(" ")[1];

        if (token) {
            const decodedToken = await auth.verifyIdToken(token);
            req.user = {
                uid: decodedToken.uid,
                email: decodedToken.email || undefined,
                name: decodedToken["name"] || undefined,
                picture: decodedToken.picture || undefined,
            };
        }

        next();
    } catch (error) {
        // If token is invalid, continue without user
        next();
    }
};
