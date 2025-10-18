import { Router, Request, Response } from "express";
import { auth } from "@/config/firebase";
import { authenticateToken, AuthenticatedRequest } from "@/middleware/auth";
import prisma from "@/config/prisma";

const router = Router();

// Get current user info
router.get("/me", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = await auth.getUser(req.user!.uid);

        // Create user in database if does not exist
        const userData = {
            uid: user.uid,
            email: user.email,
            name: user.displayName,
            picture: user.photoURL,
            emailVerified: user.emailVerified,
        };

        return res.json(userData);
    } catch (error) {
        console.error("Error getting user:", error);
        return res.status(500).json({ error: "Failed to get user information" });
    }
});

// Verify token endpoint
router.post("/verify", async (req: Request, res: Response) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ error: "Token is required" });
        }

        const decodedToken = await auth.verifyIdToken(token);

        const existingUser = await prisma.user.findUnique({
            where: {
                uid: decodedToken.uid,
            },
        });

        if (!existingUser) {
            try {
                await prisma.user.create({
                    data: {
                        uid: decodedToken.uid,
                        email: decodedToken.email!,
                        name: decodedToken["name"],
                        picture: decodedToken.picture!,
                        emailVerified: decodedToken["email_verified"] || false,
                    },
                });
            } catch (error) {
                console.error("Error creating user:", error);
                return res.status(500).json({ error: "Failed to create user" });
            }
        } else {
            console.log("[Auth] User already exists");
        }

        return res.json({
            valid: true,
            uid: decodedToken.uid,
            email: decodedToken.email,
            name: decodedToken["name"],
            picture: decodedToken.picture,
            wins: existingUser?.wins || 0,
            losses: existingUser?.losses || 0,
        });
    } catch (error) {
        console.error("Error verifying token:", error);
        return res.status(401).json({ error: "Invalid token" });
    }
});

export default router;
