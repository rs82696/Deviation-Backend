import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

const API_BASE = "http://127.0.0.1:5000";
//const API_BASE ="https://deviation-backend-z706.onrender.com";

export default function PendingIncidents() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const navigate = useNavigate();
  const department = localStorage.getItem("department") || "";

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/incidents/pending-by-department/${encodeURIComponent(department)}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
        setError("Failed to load pending incidents.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [department]);

  const openIncident = (row) => {
    localStorage.setItem("incident_id", row.incident_id);
    localStorage.removeItem("view_only"); // ✅ editable
    navigate(row.next_step || "/general-info");
  };

  const filteredRows = useMemo(() => {
    const q = search.toLowerCase();

    return rows.filter((r) => {
      return (
        (r.incident_id || "").toLowerCase().includes(q) ||
        (r.title || "").toLowerCase().includes(q) ||
        (r.created_by_department || "").toLowerCase().includes(q) ||
        (r.assigned_to_department || "").toLowerCase().includes(q) ||
        (r.status || "").toLowerCase().includes(q)
      );
    });
  }, [rows, search]);

  return (
    <>
      <Navbar disableTabs={true} />

      <style>{`
        .pi-page {
          max-width: 1200px;
          margin: 30px auto;
          padding: 0 16px;
        }

        .pi-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 18px;
        }

        .pi-search {
          width: 420px;
          padding: 12px 16px;
          border-radius: 12px;
          border: 1px solid #d1d5db;
        }

        .pi-card {
          background: #ffffff;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
          border-radius: 12px;
          overflow: hidden;
        }

        .pi-card table {
          width: 100%;
          border-collapse: collapse;
        }

        .pi-card thead {
          background: #2563eb;
          color: #ffffff;
        }

        .pi-card th, .pi-card td {
          padding: 12px 14px;
          text-align: left;
        }

        .pi-card tbody tr:nth-child(even) {
          background: #f9fafb;
        }

        .pi-card tbody tr:hover {
          background: #eef2ff;
        }

        .pi-btn {
          padding: 7px 14px;
          border-radius: 8px;
          border: none;
          background-color: #2563eb;
          color: white;
          cursor: pointer;
        }

        .pi-footer {
          margin-top: 18px;
        }

        .pi-back-btn {
          padding: 10px 18px;
          border-radius: 999px;
          border: none;
          background-color: #2563eb;
          color: white;
          font-weight: 700;
          cursor: pointer;
        }
      `}</style>

      <div className="pi-page">
        <div className="pi-header">
          <h2>Pending Incidents</h2>
          <input
            className="pi-search"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading && <p>Loading…</p>}
        {error && <p style={{ color: "red" }}>{error}</p>}
        {!loading && !filteredRows.length && !error && <p>No pending incidents</p>}

        {!!filteredRows.length && (
          <div className="pi-card">
            <table>
              <thead>
                <tr>
                  <th>Incident ID</th>
                  <th>Title</th>
                  <th>Created By</th>
                  <th>Assigned To</th>
                  <th>Created</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.incident_id}>
                    <td>{row.incident_id}</td>
                    <td>{row.title || "—"}</td>
                    <td>{row.created_by_department || "—"}</td>
                    <td>{row.assigned_to_department || "—"}</td>
                    <td>
                      {row.created_at
                        ? new Date(row.created_at).toLocaleString()
                        : "—"}
                    </td>
                    <td>{row.status}</td>
                    <td>
                      <button
                        className="pi-btn"
                        onClick={() => openIncident(row)}
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="pi-footer">
          <button className="pi-back-btn" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </button>
        </div>
      </div>
    </>
  );
}