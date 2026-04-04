//import React from "react";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

//const API_BASE = "http://127.0.0.1:5000";
const API_BASE ="https://deviation-backend-z706.onrender.com";

const IncidentDashboard = () => {
  const navigate = useNavigate();
  const userDepartment = localStorage.getItem("department") || "";
  //console.log("Logged in department:", userDepartment);
  const [userDeptStats, setUserDeptStats] = useState({ total: 0, open: 0 });
  const [otherDeptStats, setOtherDeptStats] = useState({ total: 0, open: 0 });
  const handleCreateNewIncident = () => {
  localStorage.removeItem("view_only");
  localStorage.removeItem("incident_id");
  navigate("/department");
};
  const handleViewIncidents = () => navigate("/incidents"); // adjust if your route is different
  const handleViewPending = () => navigate("/pending");
  const handleViewRejected = () => navigate("/rejected");
  const handleActionRequiredCardClick = () => navigate("/action-required"); // card click
  const handleRaisedByMyDept = () => navigate("/raised-by-department");
  const handleAssignedToMyDept = () => navigate("/assigned-to-department");
useEffect(() => {
    const fetchStats = async () => {
      try {
        const dept = localStorage.getItem("department") || "";
        if (!dept) return;

        const [userRes, otherRes] = await Promise.all([
          fetch(`${API_BASE}/api/incidents/by-user-department/${encodeURIComponent(dept)}`),
          fetch(`${API_BASE}/api/incidents/by-other-department/${encodeURIComponent(dept)}`),
        ]);

        const userData = await userRes.json();
        const otherData = await otherRes.json();

        if (userRes.ok) {
          setUserDeptStats({
            total: userData.total || 0,
            open: userData.open || 0,
          });
        }

        if (otherRes.ok) {
          setOtherDeptStats({
            total: otherData.total || 0,
            open: otherData.open || 0,
          });
        }
      } catch (err) {
        console.error("Error loading dashboard stats:", err);
      }
    };

    fetchStats();
  }, []);
  return (
    <div style={styles.page}>
      <Navbar disableTabs={true} />

      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>Incident Management Dashboard</h1>
          <p style={styles.subtitle}></p>
        </div>

        {/* Main Action Buttons */}
        <div style={styles.actionSection}>
          <button
            style={{ ...styles.button, ...styles.primaryButton }}
            onClick={handleCreateNewIncident}
          >
            + Create New Incident
          </button>

          <button style={styles.button} onClick={handleViewIncidents}>
            View Incidents
          </button>

          <button style={styles.button} onClick={handleViewPending}>
            View Pending Incidents
          </button>
          <button style={styles.button } onClick={handleViewRejected}>
            View Rejected Incidents
          </button>

          {/* ❌ REMOVED: Action Required button from here */}
        </div>

        {/* Dashboard Boxes */}
        <div style={styles.overviewGrid}>
          <DashboardBox
            title="Action Required"
            content="Pending review incidents"
            color="#dc3545"
            onClick={handleActionRequiredCardClick}  // ✅ only Action Required entry now
          />

            <DashboardBox
            title="Incidents Raised by My Department"
            content={`Total: ${userDeptStats.total} | Open: ${userDeptStats.open}`}
            color="#007bff"
            onClick={handleRaisedByMyDept}
          />
            <DashboardBox
            title="Incidents Assigned to My Department"
            content={`Total: ${otherDeptStats.total} | Open: ${otherDeptStats.open}`}
            color="#ffc107"
            onClick={handleAssignedToMyDept}
          />
        </div>
      </div>
    </div>
  );
};

// Small Card Component
const DashboardBox = ({ title, content, color, onClick }) => (
  <div
    style={{
      ...styles.box,
      borderTop: `4px solid ${color}`,
      cursor: onClick ? "pointer" : "default",
    }}
    onClick={onClick}
  >
    <h3 style={styles.boxTitle}>{title}</h3>
    <p style={styles.boxContent}>{content}</p>
  </div>
);

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f5f7fb 0%, #e4ecf7 100%)",
  },
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "30px 40px 60px",
  },
  header: {
    textAlign: "center",
    marginTop: "10px",
    marginBottom: "30px",
  },
  title: {
    margin: 0,
    color: "#1f2933",
    fontSize: "32px",
    fontWeight: 700,
    letterSpacing: "0.03em",
  },
  subtitle: {
    marginTop: "10px",
    fontSize: "15px",
    color: "#6b7280",
  },
  actionSection: {
    display: "flex",
    justifyContent: "center",
    gap: "18px",
    marginBottom: "40px",
    flexWrap: "wrap",
  },
  button: {
    padding: "12px 24px",
    fontSize: "15px",
    borderRadius: "999px",
    border: "1px solid #d1d5db",
    backgroundColor: "#ffffff",
    color: "#374151",
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 4px 10px rgba(0,0,0,0.04)",
    transition:
      "transform 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease",
  },
  primaryButton: {
    backgroundColor: "#2563eb",
    color: "#ffffff",
    border: "none",
    boxShadow: "0 8px 18px rgba(37, 99, 235, 0.35)",
  },
  greyButton: {
    backgroundColor: "#6b7280",
    color: "#ffffff",
    border: "none",
    boxShadow: "0 8px 18px rgba(107, 114, 128, 0.28)",
  },
  overviewGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "24px",
  },
  box: {
    backgroundColor: "#ffffff",
    padding: "22px 24px",
    borderRadius: "16px",
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
    transition: "transform 0.15s ease, box-shadow 0.15s ease",
  },
  boxTitle: {
    fontSize: "18px",
    marginBottom: "10px",
    color: "#111827",
    fontWeight: 600,
  },
  boxContent: {
    fontSize: "15px",
    fontWeight: 500,
    color: "#4b5563",
  },
};

export default IncidentDashboard;
