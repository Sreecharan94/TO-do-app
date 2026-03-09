import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

/* ===== CHART IMPORTS ===== */
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from "chart.js";

import { Pie } from "react-chartjs-2";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend
);

/* ===== TYPES ===== */

type Board = {
  id: string;
  name: string;
};

type User = {
  id: string;
  name: string;
  role: string;
};

export default function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [boardName, setBoardName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [activeView, setActiveView] = useState("boards");

  const [selectedBoard, setSelectedBoard] = useState("");
  const [todoPercent, setTodoPercent] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [donePercent, setDonePercent] = useState(0);

  /* ===== TEAM FILTERING STATE ===== */
  const [selectedTeamBoard, setSelectedTeamBoard] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

  /* ===== CHART DATA ===== */
  const chartData = {
    labels: ["To Do", "In Progress", "Completed"],
    datasets: [
      {
        label: "Ticket Status",
        data: [todoPercent, progressPercent, donePercent],
        backgroundColor: ["#ff4b2b", "#facc15", "#1cc88a"],
        borderWidth: 0,
      }
    ]
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
      return;
    }
    fetchBoards(token);
    fetchUsers(token);
    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, [navigate]);

  const fetchBoards = async (token: string) => {
    const res = await fetch("http://localhost:4000/boards", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setBoards(data);
    }
  };

  const fetchUsers = async (token: string) => {
    const res = await fetch("http://localhost:4000/users", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setUsers(data);
    }
  };

  const isAdmin =
    user?.role === "Client" ||
    user?.role === "Project Manager" ||
    user?.role === "Team Lead";

  const createBoard = async () => {
    if (!isAdmin || !boardName.trim()) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch("http://localhost:4000/boards", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: boardName }),
    });
    if (res.ok) {
      const newBoard = await res.json();
      setBoards((prev) => [newBoard, ...prev]);
      setBoardName("");
    }
  };

  const deleteBoard = async (boardId: string) => {
    if (!isAdmin) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    await fetch(`http://localhost:4000/boards/${boardId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setBoards((prev) => prev.filter((b) => b.id !== boardId));
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    await fetch(`http://localhost:4000/boards/${editingId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: editingName }),
    });
    setBoards((prev) => prev.map((b) => b.id === editingId ? { ...b, name: editingName } : b));
    setEditingId(null);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const fetchBoardAnalytics = async (boardId: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const columnRes = await fetch(`http://localhost:4000/columns/${boardId}`, { headers: { Authorization: `Bearer ${token}` } });
    const columns = await columnRes.json();
    let todo = 0, progress = 0, done = 0;
    for (const col of columns) {
      const ticketRes = await fetch(`http://localhost:4000/tickets/${col.id}`, { headers: { Authorization: `Bearer ${token}` } });
      const tickets = await ticketRes.json();
      if (col.name.toLowerCase().includes("to")) todo += tickets.length;
      if (col.name.toLowerCase().includes("progress")) progress += tickets.length;
      if (col.name.toLowerCase().includes("complete")) done += tickets.length;
    }
    const total = todo + progress + done;
    if (total === 0) { setTodoPercent(0); setProgressPercent(0); setDonePercent(0); return; }
    setTodoPercent((todo / total) * 100); setProgressPercent((progress / total) * 100); setDonePercent((done / total) * 100);
  };

  const fetchBoardTeam = async (boardId: string) => {
    if (!boardId) { setFilteredUsers([]); return; }
    const token = localStorage.getItem("token");
    if (!token) return;
    const colRes = await fetch(`http://localhost:4000/columns/${boardId}`, { headers: { Authorization: `Bearer ${token}` } });
    const columns = await colRes.json();
    const boardUserIds = new Set();
    for (const col of columns) {
      const ticketRes = await fetch(`http://localhost:4000/tickets/${col.id}`, { headers: { Authorization: `Bearer ${token}` } });
      const tickets = await ticketRes.json();
      tickets.forEach((t: any) => { 
          if (t.userId) boardUserIds.add(t.userId.toString()); 
          if (t.assignedTo) boardUserIds.add(t.assignedTo.toString()); 
      });
    }
    setFilteredUsers(users.filter(u => boardUserIds.has(u.id.toString())));
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      background: "linear-gradient(135deg, #4e73df, #1cc88a)",
      fontFamily: "'Inter', sans-serif",
    }}>
      
      {/* SIDEBAR */}
      <div style={{
        width: "280px",
        background: "rgba(255, 255, 255, 0.15)",
        backdropFilter: "blur(25px)",
        borderRight: "1px solid rgba(255, 255, 255, 0.2)",
        display: "flex",
        flexDirection: "column",
        padding: "40px 20px",
        color: "white"
      }}>
        <h1 style={{ fontSize: "24px", fontWeight: 900, marginBottom: "50px", letterSpacing: "1.5px" }}>JIRA CLONE</h1>
        <nav style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {["boards", "analytics", "team"].map((view) => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              style={{
                textAlign: "left",
                padding: "16px 24px",
                borderRadius: "14px",
                border: "none",
                background: activeView === view ? "rgba(255, 255, 255, 0.25)" : "transparent",
                color: "white",
                fontWeight: "800",
                textTransform: "uppercase",
                letterSpacing: "1px",
                fontSize: "13px",
                cursor: "pointer",
                transition: "all 0.3s ease"
              }}
            >
              {view}
            </button>
          ))}
        </nav>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        
        {/* TOPBAR */}
        <div style={{
          padding: "20px 45px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "rgba(255, 255, 255, 0.08)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.15)"
        }}>
          <h2 style={{ color: "white", textTransform: "uppercase", fontSize: "12px", letterSpacing: "2.5px", fontWeight: "900" }}>
            Dashboard / <span style={{opacity: 0.7}}>{activeView}</span>
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: "25px" }}>
            <div style={{ textAlign: "right", color: "white" }}>
              <p style={{ margin: 0, fontWeight: "800", fontSize: "16px" }}>{user?.name}</p>
              <p style={{ margin: 0, fontSize: "11px", opacity: 0.8, fontWeight: "600" }}>{user?.role}</p>
            </div>
            <button onClick={handleLogout} style={{
              background: "#ff4b2b",
              color: "white",
              border: "none",
              padding: "12px 24px",
              borderRadius: "10px",
              fontWeight: "900",
              fontSize: "12px",
              cursor: "pointer",
              boxShadow: "0 4px 15px rgba(255, 75, 43, 0.3)"
            }}>LOGOUT</button>
          </div>
        </div>

        {/* VIEW CONTAINER */}
        <div style={{ padding: "45px", flex: 1, overflowY: "auto" }}>
          
          {/* BOARDS VIEW */}
          {activeView === "boards" && (
            <>
              {isAdmin && (
                <div style={{ 
                  background: "rgba(255, 255, 255, 0.2)", 
                  padding: "25px", 
                  borderRadius: "18px", 
                  display: "flex", 
                  gap: "15px", 
                  marginBottom: "40px",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.05)"
                }}>
                  <input
                    placeholder="Enter new board name..."
                    value={boardName}
                    onChange={(e) => setBoardName(e.target.value)}
                    style={{ flex: 1, padding: "14px 20px", borderRadius: "12px", border: "none", outline: "none", background: "white", fontSize: "15px" }}
                  />
                  <button onClick={createBoard} style={{ background: "#1cc88a", color: "white", border: "none", padding: "0 35px", borderRadius: "12px", fontWeight: "900", fontSize: "13px", cursor: "pointer", boxShadow: "0 4px 12px rgba(28, 200, 138, 0.3)" }}>
                    CREATE BOARD
                  </button>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "30px" }}>
                {boards.map((board) => (
                  <div key={board.id} style={{
                    background: "rgba(255, 255, 255, 0.98)",
                    padding: "35px",
                    borderRadius: "24px",
                    boxShadow: "0 15px 35px rgba(0,0,0,0.08)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    minHeight: "200px",
                    transition: "transform 0.2s ease"
                  }}>
                    {editingId === board.id ? (
                      <div style={{ display: "flex", gap: "10px" }}>
                        <input value={editingName} onChange={(e) => setEditingName(e.target.value)} style={{ flex: 1, border: "2px solid #edf2f7", padding: "10px", borderRadius: "8px" }} />
                        <button onClick={saveEdit} style={{ background: "#1cc88a", color: "white", border: "none", padding: "10px 20px", borderRadius: "8px", fontWeight: "bold" }}>Save</button>
                      </div>
                    ) : (
                      <>
                        <div>
                          <p style={{ fontSize: "11px", color: "#4e73df", fontWeight: "900", marginBottom: "8px", letterSpacing: "1.5px" }}>WORKSPACE</p>
                          <h3 onClick={() => navigate(`/board/${board.id}`)} style={{ margin: 0, fontSize: "24px", cursor: "pointer", color: "#2d3748", fontWeight: 900 }}>{board.name}</h3>
                        </div>
                        {isAdmin && (
                          <div style={{ display: "flex", gap: "20px", borderTop: "1.5px solid #f7fafc", paddingTop: "20px" }}>
                            <button onClick={() => { setEditingId(board.id); setEditingName(board.name); }} style={{ background: "transparent", color: "#4e73df", border: "none", fontWeight: "800", fontSize: "12px", cursor: "pointer", textTransform: "uppercase" }}>Edit</button>
                            <button onClick={() => deleteBoard(board.id)} style={{ background: "transparent", color: "#ff4b2b", border: "none", fontWeight: "800", fontSize: "12px", cursor: "pointer", textTransform: "uppercase" }}>Delete</button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ANALYTICS VIEW */}
          {activeView === "analytics" && (
            <div style={{ background: "rgba(255,255,255,0.95)", padding: "50px", borderRadius: "30px", maxWidth: "900px", margin: "0 auto", textAlign: "center", boxShadow: "0 20px 50px rgba(0,0,0,0.15)" }}>
              <h2 style={{ marginBottom: "35px", color: "#1a202c", fontWeight: 900, fontSize: "28px" }}>Performance Analytics</h2>
              <select
                value={selectedBoard}
                onChange={(e) => { setSelectedBoard(e.target.value); fetchBoardAnalytics(e.target.value); }}
                style={{ padding: "16px 24px", borderRadius: "14px", width: "350px", marginBottom: "45px", border: "2px solid #edf2f7", outline: "none", fontSize: "15px", fontWeight: "600", color: "#4a5568" }}
              >
                <option value="">Select a board to track...</option>
                {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <div style={{ maxWidth: "450px", margin: "0 auto" }}>
                <Pie data={chartData} options={{ plugins: { legend: { position: 'bottom', labels: { padding: 25, font: { weight: 'bold' } } } } }} />
              </div>
            </div>
          )}

          {/* TEAM VIEW (EMAILS REMOVED) */}
          {activeView === "team" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end" }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ color: "white", fontSize: "12px", fontWeight: "900", textTransform: "uppercase", letterSpacing: "3px", opacity: 0.8 }}>Resource Directory</span>
                    <h2 style={{ color: "white", margin: "5px 0 0 0", fontWeight: 900, fontSize: "36px", textShadow: "0 4px 10px rgba(0,0,0,0.1)" }}>Team Members</h2>
                </div>
                <select
                  value={selectedTeamBoard}
                  onChange={(e) => { setSelectedTeamBoard(e.target.value); fetchBoardTeam(e.target.value); }}
                  style={{ padding: "14px 24px", borderRadius: "14px", background: "white", border: "none", width: "300px", fontWeight: "700", fontSize: "14px", boxShadow: "0 8px 20px rgba(0,0,0,0.12)", color: "#4e73df" }}
                >
                  <option value="">Full Directory View</option>
                  {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "35px" }}>
                {(selectedTeamBoard ? filteredUsers : users).map((member) => (
                  <div key={member.id} style={{
                    background: "rgba(255, 255, 255, 1)",
                    padding: "45px 30px",
                    borderRadius: "28px",
                    textAlign: "center",
                    position: "relative",
                    overflow: "hidden",
                    boxShadow: "0 15px 35px rgba(0,0,0,0.06)",
                    transition: "transform 0.3s ease"
                  }}>
                    {/* Visual accent bar */}
                    <div style={{ height: "8px", background: "#4e73df", position: "absolute", top: 0, left: 0, right: 0 }}></div>
                    
                    {/* Avatar Initial */}
                    <div style={{ 
                        width: "90px", 
                        height: "90px", 
                        background: "#f0f7ff", 
                        color: "#4e73df", 
                        borderRadius: "50%", 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "center", 
                        margin: "0 auto 25px", 
                        fontSize: "32px", 
                        fontWeight: "900", 
                        border: "5px solid white", 
                        boxShadow: "0 5px 15px rgba(0,0,0,0.08)" 
                    }}>
                      {member.name.charAt(0).toUpperCase()}
                    </div>

                    <h3 style={{ margin: "0 0 8px 0", color: "#1a202c", fontSize: "22px", fontWeight: "900", letterSpacing: "-0.5px" }}>{member.name}</h3>
                    
                    <div style={{ display: "inline-block", background: "#eef4ff", padding: "6px 16px", borderRadius: "12px" }}>
                        <span style={{ fontSize: "11px", color: "#4e73df", fontWeight: "900", textTransform: "uppercase", letterSpacing: "1.2px" }}>
                            {member.role}
                        </span>
                    </div>

                    {/* Footer decoration */}
                    <div style={{ marginTop: "30px", borderTop: "1px solid #f7fafc" }}></div>
                  </div>
                ))}
              </div>

              {(selectedTeamBoard ? filteredUsers : users).length === 0 && (
                <div style={{ textAlign: "center", padding: "100px 0", color: "white", opacity: 0.6 }}>
                    <p style={{ fontSize: "18px", fontWeight: "700" }}>No members found assigned to this board.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}