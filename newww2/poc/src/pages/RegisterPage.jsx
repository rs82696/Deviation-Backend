import { useNavigate } from "react-router-dom";
import { useState } from "react";
import "./LoginPage.css";
import img from "../assets/LoginImage.jpg";

//const API_BASE = "http://127.0.0.1:5000";
const API_BASE = "https://deviation-backend-z706.onrender.com";

const RegisterPage = () => {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState("Originator");

  const handleRegister = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
          department,
          role,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Registration failed");
        return;
      }

      alert("User registered successfully!");
      navigate("/");
    } catch (error) {
      console.error(error);
      alert("Registration failed. Please try again.");
    }
  };
  
  return (
    <div className="login-container">
  <div className="login-wrapper">
    <div className="login-image">
      <img src={img} alt="register" />
    </div>

    {/* FORM */}
    <div className="login-box">
      <h2>Register</h2>

      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <select
        value={department}
        onChange={(e) => setDepartment(e.target.value)}
      >
        <option value="">Select Department</option>
        <option value="Customer">Customer</option>
        <option value="Quality Assurance">Quality Assurance</option>
        <option value="Warehouse">Warehouse</option>
        <option value="Regulatory Affairs">Regulatory Affairs</option>
        <option value="Production Orals">Production Orals</option>
        <option value="Microbiology">Microbiology</option>
        <option value="Personnel and administration">Personnel and administration</option>
        <option value="Quality Control">Quality Control</option>
      </select>

      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
      >
        <option value="Originator">Originator</option>
        <option value="Reviewer">Reviewer</option>
        <option value="Approver">Approver</option>
      </select>

      <button onClick={handleRegister}>Register</button>

      <button
        onClick={() => navigate("/")}
        className="secondary-btn"
      >
        Back to Login
      </button>
    </div>
  </div>
</div>
  );
};

export default RegisterPage;