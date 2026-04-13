// src/pages/GeneralInfo.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

//const API_BASE = "http://127.0.0.1:5000";
const API_BASE = "https://deviation-backend-z706.onrender.com";

//console.log("GeneralInfo viewOnly =", viewOnly);

export default function GeneralInfo() {
  const viewOnly = localStorage.getItem("view_only") === "true"; 
  const navigate = useNavigate();
  const incidentId = localStorage.getItem("incident_id") || "";

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + 60);

  const [mongoId, setMongoId] = useState(null);

  const [fields, setFields] = useState({
    Originator: "",
    Supervisor: "",
    "Quality Approver": "",
    "Quality Reviewer": "",
    "Date Opened": formatDate(today),
    "Original Date Due": formatDate(futureDate),
    "Date Due": formatDate(futureDate),
    Title: "",
  });

  const [description, setDescription] = useState("");

  // 🔹 Load previously saved General Info (if any)
  useEffect(() => {
    document.title = "General Information";

    if (!incidentId) return;

    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/general/${incidentId}`);
        if (!res.ok) {
          // It's fine if nothing exists yet
          return;
        }
        const data = await res.json();

        setFields({
          Originator: data.originator || "",
          Supervisor: data.supervisor_manager || "",
          "Quality Approver": data.quality_approver || "",
          "Quality Reviewer": data.quality_reviewer || "",
          "Date Opened": data.date_opened || formatDate(today),
          "Original Date Due": data.original_date_due || formatDate(futureDate),
          "Date Due": data.date_due || formatDate(futureDate),
          Title: data.title || "",
        });

        //NEW
        if (data.title) {
          localStorage.setItem("incident_title", data.title);
        }

        setDescription(data.description || "");
        setMongoId(data._id || null);
      } catch (err) {
        console.error("Error loading general info:", err);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidentId]);

  const handleChange = (key, value) => {
    setFields((prev) => ({ ...prev, [key]: value }));

    // NEW: save title globally
    if (key === "Title") {
      localStorage.setItem("incident_title", value);
    }

    // Optional: if description empty, seed it with title
    if (key === "Title") {
      setDescription(value);
    }
  };

  const handleSave = async () => {
    if (!incidentId) {
      alert("Incident ID missing. Please start from Department page.");
      return false;
    }

    const batchNoMatch = fields.Title.match(/Batch No:\s*(B\d+)/i);
    const BatchNo = batchNoMatch ? batchNoMatch[1] : "N/A";

    const payload = {
      incident_id: incidentId,
      ...fields,
      Description: description || "",
      BatchNo,
      mongo_id: mongoId,
    };

    try {
      const response = await fetch(`${API_BASE}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();
      console.log("✅ General info saved:", result);

      if (result.mongo_id) {
        setMongoId(result.mongo_id);
      }
      return true;
    } catch (error) {
      console.error("Save failed:", error);
      alert("Failed to save General Information. Check backend logs.");
      return false;
    }
  };

  return (
    <>
      <Navbar activeTab={0} />

      {/* Local styles so the page always looks the same */}
      <style>{`
        body {
          margin: 0;
          font-family: "Segoe UI", Roboto, Arial, sans-serif;
          background-color: #f4f6fa;
        }

        .gi-content {
          max-width: 1100px;
          margin: 24px auto 40px;
          padding: 28px 32px 32px;
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
        }

        .gi-incident {
          font-weight: 600;
          margin-bottom: 12px;
        }

        .gi-title {
          font-size: 24px;
          text-align: center;
          margin: 8px 0 24px;
          color: #111827;
          font-weight: 600;
        }

        .gi-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .gi-row {
          display: flex;
          flex-direction: column;
        }

        .gi-label {
          font-size: 14px;
          font-weight: 600;
          color: #4b5563;
          margin-bottom: 4px;
        }

        .gi-input {
          width: 100%;
          padding: 10px 12px;
          border-radius: 6px;
          border: 1px solid #d1d5db;
          font-size: 15px;
          box-sizing: border-box;
        }

        .gi-input:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
        }

        .gi-desc-title {
          margin-top: 24px;
          font-size: 18px;
          font-weight: 600;
          color: #111827;
        }

        .gi-desc {
          width: 100%;
          min-height: 130px;
          margin-top: 8px;
          padding: 10px 12px;
          border-radius: 6px;
          border: 1px solid #d1d5db;
          font-size: 15px;
          box-sizing: border-box;
          resize: vertical;
        }

        .gi-desc:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
        }

        .gi-buttons {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 26px;
        }

        .btn {
          padding: 10px 20px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          color: #ffffff;
        }

        .btn-save {
          background-color: #16a34a;
        }
        .btn-save:hover {
          background-color: #15803d;
        }

        .btn-save-exit {
          background-color: #2563eb;
        }
        .btn-save-exit:hover {
          background-color: #1d4ed8;
        }

        .btn-exit {
          background-color: #6b7280;
        }
        .btn-exit:hover {
          background-color: #4b5563;
        }
      `}</style>
      <main className="gi-content">
        {incidentId && (
          <div className="gi-incident">Incident ID: {incidentId}</div>
        )}

        <h2 className="gi-title">General Information</h2>

        <div className="gi-grid">
          {Object.entries(fields).map(([label, value]) => (
            <div className="gi-row" key={label}>
              <div className="gi-label">{label}</div>
              <input
                className="gi-input"
                type={label.includes("Date") ? "date" : "text"}
                value={value}
                onChange={(e) => handleChange(label, e.target.value)}
                disabled={viewOnly}
              />
            </div>
          ))}
        </div>

        <h3 className="gi-desc-title">Description</h3>
        <textarea
          className="gi-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={viewOnly}
        />

        <div className="gi-buttons">
          <button
            className="btn btn-exit"
            //disabled={viewOnly}
            onClick={() => {
              // ✅ CLEAR CURRENT INCIDENT DATA
              localStorage.removeItem("incident_title");
              localStorage.removeItem("incident_id");
              navigate("/department");

            }}
          >
            Back
          </button>
          <button
            className="btn btn-save"
            //disabled={viewOnly}
            onClick={async () => {
              const ok = await handleSave();
              if (!ok) return;
              navigate("/deviation");
            }}
          >
            Next
          </button>

          <button
            className="btn btn-save-exit"
            //disabled={viewOnly}
            onClick={async () => {
              const ok = await handleSave();
              if (!ok) return;

              // ✅ CLEAR OLD INCIDENT DATA
              localStorage.removeItem("incident_title");
              localStorage.removeItem("incident_id");

              navigate("/dashboard");
            }}
          >
            Save & Exit
          </button>
        </div>
      </main>
    </>
  );
}
