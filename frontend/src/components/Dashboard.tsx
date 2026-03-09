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

  /* ===== USER MAINTENANCE ACTIONS ===== */

  const deleteUser = async (userId: string) => {
    if (!isClient) return;
    const token = localStorage.getItem("token");
    if (window.confirm("Are you sure you want to remove this user? This will also delete their boards and tickets.")) {
      const res = await fetch(`http://localhost:4000/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== userId));
        alert("User removed successfully.");
      } else {
        const err = await res.json();
        alert(`Failed to delete: ${err.message}`);
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

  /* ===== NEW: FETCH TEAM MEMBERS BY BOARD ASSIGNMENT ===== */
  const fetchBoardTeam = async (boardId: string) => {
    if (!boardId) {
      setFilteredUsers([]);
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) return;

    setIsLoadingTeam(true);
    try {
      // 1. Get all columns for this board
      const colRes = await fetch(`http://localhost:4000/columns/${boardId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const columns = await colRes.json();

      const assignedUserIds = new Set<string>();

      // 2. Loop through columns and fetch all tickets to find assigned users
      for (const col of columns) {
        const ticketRes = await fetch(`http://localhost:4000/tickets/${col.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const tickets = await ticketRes.json();
        
        tickets.forEach((t: any) => {
          // Check both field names commonly used in your backend
          if (t.assignedTo) assignedUserIds.add(t.assignedTo.toString());
          if (t.userId) assignedUserIds.add(t.userId.toString());
        });
      }

      // 3. Filter the global 'users' state to only include those in the Set
      const assignedMembers = users.filter(u => assignedUserIds.has(u.id.toString()));
      setFilteredUsers(assignedMembers);
    } catch (err) {
      console.error("Error filtering team by board:", err);
    } finally {
      setIsLoadingTeam(false);
    }
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

          {isClient && (
            <button
              onClick={() => setActiveView("maintenance")}
              style={{
                textAlign: "left",
                padding: "16px 24px",
                borderRadius: "14px",
                border: "none",
                background: activeView === "maintenance" ? "rgba(255, 255, 255, 0.25)" : "transparent",
                color: "#ffc107",
                fontWeight: "900",
                textTransform: "uppercase",
                letterSpacing: "1px",
                fontSize: "13px",
                marginTop: "20px",
                cursor: "pointer",
                border: "1px dashed rgba(255, 193, 7, 0.5)"
              }}
            >
              Maintenance
            </button>
          )}
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
                  border: "1px solid rgba(255, 255, 255, 0.3)"
                }}>
                  <input
                    placeholder="Enter new board name..."
                    value={boardName}
                    onChange={(e) => setBoardName(e.target.value)}
                    style={{ flex: 1, padding: "14px 20px", borderRadius: "12px", border: "none", outline: "none", background: "white", fontSize: "15px" }}
                  />
                  <button onClick={createBoard} style={{ background: "#1cc88a", color: "white", border: "none", padding: "0 35px", borderRadius: "12px", fontWeight: "900", fontSize: "13px", cursor: "pointer" }}>
                    CREATE BOARD
                  </button>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "30px" }}>
                {boards.map((board) => (
                  <div key={board.id} style={{
                    background: "rgba(255, 255, 255, 0.98)",
                    padding: "35px",
                    borderRadius: "24px",
                    boxShadow: "0 15px 35px rgba(0,0,0,0.08)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    minHeight: "200px"
                  }}>
                    {editingId === board.id ? (
                      <div style={{ display: "flex", gap: "10px" }}>
                        <input value={editingName} onChange={(e) => setEditingName(e.target.value)} style={{ flex: 1, border: "2px solid #edf2f7", padding: "10px", borderRadius: "8px" }} />
                        <button onClick={saveEditBoard} style={{ background: "#1cc88a", color: "white", border: "none", padding: "10px 20px", borderRadius: "8px", fontWeight: "bold" }}>Save</button>
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
                <Pie data={chartData} />
              </div>
            </div>
          )}

          {/* TEAM VIEW WITH BOARD FILTER */}
          {activeView === "team" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end" }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ color: "white", fontSize: "12px", fontWeight: "900", textTransform: "uppercase", letterSpacing: "3px", opacity: 0.8 }}>Resource Directory</span>
                  <h2 style={{ color: "white", margin: "5px 0 0 0", fontWeight: 900, fontSize: "36px" }}>Team Members</h2>
                </div>
                
                {/* NEW BOARD SELECTOR DROPDOWN */}
                <select 
                  value={selectedTeamBoard} 
                  onChange={(e) => {
                    setSelectedTeamBoard(e.target.value);
                    fetchBoardTeam(e.target.value);
                  }}
                  style={{ 
                    padding: "14px 24px", 
                    borderRadius: "14px", 
                    background: "white", 
                    border: "none", 
                    width: "300px", 
                    fontWeight: "700", 
                    fontSize: "14px", 
                    boxShadow: "0 8px 20px rgba(0,0,0,0.12)", 
                    color: "#4e73df", 
                    outline: "none" 
                  }}
                >
                  <option value="">All Company Members</option>
                  {boards.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "35px" }}>
                {isLoadingTeam ? (
                  <p style={{ color: "white", textAlign: "center", gridColumn: "1/-1" }}>Filtering assigned members...</p>
                ) : (
                  (selectedTeamBoard ? filteredUsers : users).map((member) => (
                    <div key={member.id} style={{ background: "rgba(255, 255, 255, 1)", padding: "45px 30px", borderRadius: "28px", textAlign: "center", position: "relative", boxShadow: "0 15px 35px rgba(0,0,0,0.06)" }}>
                      <div style={{ height: "8px", background: "#4e73df", position: "absolute", top: 0, left: 0, right: 0 }}></div>
                      <div style={{ width: "90px", height: "90px", background: "#f0f7ff", color: "#4e73df", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 25px", fontSize: "32px", fontWeight: "900", border: "5px solid white" }}>
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <h3 style={{ margin: "0 0 8px 0", color: "#1a202c", fontSize: "22px", fontWeight: "900" }}>{member.name}</h3>
                      <span style={{ fontSize: "11px", color: "#4e73df", fontWeight: "900", textTransform: "uppercase", background: "#eef4ff", padding: "6px 16px", borderRadius: "12px" }}>{member.role}</span>
                    </div>
                  ))
                )}
              </div>

              {selectedTeamBoard && filteredUsers.length === 0 && !isLoadingTeam && (
                <div style={{ textAlign: "center", padding: "100px 0", color: "white", opacity: 0.6 }}>
                  <p style={{ fontSize: "18px", fontWeight: "700" }}>No members are currently assigned to tickets in this board.</p>
                </div>
              )}
            </div>
          )}

          {/* MAINTENANCE VIEW */}
          {activeView === "maintenance" && isClient && (
            <div style={{ 
              background: "rgba(255, 255, 255, 0.95)", 
              padding: "40px", 
              borderRadius: "24px", 
              boxShadow: "0 20px 50px rgba(0,0,0,0.15)",
              backdropFilter: "blur(10px)"
            }}>
              <div style={{ marginBottom: "30px" }}>
                <h2 style={{ color: "#1a202c", fontWeight: 900, fontSize: "28px", margin: 0 }}>System Maintenance</h2>
                <p style={{ color: "#718096", fontSize: "14px", marginTop: "5px" }}>Manage user permissions, roles, and account status.</p>
              </div>
              
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 10px" }}>
                  <thead>
                    <tr style={{ textAlign: "left", color: "#4e73df", fontSize: "11px", textTransform: "uppercase", letterSpacing: "1.5px" }}>
                      <th style={{ padding: "15px 20px" }}>User Details</th>
                      <th style={{ padding: "15px 20px" }}>Access Level</th>
                      <th style={{ padding: "15px 20px", textAlign: "right" }}>Management</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} style={{ background: "white", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
                        <td style={{ padding: "20px", borderRadius: "15px 0 0 15px", borderLeft: "4px solid #4e73df" }}>
                          <div style={{ fontWeight: "800", color: "#2d3748" }}>{u.name}</div>
                          <div style={{ fontSize: "12px", color: "#a0aec0" }}>
                            {editingUser?.id === u.id ? (
                              <input 
                                value={editingUser.email || ""} 
                                onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                                style={{ border: "1px solid #cbd5e0", padding: "4px 8px", borderRadius: "5px", width: "250px", marginTop: "5px" }}
                              />
                            ) : (u.email || "No Email Defined")}
                          </div>
                        </td>
                        <td style={{ padding: "20px" }}>
                          {editingUser?.id === u.id ? (
                            <select 
                              value={editingUser.role} 
                              onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
                              style={{ padding: "8px", borderRadius: "8px", border: "1px solid #cbd5e0", background: "white" }}
                            >
                              <option value="Team Member">Team Member</option>
                              <option value="Team Lead">Team Lead</option>
                              <option value="Project Manager">Project Manager</option>
                              <option value="Client">Client</option>
                            </select>
                          ) : (
                            <span style={{ 
                              background: u.role === 'Client' ? "#fff5f5" : "#f0f7ff", 
                              color: u.role === 'Client' ? "#e53935" : "#4e73df", 
                              padding: "5px 12px", 
                              borderRadius: "8px", 
                              fontSize: "11px", 
                              fontWeight: "800" 
                            }}>{u.role}</span>
                          )}
                        </td>
                        <td style={{ padding: "20px", borderRadius: "0 15px 15px 0", textAlign: "right" }}>
                          {editingUser?.id === u.id ? (
                            <div style={{ display: "flex", gap: "10px", justifyContent: "end" }}>
                              <button onClick={updateUser} style={{ background: "#1cc88a", color: "white", border: "none", padding: "8px 15px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>Save</button>
                              <button onClick={() => setEditingUser(null)} style={{ background: "#edf2f7", color: "#4a5568", border: "none", padding: "8px 15px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>Cancel</button>
                            </div>
                          ) : (
                            <div style={{ display: "flex", gap: "20px", justifyContent: "end" }}>
                              <button onClick={() => setEditingUser(u)} style={{ background: "transparent", color: "#4e73df", border: "none", fontWeight: "800", fontSize: "12px", cursor: "pointer" }}>EDIT</button>
                              <button onClick={() => deleteUser(u.id)} style={{ background: "transparent", color: "#ff4b2b", border: "none", fontWeight: "800", fontSize: "12px", cursor: "pointer" }}>REMOVE</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
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