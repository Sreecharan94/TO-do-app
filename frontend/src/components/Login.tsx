import { useState } from "react";
import { useNavigate } from "react-router-dom";

type LoginResponse = {
  token: string;
  user?: {
    id: string;
    name: string;
    role: string;
  };
  message?: string;
};

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const handleLogin = async () => {
    try {
      // 🔹 Try Backend Login First
      const response = await fetch("http://localhost:4000/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      let data: LoginResponse = {} as LoginResponse;

      try {
        data = await response.json();
      } catch {
        data = {} as LoginResponse;
      }

      if (response.ok) {
        // ✅ Store JWT token
        localStorage.setItem("token", data.token);

        // ✅ Store currentUser for role-based UI
        if (data.user) {
          localStorage.setItem("currentUser", JSON.stringify(data.user));
        }

        navigate("/dashboard");
        return;
      } else {
        alert(data.message || "Invalid credentials");
        return;
      }
    } catch (error) {
      console.error("Backend login failed, falling back to localStorage");
    }

    // 🔹 OLD LOGIC (UNCHANGED)
    const users = JSON.parse(localStorage.getItem("users") || "[]");

    const user = users.find(
      (u: { email: string; password: string }) =>
        u.email === email && u.password === password
    );

    if (!user) {
      alert("Invalid credentials");
      return;
    }

    localStorage.setItem("currentUser", JSON.stringify(user));
    navigate("/dashboard");
  };

  return (
    <div className="center-page">
      <div className="glass">
        <h2>Sign In</h2>

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

        <button onClick={handleLogin}>Login</button>

        <p
          style={{
            marginTop: "15px",
            textAlign: "center",
            fontSize: "14px",
          }}
        >
          Don't have an account?{" "}
          <span
            style={{
              cursor: "pointer",
              fontWeight: "bold",
              textDecoration: "underline",
            }}
            onClick={() => navigate("/signup")}
          >
            Sign Up
          </span>
        </p>
      </div>
    </div>
  );
}