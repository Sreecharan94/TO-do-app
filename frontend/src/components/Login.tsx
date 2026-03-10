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
      const response = await fetch("http://localhost:4000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      let data: LoginResponse = {} as LoginResponse;
      try { data = await response.json(); } catch { data = {} as LoginResponse; }

      if (response.ok) {
        localStorage.setItem("token", data.token);
        if (data.user) localStorage.setItem("currentUser", JSON.stringify(data.user));
        navigate("/dashboard");
      } else {
        alert(data.message || "Invalid credentials");
      }
    } catch (error) {
      console.error("Backend login failed");
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
      {/* SOFT BACKGROUND ACCENTS */}
      <div style={{
        position: "absolute",
        width: "600px",
        height: "600px",
        background: "radial-gradient(circle, rgba(78, 115, 223, 0.08) 0%, rgba(28, 200, 138, 0.05) 100%)",
        borderRadius: "50%",
        top: "-200px",
        left: "-100px",
        zIndex: 1
      }}></div>

      <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: "440px", padding: "20px" }}>
        
        {/* APP BRANDING */}
        <div style={{ textAlign: "center", marginBottom: "45px" }}>
          <h1 style={{ 
            color: "#1e293b", 
            margin: 0, 
            fontSize: "44px", 
            fontWeight: 900, 
            letterSpacing: "-1.5px"
          }}>
            TO_DO <span style={{ color: "#4e73df" }}>APP</span>
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

        {/* LOGIN CARD */}
        <div style={{
          background: "white",
          padding: "50px 45px",
          borderRadius: "32px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.08)",
          border: "1px solid #f1f5f9"
        }}>
          <div style={{ marginBottom: "25px" }}>
            <label style={{ display: "block", color: "#475569", fontSize: "13px", fontWeight: "700", marginBottom: "10px" }}>
              Username
            </label>
            <input
              placeholder="name@company"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                padding: "16px 20px",
                borderRadius: "16px",
                border: "2px solid #f1f5f9",
                background: "#f8fafc",
                color: "#1e293b",
                fontSize: "15px",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.2s"
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = "#4e73df"}
              onBlur={(e) => e.currentTarget.style.borderColor = "#f1f5f9"}
            />
          </div>

          <div style={{ marginBottom: "35px" }}>
            <label style={{ display: "block", color: "#475569", fontSize: "13px", fontWeight: "700", marginBottom: "10px" }}>
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "16px 20px",
                borderRadius: "16px",
                border: "2px solid #f1f5f9",
                background: "#f8fafc",
                color: "#1e293b",
                fontSize: "15px",
                outline: "none",
                boxSizing: "border-box"
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = "#4e73df"}
              onBlur={(e) => e.currentTarget.style.borderColor = "#f1f5f9"}
            />
          </div>

          <button 
            onClick={handleLogin}
            style={{
              width: "100%",
              padding: "18px",
              borderRadius: "16px",
              border: "none",
              background: "#4e73df",
              color: "white",
              fontWeight: "800",
              fontSize: "16px",
              cursor: "pointer",
              boxShadow: "0 10px 25px -5px rgba(78, 115, 223, 0.4)",
              transition: "transform 0.2s, background 0.2s"
            }}
            onMouseOver={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.background = "#3e63cf";
            }}
            onMouseOut={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.background = "#4e73df";
            }}
          >
            LOGIN
          </button>

          <div style={{ marginTop: "30px", textAlign: "center" }}>
            <span style={{ color: "#64748b", fontSize: "14px", fontWeight: "500" }}>New to the platform?</span>
            <span 
              onClick={() => navigate("/signup")}
              style={{ color: "#4e73df", fontSize: "14px", fontWeight: "800", cursor: "pointer", marginLeft: "8px" }}
            >
              Create Account
            </span>
          </div>
        </div>
        
        <p style={{ textAlign: "center", color: "#94a3b8", fontSize: "12px", marginTop: "40px", fontWeight: "600" }}>
            SECURE ACCESS • ENCRYPTED END-TO-END
        </p>
      </div>
    </div>
  );
}