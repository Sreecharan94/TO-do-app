import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Plus, 
  Trash2, 
  LogOut, 
  User as UserIcon, 
  ChevronRight,
  ClipboardList
} from "lucide-react";

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
  const [ticketsByColumn, setTicketsByColumn] = useState<Record<string, Ticket[]>>({});
  const [description, setDescription] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    if (!token) navigate("/");
    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) setCurrentUser(JSON.parse(storedUser));
  }, [token, navigate]);

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

  useEffect(() => {
    if (!id || !token) return;
    const fetchData = async () => {
      const columnRes = await fetch(`http://localhost:4000/columns/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      const columnData = await columnRes.json();
      setColumns(columnData);

      const map: Record<string, Ticket[]> = {};
      for (const col of columnData) {
        const ticketRes = await fetch(`http://localhost:4000/tickets/${col.id}`, { headers: { Authorization: `Bearer ${token}` } });
        map[col.id] = await ticketRes.json();
      }
      setTicketsByColumn(map);

      const usersRes = await fetch("http://localhost:4000/users", { headers: { Authorization: `Bearer ${token}` } });
      const usersData = await usersRes.json();
      setUsers(usersData);
    };
    fetchData();
  }, [id, token]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const addTicket = async () => {
    if (!description.trim() || !assignedTo || !token || !id) {
        alert("Please provide a description and select an assignee.");
        return;
    }
    const res = await fetch("http://localhost:4000/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: description, description, boardId: id, assignedTo }),
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.message);
      return;
    }
    setDescription("");
    setAssignedTo("");
    window.location.reload();
  };

  const moveTicket = async (ticketId: string, columnId: string) => {
    await fetch(`http://localhost:4000/tickets/${ticketId}/move`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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

  const getColColor = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("todo")) return "#4e73df";
    if (n.includes("progress")) return "#f6ad55";
    if (n.includes("complete")) return "#48bb78";
    return "#cbd5e0";
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #2d3748 0%, #4a5568 100%)",
      fontFamily: "'Inter', sans-serif",
      display: "flex",
      flexDirection: "column"
    }}>
      
      {/* TOPBAR */}
      <div style={{
        padding: "15px 40px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "rgba(0, 0, 0, 0.15)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.05)"
      }}>
        <div onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: "rgba(255,255,255,0.1)", padding: "8px", borderRadius: "8px" }}>
            <ClipboardList size={20} color="white" />
          </div>
          <div>
            <h2 style={{ color: "white", fontSize: "22px", fontWeight: "800", margin: 0 }}>
              Tickets
            </h2>
            {/* UPDATED: Subtitle changed to static 'WORK TO DO' */}
            <p style={{ color: "#63b3ed", fontSize: "10px", fontWeight: "900", textTransform: "uppercase", letterSpacing: "1.5px", margin: 0 }}>
              WORK TO DO
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "25px" }}>
          <div style={{ textAlign: "right", color: "white" }}>
            <p style={{ margin: 0, fontWeight: "700", fontSize: "15px" }}>{currentUser?.name}</p>
            <p style={{ 
              margin: 0, 
              fontSize: "10px", 
              fontWeight: "800",
              color: currentUser?.role === "Client" ? "#f6ad55" : "#63b3ed" 
            }}>
              {currentUser?.role}
            </p>
          </div>
          <button onClick={handleLogout} style={{
            background: "#e53e3e",
            color: "white",
            border: "none",
            padding: "0 16px",
            height: "36px",
            borderRadius: "8px",
            fontWeight: "700",
            fontSize: "11px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}>
              <LogOut size={14} />
              LOGOUT
          </button>
        </div>
      </div>

      <div style={{ padding: "30px 40px", flex: 1 }}>
        {/* CREATE TICKET SECTION */}
        {canCreateTicket() && (
          <div style={{ 
            background: "rgba(255, 255, 255, 0.05)", 
            padding: "15px", 
            borderRadius: "12px", 
            display: "flex", 
            gap: "12px",
            alignItems: "flex-end",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            marginBottom: "35px"
          }}>
            <div style={{ flex: 2 }}>
              <label style={{ display: "block", fontSize: "9px", fontWeight: "800", color: "#63b3ed", marginBottom: "5px", textTransform: "uppercase" }}>Quick Task Description</label>
              <input
                placeholder="What needs to be done?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 15px",
                  borderRadius: "8px",
                  border: "none",
                  fontSize: "13px",
                  outline: "none",
                  background: "white",
                  height: "36px"
                }}
              />
            </div>

            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: "9px", fontWeight: "800", color: "#63b3ed", marginBottom: "5px", textTransform: "uppercase" }}>Assignee</label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0 10px",
                  borderRadius: "8px",
                  border: "none",
                  background: "white",
                  fontSize: "13px",
                  fontWeight: "600",
                  height: "36px"
                }}
              >
                <option value="" disabled>Select Assignee</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                ))}
              </select>
            </div>

            <button
              onClick={addTicket}
              style={{
                background: "#48bb78",
                color: "white",
                border: "none",
                padding: "0 20px",
                height: "36px",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "700",
                fontSize: "11px",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <Plus size={16} />
              ADD TICKET
            </button>
          </div>
        )}

        {/* COLUMNS */}
        <div style={{ display: "flex", gap: "25px", overflowX: "auto" }}>
          {columns.map((column) => (
            <div key={column.id} style={{
              flex: 1,
              minWidth: "300px",
              background: "#ebedf0",
              borderRadius: "16px",
              padding: "15px",
              minHeight: "75vh",
              boxShadow: "inset 0 2px 4px rgba(0,0,0,0.05)"
            }}>
              <h3 style={{ 
                color: "#2d3748", 
                fontSize: "12px", 
                fontWeight: "800", 
                textTransform: "uppercase", 
                marginBottom: "15px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}>
                {column.name}
                <span style={{ fontSize: "10px", opacity: 0.5 }}>{ticketsByColumn[column.id]?.length || 0}</span>
              </h3>

              {ticketsByColumn[column.id]?.map((ticket) => (
                <div key={ticket.id} style={{
                  background: "white",
                  padding: "15px",
                  borderRadius: "10px",
                  marginBottom: "12px",
                  boxShadow: "0 2px 5px rgba(0,0,0,0.08)",
                  borderLeft: `4px solid ${getColColor(column.name)}`
                }}>
                  <div style={{ color: "#718096", fontWeight: "800", fontSize: "10px", marginBottom: "6px" }}>T-{ticket.ticketNo}</div>
                  <div style={{ fontSize: "13px", color: "#1a202c", lineHeight: "1.5", marginBottom: "12px", fontWeight: "600" }}>{ticket.description}</div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {ticket.assignedUser && (
                        <div style={{ 
                        fontSize: "9px", 
                        color: "#4e73df", 
                        background: "#f0f4ff", 
                        padding: "3px 8px", 
                        borderRadius: "5px", 
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontWeight: "700"
                        }}>
                        <UserIcon size={10} /> {ticket.assignedUser.name}
                        </div>
                    )}
                    
                    {canDeleteTicket() && (
                      <button
                        onClick={() => deleteTicket(ticket.id)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#e53e3e",
                          cursor: "pointer",
                          padding: "4px",
                          height: "24px",
                          width: "24px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          opacity: 0.6
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>

                  {canMoveTicket(ticket) && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginTop: "12px", borderTop: "1px solid #f1f5f9", paddingTop: "10px" }}>
                        {columns.filter((c) => c.id !== column.id).map((c) => (
                        <button
                            key={c.id}
                            onClick={() => moveTicket(ticket.id, c.id)}
                            style={{ 
                            fontSize: "8px", 
                            padding: "0 8px", 
                            height: "26px",
                            borderRadius: "4px", 
                            border: "1px solid #e2e8f0", 
                            background: "white", 
                            color: "#4a5568", 
                            cursor: "pointer", 
                            fontWeight: "700",
                            textTransform: "uppercase",
                            display: "flex",
                            alignItems: "center",
                            gap: "3px"
                            }}
                        >
                            {c.name} <ChevronRight size={8} />
                        </button>
                        ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}