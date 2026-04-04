import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

//const API_BASE = "http://127.0.0.1:5000";
const API_BASE ="https://deviation-backend-z706.onrender.com";

export default function AssignedToDepartment() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const department = localStorage.getItem("department") || "";
  const username = localStorage.getItem("username") || "";

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `${API_BASE}/api/incidents/assigned-to-department/${encodeURIComponent(department)}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setError("Failed to load incidents.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [department]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      return (
        (r.incident_id || "").toLowerCase().includes(s) ||
        (r.title || "").toLowerCase().includes(s) ||
        (r.raised_by_department || "").toLowerCase().includes(s) ||
        (r.department_decision_status || "").toLowerCase().includes(s)
      );
    });
  }, [rows, q]);
  
  const openIncident = (row) => {
    localStorage.setItem("incident_id", row.incident_id);
    localStorage.setItem("view_only", "true");
    navigate(row.next_step || "/general-info");
  };
  const handleReview = async (row) => {
    try {
      const res = await fetch(
        `${API_BASE}/api/incidents/${row.incident_id}/department-decision`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            department,
            decision_status: "under_review",
            decision_by: username,
          }),
        }
      );

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      localStorage.setItem("incident_id", row.incident_id);
      localStorage.removeItem("view_only");
      navigate(row.next_step || "/general-info");
    } catch (e) {
      console.error(e);
      alert("Failed to mark incident under review.");
    }
  };

  const handleApprove = async (row) => {
    try {
      const confirmApprove = window.confirm(
        "Are you sure you want to APPROVE this incident?"
      );
      if (!confirmApprove) return;

      const res = await fetch(
        `${API_BASE}/api/incidents/${row.incident_id}/department-decision`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            department,
            decision_status: "approved",
            decision_by: username,
          }),
        }
      );

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      await load();
    } catch (e) {
      console.error(e);
      alert("Failed to approve incident.");
    }
  };

  const handleReject = async (row) => {
    try {
      const confirmReject = window.confirm(
        "Are you sure you want to REJECT this incident?"
      );
      if (!confirmReject) return;

      const res = await fetch(
        `${API_BASE}/api/incidents/${row.incident_id}/department-decision`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            department,
            decision_status: "rejected",
            decision_by: username,
          }),
        }
      );

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      await load();
    } catch (e) {
      console.error(e);
      alert("Failed to reject incident.");
    }
  };

  const th = {
    padding: "12px 14px",
    textAlign: "left",
    fontSize: "14px",
    background: "#0b5ed7",
    color: "#fff",
    borderBottom: "1px solid #0a58ca",
  };

  const td = {
    padding: "12px 14px",
    fontSize: "14px",
    borderBottom: "1px solid #eef2f7",
    background: "#fff",
    verticalAlign: "top",
  };

  const btn = {
    padding: "7px 12px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 700,
    color: "#fff",
  };

  const pill = (status) => {
    const s = String(status || "").toUpperCase();
    const base = {
      display: "inline-block",
      padding: "4px 10px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 700,
      textTransform: "capitalize",
    };

    if (s === "APPROVED") return { ...base, background: "#dcfce7", color: "#166534" };
    if (s === "REJECTED") return { ...base, background: "#fee2e2", color: "#991b1b" };
    if (s === "UNDER_REVIEW") return { ...base, background: "#e0f2fe", color: "#075985" };
    if (s === "PENDING") return { ...base, background: "#fef9c3", color: "#854d0e" };
    return { ...base, background: "#e5e7eb", color: "#374151" };
  };

  return (
    <>
      <Navbar disableTabs={true} />

      <div style={{ maxWidth: 1200, margin: "26px auto", padding: "0 16px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <h2 style={{ margin: 0 }}>Incidents Assigned to My Department</h2>

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by Incident ID / Title / Created By / My Decision"
            style={{
              width: 440,
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #d1d5db",
              outline: "none",
            }}
          />
        </div>

        <div style={{ marginTop: 16 }}>
          {loading && <p>Loading…</p>}
          {error && <p style={{ color: "red" }}>{error}</p>}
          {!loading && !filtered.length && !error && <p>No incidents found.</p>}

          {!!filtered.length && (
            <div
              style={{
                marginTop: 14,
                borderRadius: 12,
                overflow: "hidden",
                boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={th}>Incident ID</th>
                    <th style={th}>Title</th>
                    <th style={th}>Created By</th>
                    <th style={th}>Created</th>
                    <th style={th}>My Decision</th>
                    <th style={th}>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((row) => (
                    <tr key={row.incident_id}>
                      <td style={td}>
                      <span
                          onClick={() => openIncident(row)}
                          style={{
                            color: "#2563eb",
                            cursor: "pointer",
                            fontWeight: 600,
                            textDecoration: "underline",
                          }}
                          title="Open incident in view-only mode"
                        >
                          {row.incident_id}
                        </span>
                      </td>
                      <td style={td}>{row.title || "—"}</td>
                      <td style={td}>{row.raised_by_department || "—"}</td>
                      <td style={td}>
                        {row.created_at ? new Date(row.created_at).toLocaleString() : "—"}
                      </td>

                      <td style={td}>
                        <span style={pill(row.department_decision_status)}>
                          {row.department_decision_status || "—"}
                        </span>
                      </td>

                      <td style={td}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button
                            style={{ ...btn, background: "#2563eb" }}
                            onClick={() => handleReview(row)}
                          >
                            Review
                          </button>

                          <button
                            style={{ ...btn, background: "#16a34a" }}
                            onClick={() => handleApprove(row)}
                          >
                            Approve
                          </button>

                          <button
                            style={{ ...btn, background: "#dc2626" }}
                            onClick={() => handleReject(row)}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <button
              onClick={() => navigate("/dashboard")}
              style={{
                padding: "10px 16px",
                borderRadius: 999,
                border: "none",
                background: "#2563eb",
                color: "#ffffff",
                cursor: "pointer",
                fontWeight: 700,
                boxShadow: "0 6px 14px rgba(37, 99, 235, 0.35)",
              }}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </>
  );
}