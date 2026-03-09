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

    if (
      currentUser.role === "Client" ||
      currentUser.role === "Project Manager"
    )
      return true;

    if (
      ticket.assignedUser &&
      ticket.assignedUser.id === currentUser.id
    )
      return true;

    return false;
  };

  const canDeleteTicket = () => {
    if (!currentUser) return false;
    return (
      currentUser.role === "Client" ||
      currentUser.role === "Project Manager"
    );
  };

  const canCreateTicket = () => {
    if (!currentUser) return false;
    return (
      currentUser.role === "Client" ||
      currentUser.role === "Project Manager" ||
      currentUser.role === "Team Lead"
    );
  };

  /* ================= FETCH DATA ================= */

  useEffect(() => {
    if (!id || !token) return;

    const fetchData = async () => {
      const columnRes = await fetch(
        `http://localhost:4000/columns/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const columnData = await columnRes.json();
      setColumns(columnData);

      const map: Record<string, Ticket[]> = {};

      for (const col of columnData) {
        const ticketRes = await fetch(
          `http://localhost:4000/tickets/${col.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        map[col.id] = await ticketRes.json();
      }

      setTicketsByColumn(map);

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
    <div
      style={{
        minHeight: "100vh",
        padding: "40px",
        background: "linear-gradient(135deg, #4e73df, #1cc88a)",
      }}
    >
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h1 style={{ color: "white" }}>Board</h1>
        <button
          onClick={handleLogout}
          style={{
            background: "#e74a3b",
            color: "white",
            border: "none",
            padding: "8px 14px",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </div>

      {/* CREATE TICKET */}
      {canCreateTicket() && (
        <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
          <input
            placeholder="Ticket Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{
              padding: "8px",
              borderRadius: "6px",
              border: "1px solid #ccc",
              width: "300px",
            }}
          />

          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            style={{
              padding: "8px",
              borderRadius: "6px",
              border: "1px solid #ccc",
            }}
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role})
              </option>
            ))}
          </select>

          <button
            onClick={addTicket}
            style={{
              background: "#4e73df",
              color: "white",
              border: "none",
              padding: "8px 14px",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Create Ticket
          </button>
        </div>
      )}

      {/* COLUMNS */}
      <div style={{ display: "flex", gap: "30px", marginTop: "40px" }}>
        {columns.map((column) => (
          <div
            key={column.id}
            style={{
              flex: 1,
              background: "white",
              borderRadius: "12px",
              padding: "20px",
              minHeight: "450px",
            }}
          >
            <h3 style={{ textTransform: "capitalize" }}>{column.name}</h3>

            {ticketsByColumn[column.id]?.map((ticket) => (
              <div
                key={ticket.id}
                style={{
                  background: "#f8f9fc",
                  padding: "10px",
                  borderRadius: "8px",
                  marginBottom: "10px",
                }}
              >
                <strong>T-{ticket.ticketNo}</strong>
                <div>{ticket.description}</div>

                {ticket.assignedUser && (
                  <div style={{ fontSize: "12px" }}>
                    Assigned to: {ticket.assignedUser.name} (
                    {ticket.assignedUser.role})
                  </div>
                )}

                {canMoveTicket(ticket) &&
                  columns
                    .filter((c) => c.id !== column.id)
                    .map((c) => (
                      <button
                        key={c.id}
                        onClick={() => moveTicket(ticket.id, c.id)}
                        style={{ marginTop: "5px", marginRight: "5px" }}
                      >
                        Move to {c.name}
                      </button>
                    ))}

                {canDeleteTicket() && (
                  <button
                    onClick={() => deleteTicket(ticket.id)}
                    style={{
                      marginTop: "5px",
                      background: "#e53935",
                      color: "white",
                      border: "none",
                      padding: "4px 6px",
                      borderRadius: "4px",
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}