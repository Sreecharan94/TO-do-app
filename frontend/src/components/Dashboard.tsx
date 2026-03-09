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
        backgroundColor: [
          "#ef4444",
          "#facc15",
          "#22c55e"
        ],
        borderWidth: 1
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

  /* ===== FETCH BOARDS ===== */

  const fetchBoards = async (token: string) => {

    const res = await fetch("http://localhost:4000/boards", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      const data = await res.json();
      setBoards(data);
    }

  };

  /* ===== FETCH USERS ===== */

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

  /* ===== CREATE BOARD ===== */

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

  /* ===== DELETE BOARD ===== */

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

  /* ===== EDIT BOARD ===== */

  const startEdit = (board: Board) => {

    setEditingId(board.id);
    setEditingName(board.name);

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

    setBoards((prev) =>
      prev.map((b) =>
        b.id === editingId ? { ...b, name: editingName } : b
      )
    );

    setEditingId(null);

  };

  /* ===== LOGOUT ===== */

  const handleLogout = () => {

    localStorage.removeItem("token");
    navigate("/");

  };

  /* ===== ANALYTICS LOGIC ===== */

  const fetchBoardAnalytics = async (boardId: string) => {

    const token = localStorage.getItem("token");
    if (!token) return;

    const columnRes = await fetch(
      `http://localhost:4000/columns/${boardId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const columns = await columnRes.json();

    let todo = 0;
    let progress = 0;
    let done = 0;

    for (const col of columns) {

      const ticketRes = await fetch(
        `http://localhost:4000/tickets/${col.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const tickets = await ticketRes.json();

      if (col.name.toLowerCase().includes("to")) {
        todo += tickets.length;
      }

      if (col.name.toLowerCase().includes("progress")) {
        progress += tickets.length;
      }

      if (col.name.toLowerCase().includes("complete")) {
        done += tickets.length;
      }

    }

    const total = todo + progress + done;

    if (total === 0) {
      setTodoPercent(0);
      setProgressPercent(0);
      setDonePercent(0);
      return;
    }

    setTodoPercent((todo / total) * 100);
    setProgressPercent((progress / total) * 100);
    setDonePercent((done / total) * 100);

  };

  /* ===== IMPROVED: FETCH TEAM MEMBERS BY BOARD ===== */

  const fetchBoardTeam = async (boardId: string) => {
    if (!boardId) {
      setFilteredUsers([]);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      // 1. Fetch columns for selected board
      const colRes = await fetch(`http://localhost:4000/columns/${boardId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const columns = await colRes.json();

      const boardUserIds = new Set();

      // 2. Fetch all tickets for all columns in this board
      for (const col of columns) {
        const ticketRes = await fetch(`http://localhost:4000/tickets/${col.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const tickets = await ticketRes.json();
        
        // Check both userId and assignedTo just in case of naming differences
        tickets.forEach((t: any) => {
          if (t.userId) boardUserIds.add(t.userId.toString());
          if (t.assignedTo) boardUserIds.add(t.assignedTo.toString());
        });
      }

      // 3. Match user IDs found in tickets with the main users list
      const assignedMembers = users.filter(u => boardUserIds.has(u.id.toString()));
      setFilteredUsers(assignedMembers);
    } catch (error) {
      console.error("Error fetching board team:", error);
    }
  };

  return (

    <div className="min-h-screen flex bg-gray-100">

      {/* ===== SIDEBAR ===== */}

      <div className="w-64 h-screen bg-white border-r text-gray-700 flex flex-col p-6 shrink-0">

        <h1 className="text-2xl font-bold mb-10 text-indigo-600">
          Jira Clone
        </h1>

        <nav className="flex flex-col gap-4 text-sm w-full">

          <button
            onClick={() => setActiveView("boards")}
            className={`text-left hover:bg-gray-100 p-3 rounded-lg w-full font-medium ${activeView === 'boards' ? 'bg-indigo-50 text-indigo-600' : ''}`}
          >
            Boards
          </button>

          <button
            onClick={() => setActiveView("analytics")}
            className={`text-left hover:bg-gray-100 p-3 rounded-lg w-full font-medium ${activeView === 'analytics' ? 'bg-indigo-50 text-indigo-600' : ''}`}
          >
            Analytics
          </button>

          <button
            onClick={() => setActiveView("team")}
            className={`text-left hover:bg-gray-100 p-3 rounded-lg w-full font-medium ${activeView === 'team' ? 'bg-indigo-50 text-indigo-600' : ''}`}
          >
            Team
          </button>

        </nav>

      </div>

      {/* ===== MAIN CONTENT ===== */}

      <div className="flex-1 flex flex-col">

        {/* ===== NAVBAR ===== */}

        <div className="bg-indigo-600 text-white px-8 py-4 flex justify-between items-center shadow-md">

          <h1 className="text-2xl font-bold tracking-wide">
            Project Dashboard
          </h1>

          <div className="flex items-center gap-4">

            <div className="text-right">
              <p className="font-semibold">{user?.name}</p>
              <p className="text-xs opacity-80">{user?.role}</p>
            </div>

            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
            >
              Logout
            </button>

          </div>

        </div>

        {/* ===== BOARDS VIEW ===== */}

        {activeView === "boards" && (

          <>
            {isAdmin && (

              <div className="w-full mt-8 flex gap-4 px-10">

                <input
                  value={boardName}
                  onChange={(e) => setBoardName(e.target.value)}
                  placeholder="Enter Board Name"
                  className="flex-1 border border-gray-300 p-3 rounded-md"
                />

                <button
                  onClick={createBoard}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-md"
                >
                  Create Board
                </button>

              </div>
            )}

            <div className="w-full mt-10 px-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">

              {boards.map((board) => (

                <div
                  key={board.id}
                  className="bg-white rounded-xl shadow-md p-6 h-40 flex flex-col justify-between"
                >

                  {editingId === board.id ? (

                    <div className="flex gap-2">

                      <input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="flex-1 border p-2 rounded-md"
                      />

                      <button
                        onClick={saveEdit}
                        className="bg-green-500 text-white px-4 py-2 rounded-md"
                      >
                        Save
                      </button>

                    </div>

                  ) : (

                    <>
                      <h2
                        onClick={() => navigate(`/board/${board.id}`)}
                        className="text-lg font-semibold cursor-pointer hover:text-indigo-600"
                      >
                        {board.name}
                      </h2>

                      {isAdmin && (

                        <div className="mt-4 flex gap-4">

                          <button
                            onClick={() => startEdit(board)}
                            className="bg-blue-500 text-white px-4 py-2 rounded-md"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => deleteBoard(board.id)}
                            className="bg-red-500 text-white px-4 py-2 rounded-md"
                          >
                            Delete
                          </button>

                        </div>
                      )}

                    </>
                  )}

                </div>
              ))}

            </div>

          </>
        )}

        {/* ===== ANALYTICS VIEW ===== */}

        {activeView === "analytics" && (

          <div className="p-10">

            <h2 className="text-2xl font-bold mb-6">
              Board Analytics
            </h2>

            <select
              value={selectedBoard}
              onChange={(e) => {
                setSelectedBoard(e.target.value);
                fetchBoardAnalytics(e.target.value);
              }}
              className="border p-3 rounded mb-8"
            >

              <option value="">Select Board</option>

              {boards.map((board) => (
                <option key={board.id} value={board.id}>
                  {board.name}
                </option>
              ))}

            </select>

            <div className="flex justify-center">

              <div className="bg-white p-10 rounded-xl shadow w-[450px]">

                <Pie data={chartData} />

              </div>

            </div>

          </div>
        )}

        {/* ===== TEAM VIEW (FIXED FILTERING) ===== */}

        {activeView === "team" && (

          <div className="p-10">

            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">
                Team Members
              </h2>

              <select
                value={selectedTeamBoard}
                onChange={(e) => {
                  setSelectedTeamBoard(e.target.value);
                  fetchBoardTeam(e.target.value);
                }}
                className="border p-3 rounded bg-white shadow-sm"
              >
                <option value="">Select Board to see Members</option>
                {boards.map((board) => (
                  <option key={board.id} value={board.id}>
                    {board.name}
                  </option>
                ))}
              </select>
            </div>

            {/* If no board is selected, show instructions */}
            {!selectedTeamBoard ? (
              <div className="text-center py-20 text-gray-500 border-2 border-dashed rounded-xl">
                Please select a board from the dropdown to see the assigned team members.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

                {filteredUsers.length > 0 ? (
                  filteredUsers.map((member) => (
                    <div
                      key={member.id}
                      className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition-shadow border-t-4 border-indigo-500"
                    >
                      <div className="w-12 h-12 bg-indigo-500 text-white flex items-center justify-center rounded-full mb-3 text-lg font-bold">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <p className="font-semibold text-lg">{member.name}</p>
                      <p className="text-sm text-gray-500 uppercase tracking-wider">{member.role}</p>
                    </div>
                  ))
                ) : (
                  <div className="col-span-4 text-center py-20 text-gray-400">
                    No members are currently assigned to tickets in this board.
                  </div>
                )}

              </div>
            )}

          </div>
        )}

      </div>

    </div>
  );
}