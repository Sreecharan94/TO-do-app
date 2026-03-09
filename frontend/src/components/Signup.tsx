import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Signup() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Team Member");

  const handleSignup = async () => {
    try {
      // 🔹 Try Backend Signup First
      const response = await fetch("http://localhost:4000/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Account created successfully");
        navigate("/");
        return;
      } else {
        console.log("Backend response:", data);
      }
    } catch (error) {
      console.error("Backend signup failed, using localStorage fallback");
    }

    // 🔹 OLD LOGIC (UNCHANGED - fallback)
    const users = JSON.parse(localStorage.getItem("users") || "[]");

    users.push({ name, email, password, role });

    localStorage.setItem("users", JSON.stringify(users));
    navigate("/");
  };

  return (
    <div className="center-page">
      <div className="glass">
        <h2>Create Account</h2>

        <input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option>Client</option>
          <option>Project Manager</option>
          <option>Team Lead</option>
          <option>Team Member</option>
        </select>

        <button onClick={handleSignup}>Sign Up</button>
      </div>
    </div>
  );
}