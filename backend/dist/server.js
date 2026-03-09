"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Edit a board name by ID
app.patch("/boards/:id", authenticate, async (req, res) => {
    const boardId = req.params.id;
    const { name } = req.body;
    const userRole = req.user.role;
    if (!["Client", "Project Manager", "Team Lead"].includes(userRole)) {
        return res.status(403).json({ message: "Not authorized to edit boards" });
    }
    try {
        const updated = await prisma.board.update({
            where: { id: boardId },
            data: { name },
        });
        res.json({ message: "Board updated", board: updated });
    }
    catch (error) {
        console.error("Board update error:", error);
        res.status(500).json({ message: "Board update failed" });
    }
});
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
const JWT_SECRET = "supersecretkey";
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ message: "No token provided" });
    }
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch {
        return res.status(401).json({ message: "Invalid token" });
    }
};
/* ============================= */
/* TEST ROUTE */
/* ============================= */
app.get("/test", (_req, res) => {
    console.log("✅ TEST ROUTE HIT");
    res.json({ message: "Backend is working" });
});
/* ============================= */
/* ROOT */
/* ============================= */
app.get("/", (_req, res) => {
    res.json({ message: "Jira Clone Backend Running 🚀" });
});
/* ============================= */
/* REGISTER */
/* ============================= */
app.post("/users", async (req, res) => {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ message: "All fields are required" });
    }
    try {
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            return res.status(400).json({ message: "Email already registered" });
        }
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: role || "USER",
            },
        });
        res.json({
            message: "User created successfully",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    }
    catch (error) {
        console.error("User creation error:", error);
        res.status(500).json({ message: "User creation failed" });
    }
});
/* ============================= */
/* LOGIN */
/* ============================= */
app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        const valid = await bcrypt_1.default.compare(password, user.password);
        if (!valid) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "1h" });
        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                role: user.role,
            },
        });
    }
    catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Login failed" });
    }
});
/* ============================= */
/* USERS */
/* ============================= */
app.get("/users", authenticate, async (_req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, name: true, role: true },
        });
        res.json(users);
    }
    catch (error) {
        console.error("Fetch users error:", error);
        res.status(500).json({ message: "Failed to fetch users" });
    }
});
/* ============================= */
/* BOARDS */
/* ============================= */
// Delete a board by ID
app.delete("/boards/:id", authenticate, async (req, res) => {
    const boardId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const userRole = req.user.role;
    if (!["Client", "Project Manager", "Team Lead"].includes(userRole)) {
        return res.status(403).json({ message: "Not authorized to delete boards" });
    }
    try {
        // Delete related columns and tickets (cascade)
        await prisma.ticket.deleteMany({ where: { boardId: boardId } });
        await prisma.column.deleteMany({ where: { boardId: boardId } });
        const deleted = await prisma.board.delete({ where: { id: boardId } });
        res.json({ message: "Board deleted", board: deleted });
    }
    catch (error) {
        console.error("Board deletion error:", error);
        res.status(500).json({ message: "Board deletion failed" });
    }
});
// Edit a board name by ID
app.patch("/boards/:id", authenticate, async (req, res) => {
    const boardId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { name } = req.body;
    const userRole = req.user.role;
    if (!["Client", "Project Manager", "Team Lead"].includes(userRole)) {
        return res.status(403).json({ message: "Not authorized to edit boards" });
    }
    try {
        const updated = await prisma.board.update({
            where: { id: boardId },
            data: { name },
        });
        res.json({ message: "Board updated", board: updated });
    }
    catch (error) {
        console.error("Board update error:", error);
        res.status(500).json({ message: "Board update failed" });
    }
});
app.post("/boards", authenticate, async (req, res) => {
    const { name } = req.body;
    const userRole = req.user.role;
    if (!["Client", "Project Manager", "Team Lead"].includes(userRole)) {
        return res.status(403).json({ message: "Not authorized to create boards" });
    }
    try {
        const board = await prisma.board.create({
            data: {
                name,
                userId: req.user.userId,
            },
        });
        await prisma.column.createMany({
            data: [
                { name: "todo", order: 1, boardId: board.id },
                { name: "in progress", order: 2, boardId: board.id },
                { name: "completed", order: 3, boardId: board.id },
            ],
        });
        res.json(board);
    }
    catch (error) {
        console.error("Board creation error:", error);
        res.status(500).json({ message: "Board creation failed" });
    }
});
app.get("/boards", authenticate, async (req, res) => {
    try {
        const boards = await prisma.board.findMany({
            where: { userId: req.user.userId },
        });
        res.json(boards);
    }
    catch (error) {
        console.error("Fetch boards error:", error);
        res.status(500).json({ message: "Fetching boards failed" });
    }
});
/* ============================= */
/* COLUMNS */
/* ============================= */
app.get("/columns/:boardId", authenticate, async (req, res) => {
    try {
        const boardId = Array.isArray(req.params.boardId) ? req.params.boardId[0] : req.params.boardId;
        const columns = await prisma.column.findMany({
            where: { boardId: boardId },
            orderBy: { order: "asc" },
        });
        res.json(columns);
    }
    catch (error) {
        console.error("Fetch columns error:", error);
        res.status(500).json({ message: "Fetching columns failed" });
    }
});
/* ============================= */
/* TICKETS */
/* ============================= */
app.post("/tickets", authenticate, async (req, res) => {
    console.log("=== CREATE TICKET DEBUG ===");
    console.log("BODY:", req.body);
    console.log("USER:", req.user);
    const { title, description, boardId, assignedTo } = req.body;
    const userRole = req.user.role;
    const userId = req.user.userId;
    try {
        const todoColumn = await prisma.column.findFirst({
            where: { boardId, name: "todo" },
        });
        const ticketCount = await prisma.ticket.count({
            where: { boardId },
        });
        const ticket = await prisma.ticket.create({
            data: {
                ticketNo: ticketCount + 1,
                title,
                description,
                boardId,
                columnId: todoColumn.id,
                createdBy: userId,
                assignedTo,
            },
            include: {
                assignedUser: { select: { name: true, role: true } },
            },
        });
        res.status(201).json(ticket);
    }
    catch (error) {
        console.error("🔥 TICKET CREATION ERROR:", error);
        res.status(500).json({ message: "Ticket creation failed" });
    }
});
/* ============================= */
/* SERVER START */
/* ============================= */
const PORT = 4000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
