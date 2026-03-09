import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const app = express();

/* 🔥 ENABLED PRISMA LOGGING */
const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"],
});

const JWT_SECRET = "supersecretkey";

app.use(cors());
app.use(express.json());

/* ============================= */
/* AUTH MIDDLEWARE */
/* ============================= */

interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
  };
}

const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      role: string;
    };

    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
};

/* ============================= */
/* ROOT */
/* ============================= */

app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "Jira Clone Backend Running 🚀" });
});

/* ============================= */
/* REGISTER / USER CREATION */
/* ============================= */

app.post("/users", async (req: Request, res: Response) => {
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

    const hashedPassword = await bcrypt.hash(password, 10);

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
  } catch (error) {
    console.error("User creation error:", error);
    res.status(500).json({ message: "User creation failed" });
  }
});

/* ============================= */
/* LOGIN */
/* ============================= */

app.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed" });
  }
});

/* ============================= */
/* USER MANAGEMENT (MAINTENANCE) */
/* ============================= */

// FETCH ALL USERS (INCLUDING EMAIL)
app.get("/users", authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: { 
        id: true, 
        name: true, 
        role: true, 
        email: true 
      },
      orderBy: { name: "asc" }
    });
    res.json(users);
  } catch (error) {
    console.error("Fetch users error:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// UPDATE USER (CLIENT ONLY)
app.patch("/users/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { role: currentUserRole } = req.user!;
    const { id } = req.params;
    const { role, email } = req.body;

    if (currentUserRole !== "Client") {
      return res.status(403).json({ message: "Unauthorized: Client access required" });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role, email },
    });

    res.json(updatedUser);
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ message: "Failed to update user. Email might be in use." });
  }
});

// DELETE USER (CLIENT ONLY) - WITH CASCADE LOGIC
app.delete("/users/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { userId: currentUserId, role: currentUserRole } = req.user!;
    const targetId = req.params.id;

    if (currentUserRole !== "Client") {
      return res.status(403).json({ message: "Unauthorized: Client access required" });
    }

    if (currentUserId === targetId) {
      return res.status(400).json({ message: "You cannot delete your own account" });
    }

    // 1. Unassign tickets assigned to this user
    await prisma.ticket.updateMany({
      where: { assignedTo: targetId },
      data: { assignedTo: targetId === "null" ? "null" : undefined } // Adjust based on schema nullability
    });

    // 2. Delete tickets created by this user
    await prisma.ticket.deleteMany({
      where: { createdBy: targetId }
    });

    // 3. Delete boards owned by this user
    await prisma.board.deleteMany({
      where: { userId: targetId }
    });

    // 4. Finally delete the user
    await prisma.user.delete({
      where: { id: targetId },
    });

    res.json({ message: "User removed successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ message: "Failed to delete user. Database constraint error." });
  }
});

/* ============================= */
/* BOARDS */
/* ============================= */

app.get("/boards", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { userId, role } = req.user!;
    let boards;

    if (["Client", "Project Manager", "Team Lead"].includes(role)) {
      boards = await prisma.board.findMany({
        orderBy: { id: "desc" },
      });
    } else {
      boards = await prisma.board.findMany({
        where: {
          OR: [
            { userId: userId },
            { tickets: { some: { assignedTo: userId } } }
          ]
        },
        orderBy: { id: "desc" },
      });
    }
    res.json(boards);
  } catch (error) {
    console.error("Fetch boards error:", error);
    res.status(500).json({ message: "Failed to fetch boards" });
  }
});

app.post("/boards", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const board = await prisma.board.create({
      data: {
        name: req.body.name,
        userId: req.user!.userId,
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
  } catch (error) {
    console.error("Board creation error:", error);
    res.status(500).json({ message: "Board creation failed" });
  }
});

app.patch("/boards/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { role } = req.user!;
    if (!["Client", "Project Manager", "Team Lead"].includes(role)) {
      return res.status(403).json({ message: "Not authorized to edit boards" });
    }

    const updatedBoard = await prisma.board.update({
      where: { id: req.params.id },
      data: { name: req.body.name },
    });
    
    res.json(updatedBoard);
  } catch (error) {
    console.error("Edit board error:", error);
    res.status(500).json({ message: "Failed to update board" });
  }
});

app.delete("/boards/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { role } = req.user!;
    const boardId = req.params.id;

    if (!["Client", "Project Manager", "Team Lead"].includes(role)) {
      return res.status(403).json({ message: "Not authorized to delete boards" });
    }

    await prisma.ticket.deleteMany({ where: { boardId } });
    await prisma.column.deleteMany({ where: { boardId } });
    await prisma.board.delete({ where: { id: boardId } });

    res.json({ message: "Board and all related data deleted successfully" });
  } catch (error) {
    console.error("Delete board error:", error);
    res.status(500).json({ message: "Failed to delete board" });
  }
});

/* ============================= */
/* COLUMNS */
/* ============================= */

app.get("/columns/:boardId", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const columns = await prisma.column.findMany({
      where: { boardId: req.params.boardId },
      orderBy: { order: "asc" },
    });
    res.json(columns);
  } catch (error) {
    console.error("Fetch columns error:", error);
    res.status(500).json({ message: "Failed to fetch columns" });
  }
});

/* ============================= */
/* TICKETS */
/* ============================= */

app.get("/tickets/:columnId", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const tickets = await prisma.ticket.findMany({
      where: { columnId: req.params.columnId },
      orderBy: { ticketNo: "asc" },
      include: {
        assignedUser: { select: { id: true, name: true, role: true } },
        createdUser: { select: { id: true, name: true, role: true } },
      },
    });
    res.json(tickets);
  } catch (error) {
    console.error("Fetch tickets error:", error);
    res.status(500).json({ message: "Failed to fetch tickets" });
  }
});

app.post("/tickets", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
    });

    if (!user || !["Client", "Project Manager", "Team Lead"].includes(user.role)) {
      return res.status(403).json({ message: "You are not authorized to create tickets" });
    }

    const { title, description, boardId, assignedTo } = req.body;

    const todoColumn = await prisma.column.findFirst({
      where: {
        boardId,
        name: { equals: "todo", mode: "insensitive" },
      },
    });

    if (!todoColumn) return res.status(400).json({ message: "Todo column not found" });

    const ticketCount = await prisma.ticket.count({ where: { boardId } });

    const ticket = await prisma.ticket.create({
      data: {
        ticketNo: ticketCount + 1,
        title,
        description,
        boardId,
        columnId: todoColumn.id,
        createdBy: req.user!.userId,
        assignedTo,
      },
    });

    res.status(201).json(ticket);
  } catch (error) {
    console.error("Ticket creation error:", error);
    res.status(500).json({ message: "Ticket creation failed" });
  }
});

app.patch("/tickets/:id/move", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { columnId } = req.body;

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });

    if (!ticket || !user) return res.status(404).json({ message: "Ticket or user not found" });

    const isClientOrPM = user.role === "Client" || user.role === "Project Manager";
    const isAssignedUser = ticket.assignedTo === user.id;

    if (!isClientOrPM && !isAssignedUser) {
      return res.status(403).json({ message: "Not authorized to move this ticket" });
    }

    const updated = await prisma.ticket.update({
      where: { id },
      data: { columnId },
    });

    res.json(updated);
  } catch (error) {
    console.error("Move ticket error:", error);
    res.status(500).json({ message: "Move failed" });
  }
});

app.delete("/tickets/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user || !["Client", "Project Manager"].includes(user.role)) {
      return res.status(403).json({ message: "You are not authorized to delete this ticket" });
    }

    await prisma.ticket.delete({ where: { id: req.params.id } });
    res.json({ message: "Ticket deleted successfully" });
  } catch (error) {
    console.error("Delete ticket error:", error);
    res.status(500).json({ message: "Delete failed" });
  }
});

/* ============================= */
/* SERVER START */
/* ============================= */

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});