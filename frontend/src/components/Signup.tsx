import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Signup() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(""); // Initially empty

  const handleSignup = async () => {
    // Validation to ensure a role is selected
    if (!role || role === "") {
      alert("Please select your role before proceeding.");
      return;
    }

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
        alert(data.message || "Signup failed");
      }
    } catch (error) {
      console.error("Backend signup failed, using localStorage fallback");
      
      // 🔹 FALLBACK LOGIC
      const users = JSON.parse(localStorage.getItem("users") || "[]");
      users.push({ name, email, password, role });
      localStorage.setItem("users", JSON.stringify(users));
      alert("Account created locally (Server Offline)");
      navigate("/");
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#f8fafc", 
      fontFamily: "'Inter', sans-serif",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* BACKGROUND ACCENT */}
      <div style={{
        position: "absolute",
        width: "600px",
        height: "600px",
        background: "radial-gradient(circle, rgba(28, 200, 138, 0.08) 0%, rgba(78, 115, 223, 0.05) 100%)",
        borderRadius: "50%",
        bottom: "-200px",
        right: "-100px",
        zIndex: 1
      }}></div>

      <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: "460px", padding: "20px" }}>
        
        {/* APP BRANDING */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <h1 style={{ 
            color: "#1e293b", 
            margin: 0, 
            fontSize: "44px", 
            fontWeight: 900, 
            letterSpacing: "-1.5px"
          }}>
            TO_DO <span style={{ color: "#1cc88a" }}>APP</span>
          </h1>
          <p style={{ 
            color: "#64748b", 
            fontSize: "15px", 
            fontWeight: "500", 
            marginTop: "8px",
            letterSpacing: "0.5px"
          }}>
            Manage and follow your tasks seamlessly
          </p>
        </div>

        {/* SIGNUP CARD */}
        <div style={{
          background: "white",
          padding: "45px",
          borderRadius: "32px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.08)",
          border: "1px solid #f1f5f9"
        }}>
          <h2 style={{ color: "#1e293b", fontSize: "24px", fontWeight: "800", marginBottom: "30px", textAlign: "center" }}>
            Create Account
          </h2>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", color: "#475569", fontSize: "12px", fontWeight: "700", marginBottom: "8px", textTransform: "uppercase" }}>
              Full Name
            </label>
            <input
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: "100%", padding: "14px 18px", borderRadius: "14px", border: "2px solid #f1f5f9",
                background: "#f8fafc", color: "#1e293b", fontSize: "15px", outline: "none", boxSizing: "border-box"
              }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", color: "#475569", fontSize: "12px", fontWeight: "700", marginBottom: "8px", textTransform: "uppercase" }}>
              Username
            </label>
            <input
              placeholder="name@company"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%", padding: "14px 18px", borderRadius: "14px", border: "2px solid #f1f5f9",
                background: "#f8fafc", color: "#1e293b", fontSize: "15px", outline: "none", boxSizing: "border-box"
              }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", color: "#475569", fontSize: "12px", fontWeight: "700", marginBottom: "8px", textTransform: "uppercase" }}>
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%", padding: "14px 18px", borderRadius: "14px", border: "2px solid #f1f5f9",
                background: "#f8fafc", color: "#1e293b", fontSize: "15px", outline: "none", boxSizing: "border-box"
              }}
            />
          </div>

          <div style={{ marginBottom: "35px" }}>
            <label style={{ display: "block", color: "#475569", fontSize: "12px", fontWeight: "700", marginBottom: "8px", textTransform: "uppercase" }}>
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{
                width: "100%", padding: "14px 18px", borderRadius: "14px", border: "2px solid #f1f5f9",
                background: "#f8fafc", color: role === "" ? "#94a3b8" : "#1e293b", fontSize: "15px", outline: "none", cursor: "pointer", boxSizing: "border-box"
              }}
            >
              <option value="" disabled>Select Your Role</option>
              <option value="Client">Client</option>
              <option value="Project Manager">Project Manager</option>
              <option value="Team Lead">Team Lead</option>
              <option value="Team Member">Team Member</option>
            </select>
          </div>

          <button 
            onClick={handleSignup}
            style={{
              width: "100%", padding: "16px", borderRadius: "14px", border: "none",
              background: "#1cc88a", color: "white", fontWeight: "800", fontSize: "15px",
              cursor: "pointer", boxShadow: "0 10px 20px -5px rgba(28, 200, 138, 0.4)",
              transition: "transform 0.2s"
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
            onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0)"}
          >
            CREATE ACCOUNT
          </button>

          <div style={{ marginTop: "25px", textAlign: "center" }}>
            <span style={{ color: "#64748b", fontSize: "14px" }}>Already have an account?</span>
            <span 
              onClick={() => navigate("/")}
              style={{ color: "#1cc88a", fontSize: "14px", fontWeight: "800", cursor: "pointer", marginLeft: "8px" }}
            >
              Sign In
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}