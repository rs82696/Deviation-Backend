// src/pages/ActionRequired.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

const API_BASE = "http://127.0.0.1:5000";
//const API_BASE ="https://deviation-backend-z706.onrender.com";

export default function ActionRequired() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  const department = localStorage.getItem("department") || "";

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/incidents/action-required-by-department/${encodeURIComponent(department)}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
        setError("Failed to load action required incidents.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [department]);

  const openIncident = (row) => {
    localStorage.setItem("incident_id", row.incident_id);
    localStorage.removeItem("view_only");
    navigate(row.next_step || "/review");
  };

  const filteredRows = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return rows;

    return rows.filter((r) => {
      const hay = `${r.incident_id || ""} ${r.title || ""} ${r.created_by_department || ""} ${r.assigned_to_department || ""} ${r.status || ""}`.toLowerCase();
      return hay.includes(query);
    });
  }, [rows, q]);

  const styles = {
    pageWrap: { maxWidth: 1300, margin: "30px auto", padding: "0 16px" },

    headerRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 18,
      gap: 12,
    },

    searchInput: {
      width: 460,
      padding: "12px 16px",
      borderRadius: 12,
      border: "1px solid #d1d5db",
      outline: "none",
      fontSize: 14,
      background: "#fff",
    },

    card: {
      width: "100%",
      borderCollapse: "collapse",
      background: "#fff",
      boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
      borderRadius: 12,
      overflow: "hidden",
    },

    th: {
      padding: "12px 14px",
      textAlign: "left",
      fontSize: 13,
      borderBottom: "1px solid #e5e7eb",
      background: "#f3f4f6",
      color: "#111827",
      fontWeight: 700,
      letterSpacing: "0.02em",
    },

    td: {
      padding: "12px 14px",
      fontSize: 14,
      borderBottom: "1px solid #f3f4f6",
      color: "#111827",
      verticalAlign: "top",
    },

    pill: {
      display: "inline-block",
      padding: "4px 10px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 700,
      background: "#f59e0b",
      color: "#fff",
    },

    btn: {
      padding: "7px 12px",
      borderRadius: 8,
      border: "none",
      background: "#2563eb",
      color: "#fff",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 700,
    },

    backBtn: {
      marginTop: 18,
      padding: "10px 18px",
      borderRadius: 999,
      border: "none",
      background: "#2563eb",
      color: "#ffffff",
      fontWeight: 700,
      cursor: "pointer",
      boxShadow: "0 8px 18px rgba(37, 99, 235, 0.25)",
    },
  };

  return (
    <>
      <Navbar disableTabs={true} />

      <div style={styles.pageWrap}>
        <div style={styles.headerRow}>
          <h2 style={{ margin: 0 }}>Action Required Incidents</h2>

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by Incident ID / Title / Created By / Assigned To"
            style={styles.searchInput}
          />
        </div>

        {loading && <p>Loading…</p>}
        {error && <p style={{ color: "red" }}>{error}</p>}
        {!loading && !filteredRows.length && !error && <p>No action required incidents.</p>}

        {!!filteredRows.length && (
          <table style={styles.card}>
            <thead>
              <tr>
                <th style={styles.th}>Incident ID</th>
                <th style={styles.th}>Title</th>
                <th style={styles.th}>Created By</th>
                <th style={styles.th}>Assigned To</th>
                <th style={styles.th}>Created</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.incident_id}>
                  <td style={styles.td}>{row.incident_id}</td>
                  <td style={styles.td}>{row.title || "—"}</td>
                  <td style={styles.td}>{row.created_by_department || "—"}</td>
                  <td style={styles.td}>{row.assigned_to_department || "—"}</td>
                  <td style={styles.td}>
                    {row.created_at ? new Date(row.created_at).toLocaleString() : "—"}
                  </td>
                  <td style={styles.td}>
                    <span style={styles.pill}>ACTION REQUIRED</span>
                  </td>
                  <td style={styles.td}>
                    <button style={styles.btn} onClick={() => openIncident(row)}>
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <button style={styles.backBtn} onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </button>
      </div>
    </>
  );
}