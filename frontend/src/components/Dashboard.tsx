import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Command, 
  Columns, 
  Activity, 
  Users, 
  Settings, 
  LogOut, 
  Plus, 
  Pencil, 
  Trash2, 
  Check, 
  X 
} from "lucide-react";

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
  email?: string;
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
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);

  /* ===== MAINTENANCE STATE ===== */
  const [editingUser, setEditingUser] = useState<User | null>(null);

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

  const isClient = user?.role === "Client";

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

  const saveEditBoard = async () => {
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

  const deleteUser = async (userId: string) => {
    if (!isClient) return;
    const token = localStorage.getItem("token");
    if (window.confirm("Are you sure you want to remove this user?")) {
      const res = await fetch(`http://localhost:4000/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== userId));
      }
    }
  };

  const updateUser = async () => {
    if (!editingUser || !isClient) return;
    const token = localStorage.getItem("token");
    const res = await fetch(`http://localhost:4000/users/${editingUser.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        role: editingUser.role,
        email: editingUser.email
      }),
    });
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === editingUser.id ? editingUser : u));
      setEditingUser(null);
      alert("User updated successfully");
    }
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
    if (!boardId) {
      setFilteredUsers([]);
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) return;
    setIsLoadingTeam(true);
    try {
      const colRes = await fetch(`http://localhost:4000/columns/${boardId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const columns = await colRes.json();
      const assignedUserIds = new Set<string>();
      for (const col of columns) {
        const ticketRes = await fetch(`http://localhost:4000/tickets/${col.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const tickets = await ticketRes.json();
        tickets.forEach((t: any) => {
          if (t.assignedTo) assignedUserIds.add(t.assignedTo.toString());
          if (t.userId) assignedUserIds.add(t.userId.toString());
        });
      }
      const assignedMembers = users.filter(u => assignedUserIds.has(u.id.toString()));
      setFilteredUsers(assignedMembers);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingTeam(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#f4f7fe", fontFamily: "'Inter', sans-serif" }}>
      
      {/* SIDEBAR */}
      <div style={{ width: "250px", background: "#ffffff", borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column", padding: "25px 15px", boxShadow: "4px 0 15px rgba(0,0,0,0.02)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "35px", paddingLeft: "5px" }}>
          <div style={{ background: "linear-gradient(135deg, #4e73df 0%, #224abe 100%)", padding: "8px", borderRadius: "10px" }}>
            <Command size={20} color="white" />
          </div>
          <h1 style={{ fontSize: "20px", fontWeight: 800, color: "#1a202c", margin: 0 }}>JiraClone</h1>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {[
            { id: "boards", label: "Boards", icon: <Columns size={16} /> },
            { id: "analytics", label: "Analytics", icon: <Activity size={16} /> },
            { id: "team", label: "Team", icon: <Users size={16} /> }
          ].map((item) => (
            <button key={item.id} onClick={() => setActiveView(item.id)} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", borderRadius: "10px", border: "none", background: activeView === item.id ? "#f0f5ff" : "transparent", color: activeView === item.id ? "#4e73df" : "#718096", fontWeight: "600", fontSize: "13px", cursor: "pointer" }}>
              {item.icon} {item.label}
            </button>
          ))}
          {isClient && (
            <button onClick={() => setActiveView("maintenance")} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", borderRadius: "10px", border: "none", background: activeView === "maintenance" ? "#fffaf0" : "transparent", color: activeView === "maintenance" ? "#dd6b20" : "#718096", fontWeight: "600", fontSize: "13px", marginTop: "10px", cursor: "pointer" }}>
              <Settings size={16} /> Maintenance
            </button>
          )}
        </nav>
      </div>

      {/* MAIN CONTENT AREA */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "linear-gradient(135deg, #2d3748 0%, #4a5568 100%)" }}>
        
        {/* TOPBAR */}
        <div style={{ padding: "15px 35px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0, 0, 0, 0.1)", backdropFilter: "blur(8px)", borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
          <div>
            <h2 style={{ color: "white", fontSize: "24px", fontWeight: "800", margin: 0 }}>Dashboard</h2>
            <p style={{ color: "#63b3ed", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", margin: 0 }}>{activeView}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "25px" }}>
            <div style={{ textAlign: "right", color: "white" }}>
              <p style={{ margin: 0, fontWeight: "700", fontSize: "16px" }}>{user?.name}</p>
              <p style={{ margin: 0, fontSize: "11px", fontWeight: "700", color: user?.role === "Client" ? "#f6ad55" : "#63b3ed" }}>{user?.role}</p>
            </div>
            <button onClick={handleLogout} style={{ background: "#e53e3e", color: "white", border: "none", padding: "8px 16px", height: "36px", borderRadius: "8px", fontWeight: "700", fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
              <LogOut size={14} /> LOGOUT
            </button>
          </div>
        </div>

        {/* VIEW CONTAINER */}
        <div style={{ padding: "35px", flex: 1, overflowY: "auto" }}>
          
          {/* BOARDS VIEW */}
          {activeView === "boards" && (
            <>
              {isAdmin && (
                <div style={{ background: "rgba(255, 255, 255, 0.1)", padding: "15px", borderRadius: "12px", display: "flex", gap: "10px", marginBottom: "30px", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
                  <input placeholder="Enter board name..." value={boardName} onChange={(e) => setBoardName(e.target.value)} style={{ flex: 1, padding: "10px 15px", borderRadius: "8px", border: "none", outline: "none", background: "rgba(255, 255, 255, 0.95)", fontSize: "13px" }} />
                  <button onClick={createBoard} style={{ background: "#48bb78", color: "white", border: "none", padding: "0 20px", height: "36px", borderRadius: "8px", fontWeight: "700", fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Plus size={16} /> CREATE
                  </button>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
                {boards.map((board) => (
                  <div key={board.id} style={{ background: "#ffffff", padding: "20px", borderRadius: "16px", boxShadow: "0 8px 20px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: "150px" }}>
                    {editingId === board.id ? (
                      <div style={{ display: "flex", gap: "8px", flexDirection: "column" }}>
                        <input value={editingName} onChange={(e) => setEditingName(e.target.value)} style={{ border: "1px solid #edf2f7", padding: "10px", borderRadius: "8px", fontSize: "14px" }} />
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button onClick={saveEditBoard} style={{ flex: 1, background: "#48bb78", color: "white", border: "none", height: "36px", borderRadius: "8px" }}><Check size={16} /></button>
                          <button onClick={() => setEditingId(null)} style={{ flex: 1, background: "#edf2f7", color: "#4a5568", border: "none", height: "36px", borderRadius: "8px" }}><X size={16} /></button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div onClick={() => navigate(`/board/${board.id}`)} style={{ cursor: "pointer" }}>
                          <p style={{ fontSize: "9px", color: "#4e73df", fontWeight: "800", marginBottom: "4px", textTransform: "uppercase" }}>Project Space</p>
                          <h3 style={{ margin: 0, fontSize: "18px", color: "#2d3748", fontWeight: 700 }}>{board.name}</h3>
                        </div>
                        {isAdmin && (
                          <div style={{ display: "flex", gap: "8px", borderTop: "1px solid #f1f5f9", paddingTop: "12px", marginTop: "15px" }}>
                            <button onClick={() => { setEditingId(board.id); setEditingName(board.name); }} style={{ background: "#f0f5ff", color: "#4e73df", border: "none", height: "36px", borderRadius: "8px", cursor: "pointer", flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}><Pencil size={14} /></button>
                            <button onClick={() => deleteBoard(board.id)} style={{ background: "#fff5f5", color: "#e53e3e", border: "none", height: "36px", borderRadius: "8px", cursor: "pointer", flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}><Trash2 size={14} /></button>
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
            <div style={{ background: "white", padding: "30px", borderRadius: "20px", maxWidth: "700px", margin: "0 auto", textAlign: "center", boxShadow: "0 15px 30px rgba(0,0,0,0.2)" }}>
              <h2 style={{ marginBottom: "25px", color: "#1a202c", fontWeight: 800, fontSize: "20px" }}>Analytics</h2>
              <select value={selectedBoard} onChange={(e) => { setSelectedBoard(e.target.value); fetchBoardAnalytics(e.target.value); }} style={{ padding: "10px 15px", borderRadius: "8px", width: "100%", maxWidth: "350px", marginBottom: "30px", border: "1px solid #edf2f7", fontSize: "14px" }}>
                <option value="">Select a board...</option>
                {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <div style={{ maxWidth: "350px", margin: "0 auto" }}>
                <Pie data={chartData} />
              </div>
            </div>
          )}

          {/* TEAM VIEW */}
          {activeView === "team" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "25px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ color: "white", margin: 0, fontWeight: 800, fontSize: "24px" }}>Team</h2>
                <select value={selectedTeamBoard} onChange={(e) => { setSelectedTeamBoard(e.target.value); fetchBoardTeam(e.target.value); }} style={{ padding: "8px 15px", borderRadius: "8px", background: "white", border: "none", fontSize: "12px", fontWeight: "600", width: "200px" }}>
                  <option value="">All Members</option>
                  {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "20px" }}>
                {(selectedTeamBoard ? filteredUsers : users).map((member) => (
                  <div key={member.id} style={{ background: "white", padding: "25px", borderRadius: "16px", textAlign: "center", boxShadow: "0 8px 20px rgba(0,0,0,0.1)" }}>
                    <div style={{ width: "50px", height: "50px", background: "#f0f7ff", color: "#4e73df", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: "18px", fontWeight: "800" }}>{member.name.charAt(0).toUpperCase()}</div>
                    <h3 style={{ margin: "0 0 4px 0", color: "#1a202c", fontSize: "16px", fontWeight: "700" }}>{member.name}</h3>
                    <span style={{ fontSize: "10px", color: member.role === "Client" ? "#f6ad55" : "#4e73df", fontWeight: "800", textTransform: "uppercase", background: member.role === "Client" ? "#fff9f0" : "#f0f5ff", padding: "4px 10px", borderRadius: "6px" }}>{member.role}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MAINTENANCE VIEW (FIXED) */}
          {activeView === "maintenance" && isClient && (
            <div style={{ background: "white", padding: "25px", borderRadius: "16px", boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}>
              <h2 style={{ color: "#1a202c", fontWeight: 800, fontSize: "20px", marginBottom: "20px" }}>Maintenance</h2>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ textAlign: "left", color: "#a0aec0", fontSize: "11px", textTransform: "uppercase", borderBottom: "1px solid #f7fafc" }}>
                      <th style={{ padding: "12px" }}>User Details</th>
                      <th style={{ padding: "12px" }}>Access Level</th>
                      <th style={{ padding: "12px", textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => {
                      const isEditing = editingUser?.id === u.id;
                      return (
                        <tr key={u.id} style={{ borderBottom: "1px solid #f7fafc" }}>
                          <td style={{ padding: "12px" }}>
                            <div style={{ fontWeight: "700", color: "#2d3748", fontSize: "14px" }}>{u.name}</div>
                            {isEditing ? (
                              <input value={editingUser.email || ""} onChange={(e) => setEditingUser({...editingUser, email: e.target.value})} style={{ border: "1px solid #cbd5e0", padding: "4px 8px", borderRadius: "5px", width: "200px", marginTop: "5px", fontSize: "12px" }} />
                            ) : (
                              <div style={{ fontSize: "12px", color: "#718096" }}>{u.email || "No email"}</div>
                            )}
                          </td>
                          <td style={{ padding: "12px" }}>
                            {isEditing ? (
                              <select value={editingUser.role} onChange={(e) => setEditingUser({...editingUser, role: e.target.value})} style={{ padding: "4px", borderRadius: "6px", border: "1px solid #cbd5e0", fontSize: "12px" }}>
                                <option value="Team Member">Team Member</option>
                                <option value="Team Lead">Team Lead</option>
                                <option value="Project Manager">Project Manager</option>
                                <option value="Client">Client</option>
                              </select>
                            ) : (
                              <span style={{ fontSize: "11px", fontWeight: "700", color: u.role === "Client" ? "#f6ad55" : "#4e73df", background: u.role === "Client" ? "#fff9f0" : "#f0f5ff", padding: "4px 8px", borderRadius: "6px" }}>{u.role}</span>
                            )}
                          </td>
                          <td style={{ padding: "12px", textAlign: "right" }}>
                             <div style={{ display: "flex", gap: "8px", justifyContent: "end" }}>
                                {isEditing ? (
                                  <>
                                    <button onClick={updateUser} style={{ background: "#48bb78", border: "none", color: "white", padding: "6px", borderRadius: "6px", cursor: "pointer" }}><Check size={14}/></button>
                                    <button onClick={() => setEditingUser(null)} style={{ background: "#edf2f7", border: "none", color: "#4a5568", padding: "6px", borderRadius: "6px", cursor: "pointer" }}><X size={14}/></button>
                                  </>
                                ) : (
                                  <>
                                    <button onClick={() => setEditingUser({...u})} style={{ background: "#f0f5ff", border: "none", color: "#4e73df", padding: "6px", borderRadius: "6px", cursor: "pointer" }}><Pencil size={14}/></button>
                                    <button onClick={() => deleteUser(u.id)} style={{ background: "#fff5f5", border: "none", color: "#e53e3e", padding: "6px", borderRadius: "6px", cursor: "pointer" }}><Trash2 size={14}/></button>
                                  </>
                                )}
                              </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}