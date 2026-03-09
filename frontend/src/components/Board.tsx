import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

type Column = {
  id: string;
  name: string;
  order: number;
};

type User = {
  id: string;
  name: string;
  role: string;
};

type BoardData = {
  id: string;
  name: string;
};

type Ticket = {
  id: string;
  ticketNo: number;
  title: string;
  description: string;
  columnId: string;
  assignedUser?: {
    id: string;
    name: string;
    role: string;
  };
};

export default function Board() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [columns, setColumns] = useState<Column[]>([]);
  const [ticketsByColumn, setTicketsByColumn] = useState<
    Record<string, Ticket[]>
  >({});
  const [description, setDescription] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentBoardName, setCurrentBoardName] = useState("Loading...");

  /* ================= AUTH ================= */

  useEffect(() => {
    if (!token) navigate("/");

    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
  }, [token, navigate]);

  /* ================= PERMISSIONS ================= */

  const canMoveTicket = (ticket: Ticket) => {
    if (!currentUser) return false;
    if (currentUser.role === "Client" || currentUser.role === "Project Manager") return true;
    if (ticket.assignedUser && ticket.assignedUser.id === currentUser.id) return true;
    return false;
  };

  const canDeleteTicket = () => {
    if (!currentUser) return false;
    return currentUser.role === "Client" || currentUser.role === "Project Manager";
  };

  const canCreateTicket = () => {
    if (!currentUser) return false;
    return currentUser.role === "Client" || currentUser.role === "Project Manager" || currentUser.role === "Team Lead";
  };

  /* ================= FETCH DATA ================= */

  useEffect(() => {
    if (!id || !token) return;

    const fetchData = async () => {
      // Fetch specific board name
      const boardRes = await fetch(`http://localhost:4000/boards`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const allBoards: BoardData[] = await boardRes.json();
      const thisBoard = allBoards.find(b => b.id === id);
      if (thisBoard) setCurrentBoardName(thisBoard.name);

      // Fetch columns
      const columnRes = await fetch(`http://localhost:4000/columns/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const columnData = await columnRes.json();
      setColumns(columnData);

      // Fetch tickets
      const map: Record<string, Ticket[]> = {};
      for (const col of columnData) {
        const ticketRes = await fetch(`http://localhost:4000/tickets/${col.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        map[col.id] = await ticketRes.json();
      }
      setTicketsByColumn(map);

      // Fetch users
      const usersRes = await fetch("http://localhost:4000/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const usersData = await usersRes.json();
      setUsers(usersData);

      if (usersData.length > 0) {
        setAssignedTo(usersData[0].id);
      }
    };

    fetchData();
  }, [id, token]);

  /* ================= ACTIONS ================= */

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const addTicket = async () => {
    if (!description.trim() || !token || !id) return;

    const res = await fetch("http://localhost:4000/tickets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: description,
        description,
        boardId: id,
        assignedTo,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.message);
      return;
    }

    setDescription("");
    window.location.reload();
  };

  const moveTicket = async (ticketId: string, columnId: string) => {
    await fetch(`http://localhost:4000/tickets/${ticketId}/move`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ columnId }),
    });
    window.location.reload();
  };

  const deleteTicket = async (ticketId: string) => {
    await fetch(`http://localhost:4000/tickets/${ticketId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    window.location.reload();
  };

  /* ================= UI ================= */

  return (
    <div style={{
      minHeight: "100vh",
      padding: "40px",
      background: "linear-gradient(135deg, #4e73df, #1cc88a)",
      fontFamily: "'Inter', sans-serif",
    }}>
      
      {/* UPDATED HEADER SECTION */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        background: "rgba(255, 255, 255, 0.2)",
        padding: "20px 30px",
        borderRadius: "15px",
        backdropFilter: "blur(12px)",
        marginBottom: "30px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        border: "1px solid rgba(255,255,255,0.3)"
      }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
            {/* Label renamed to Ticket Board */}
            <span style={{ color: "white", fontSize: "12px", fontWeight: "900", textTransform: "uppercase", letterSpacing: "2.5px", opacity: 0.85 }}>Ticket Board</span>
            {/* Dynamic Board Name displayed underneath */}
            <h1 style={{ color: "white", margin: "4px 0 0 0", fontSize: "36px", fontWeight: 900, textShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>{currentBoardName}</h1>
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: "25px" }}>
          <div style={{ textAlign: "right", color: "white" }}>
            <p style={{ margin: 0, fontWeight: "700", fontSize: "18px" }}>{currentUser?.name}</p>
            <p style={{ margin: 0, fontSize: "12px", opacity: 0.9, textTransform: "uppercase", letterSpacing: "1px" }}>{currentUser?.role}</p>
          </div>
          <button onClick={handleLogout} style={{
            background: "#ff4b2b",
            color: "white",
            border: "none",
            padding: "12px 24px",
            borderRadius: "10px",
            cursor: "pointer",
            fontWeight: "bold",
            boxShadow: "0 4px 15px rgba(255, 75, 43, 0.3)",
            transition: "transform 0.2s"
          }}>Logout</button>
        </div>
      </div>

      {/* CREATE TICKET SECTION */}
      {canCreateTicket() && (
        <div style={{ 
          background: "white", 
          padding: "25px", 
          borderRadius: "15px", 
          display: "flex", 
          gap: "20px",
          alignItems: "center",
          boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
          marginBottom: "40px"
        }}>
          <div style={{ flex: 2 }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: "900", color: "#4e73df", marginBottom: "8px", letterSpacing: "0.5px" }}>TICKET DESCRIPTION</label>
            <input
              placeholder="Enter task details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 15px",
                borderRadius: "10px",
                border: "2px solid #edf2f7",
                fontSize: "15px",
                outline: "none",
                background: "#f8f9fc"
              }}
            />
          </div>

          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: "900", color: "#4e73df", marginBottom: "8px", letterSpacing: "0.5px" }}>ASSIGN TO</label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "10px",
                border: "2px solid #edf2f7",
                background: "#f8f9fc",
                fontSize: "15px"
              }}
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>

          <button
            onClick={addTicket}
            style={{
              background: "#4e73df",
              color: "white",
              border: "none",
              padding: "14px 30px",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: "bold",
              marginTop: "20px",
              boxShadow: "0 4px 12px rgba(78, 115, 223, 0.2)"
            }}
          >Create Ticket</button>
        </div>
      )}

      {/* KANBAN COLUMNS */}
      <div style={{ display: "flex", gap: "30px" }}>
        {columns.map((column) => (
          <div key={column.id} style={{
            flex: 1,
            background: "rgba(248, 249, 252, 0.95)",
            borderRadius: "24px",
            padding: "25px",
            minHeight: "650px",
            boxShadow: "0 15px 35px rgba(0,0,0,0.1)",
            border: "1px solid rgba(255,255,255,0.8)"
          }}>
            <h3 style={{ 
              color: "#333", 
              fontSize: "16px", 
              fontWeight: "900", 
              textTransform: "uppercase", 
              marginBottom: "25px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              letterSpacing: "1px"
            }}>
              <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#1cc88a", boxShadow: "0 0 8px rgba(28, 200, 138, 0.4)" }}></span>
              {column.name}
            </h3>

            {ticketsByColumn[column.id]?.map((ticket) => (
              <div key={ticket.id} style={{
                background: "white",
                padding: "22px",
                borderRadius: "18px",
                marginBottom: "20px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
                border: "1px solid #edf2f7",
                transition: "transform 0.2s"
              }}>
                <div style={{ color: "#4e73df", fontWeight: "bold", fontSize: "12px", marginBottom: "12px", letterSpacing: "1px" }}>T-{ticket.ticketNo}</div>
                <div style={{ fontSize: "16px", color: "#2d3748", lineHeight: "1.6", marginBottom: "18px", fontWeight: "500" }}>{ticket.description}</div>

                {ticket.assignedUser && (
                  <div style={{ 
                    fontSize: "11px", 
                    color: "#4e73df", 
                    background: "#f0f4ff", 
                    padding: "6px 12px", 
                    borderRadius: "8px", 
                    display: "inline-block",
                    fontWeight: "800",
                    marginBottom: "18px",
                    border: "1px solid #d1e3ff"
                  }}>
                    👤 {ticket.assignedUser.name} <span style={{opacity:0.6, marginLeft:'5px', fontWeight: '400'}}>{ticket.assignedUser.role}</span>
                  </div>
                )}

                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                  {canMoveTicket(ticket) && columns.filter((c) => c.id !== column.id).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => moveTicket(ticket.id, c.id)}
                      style={{ 
                        fontSize: "10px", 
                        padding: "8px 14px", 
                        borderRadius: "10px", 
                        border: "2.0px solid #4e73df", 
                        background: "transparent", 
                        color: "#4e73df", 
                        cursor: "pointer", 
                        fontWeight: "900",
                        textTransform: "uppercase",
                        transition: "all 0.2s"
                      }}
                    >Move to {c.name}</button>
                  ))}

                  {canDeleteTicket() && (
                    <button
                      onClick={() => deleteTicket(ticket.id)}
                      style={{
                        padding: "8px 14px",
                        background: "#fff5f5",
                        color: "#e53935",
                        border: "2.0px solid #fed7d7",
                        fontSize: "10px",
                        borderRadius: "10px",
                        cursor: "pointer",
                        fontWeight: "900",
                        textTransform: "uppercase"
                      }}
                    >Delete</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}