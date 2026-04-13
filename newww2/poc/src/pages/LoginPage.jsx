import { useNavigate } from "react-router-dom";
import { useState } from "react";
import "./LoginPage.css";
import loginImage from "../assets/LoginImage.jpg";

//const API_BASE = "http://127.0.0.1:5000";
const API_BASE = "https://deviation-backend-z706.onrender.com";

const LoginPage = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
/*
  const handleLogin = async () => {
    if (!username || !password) {
      alert("Please enter username and password");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Invalid username or password");
        return;
      }

      localStorage.setItem("user_id", data.user_id || "");
      localStorage.setItem("username", data.username || "");
      localStorage.setItem("department", data.department || "");
      localStorage.setItem("roles", JSON.stringify(data.roles || []));

      localStorage.removeItem("view_only");
      localStorage.removeItem("incident_id");

      navigate("/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      alert("Login failed. Please check backend connection.");
    } finally {
      setLoading(false);
    }
  };*/
  

  const handleLogin = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Invalid username or password");
        return;
      }

      localStorage.setItem("user_id", data.user_id);
      localStorage.setItem("username", data.username);
      localStorage.setItem("department", data.department);
      localStorage.setItem("roles", JSON.stringify(data.roles || []));

      navigate("/dashboard");
    } catch (error) {
      console.error(error);
      alert("Login failed. Please try again.");
    }
  };

  return (
    <div className="login-container">
      <div className="login-wrapper">
        <div className="login-image">
          <img src={loginImage} alt="Login Illustration" />
        </div>

        <div className="login-box">
          <h2>Login</h2>

          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
          
          <button
            onClick={() => navigate("/register")}
            style={{
              marginTop: "10px",
              marginBottom: "10px",
              backgroundColor: "#f3f4f6",
              color: "#111827",
              border: "1px solid #d1d5db",
            }}
          >
            Sign Up
          </button>
              
              <button onClick={handleLogin} disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;