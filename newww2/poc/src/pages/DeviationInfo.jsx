// src/pages/DeviationInfo.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "../components/Navbar.css";

const API_BASE = "http://127.0.0.1:5000";
//const API_BASE = "https://deviation-backend-z706.onrender.com";

export default function DeviationInfo() {
  const viewOnly = localStorage.getItem("view_only") === "true";
  const navigate = useNavigate();
  const incidentId = localStorage.getItem("incident_id") || "";
  const storageKey = incidentId ? `deviation_${incidentId}` : null;

  const [deviationData, setDeviationData] = useState({
    title: "",
    description: "",
    standard: "",
    standardNotApplicable: false,
    immediateAction: "",
    immediateActionNotApplicable: false,
    reviewerRemarks: "",
  });

  useEffect(() => {
    document.title = "Deviation Info";
  }, []);

  // 1) Restore from localStorage
  useEffect(() => {
    if (!storageKey) return;
    const raw = localStorage.getItem(storageKey);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw);
      setDeviationData((prev) => ({ ...prev, ...saved }));
    } catch (e) {
      console.error("Failed to restore Deviation data", e);
    }
  }, [storageKey]);

  // 2) Try to load from backend (overrides localStorage if exists)
  useEffect(() => {
    if (!incidentId) return;

    const loadFromBackend = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/deviation/${incidentId}`);
        if (!res.ok) {
          // 404 just means nothing saved yet
          if (res.status !== 404) {
            console.error("Error loading deviation from backend:", res.status);
          }
          return;
        }
        const d = await res.json();
        setDeviationData({
          title: d.title || "",
          description: d.description || "",
          standard: d.standard || "",
          standardNotApplicable: !!d.standard_na,
          immediateAction: d.immediate_action || "",
          immediateActionNotApplicable: !!d.immediate_action_na,
          reviewerRemarks: d.reviewer_remarks || "",
        });
      } catch (err) {
        console.error("Failed to load deviation from backend:", err);
      }
    };

    loadFromBackend();
  }, [incidentId]);

  const persistToLocal = () => {
    if (!storageKey) return;
    localStorage.setItem(storageKey, JSON.stringify(deviationData));
  };

  const handleChange = (key, value) => {
    setDeviationData((prev) => ({ ...prev, [key]: value }));
  };

  const handleCheckbox = (key) => {
    setDeviationData((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // 🔹 Save to backend MongoDB
  const saveToBackend = async () => {
    if (!incidentId) {
      alert("Incident ID missing. Please start from Department page.");
      return false;
    }

    const payload = {
      incident_id: incidentId,
      title: deviationData.title,
      description: deviationData.description,
      standard: deviationData.standard,
      standard_na: deviationData.standardNotApplicable,
      immediate_action: deviationData.immediateAction,
      immediate_action_na: deviationData.immediateActionNotApplicable,
      reviewer_remarks: deviationData.reviewerRemarks,
    };

    try {
      const res = await fetch(`${API_BASE}/api/deviation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Backend error: ${res.status}`);
      }

      const data = await res.json();
      console.log("✅ Deviation saved to backend:", data);
      return true;
    } catch (err) {
      console.error("Failed to save deviation to backend:", err);
      alert("Failed to save Deviation Information. Check backend logs.");
      return false;
    }
  };

  const handleSaveAndGo = async (targetPath) => {
    persistToLocal();
    const ok = await saveToBackend();
    if (!ok) return;
    if (targetPath) navigate(targetPath);
  };

  const handleExitOnly = () => navigate("/general-info");

  return (
    <>
      <Navbar activeTab={1} />

      <style>{`
          body {
            font-family: 'Segoe UI', Roboto, Arial, sans-serif;
            background-color: #eef2f6;
            margin: 0;
            padding: 0;
          }

          .content {
            max-width: 850px;
            margin: 30px auto;
            padding: 40px 45px;
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
            transition: all 0.3s ease;
          }

          .section-title {
            font-size: 24px;
            color: #1f2937;
            border-bottom: 3px solid #007bff;
            padding-bottom: 10px;
            margin-bottom: 30px;
            text-align: center;
            font-weight: 600;
            letter-spacing: 0.5px;
          }

          .form-group { margin-bottom: 25px; }

          .form-label {
            font-weight: 600;
            color: #374151;
            margin-bottom: 8px;
            display: block;
            font-size: 15px;
          }

          .form-input,
          .form-textarea {
            width: 100%;
            padding: 12px 14px;
            font-size: 15px;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            background-color: #f9fafb;
            transition: border-color 0.3s, box-shadow 0.3s;
          }

          .form-input:focus,
          .form-textarea:focus {
            outline: none;
            border-color: #007bff;
            box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
            background-color: #ffffff;
          }

          .form-textarea {
            min-height: 100px;
            resize: vertical;
          }

          .checkbox-group {
            margin-top: 10px;
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 14px;
          }

          .checkbox-group input {
            width: 16px;
            height: 16px;
            cursor: pointer;
          }

          .btn-container {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            margin-top: 30px;
          }

          .btn {
            padding: 10px 22px;
            font-weight: 600;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            color: #ffffff;
            font-size: 15px;
            transition: background-color 0.3s ease, transform 0.2s ease;
          }

          .btn:hover {
            transform: translateY(-2px);
          }

          .btn-save { background-color: #10b981; }
          .btn-save:hover { background-color: #059669; }

          .btn-save-exit { background-color: #3b82f6; }
          .btn-save-exit:hover { background-color: #2563eb; }

          .btn-exit { background-color: #6b7280; }
          .btn-exit:hover { background-color: #4b5563; }
        `}</style>

      <main className="content">
        {incidentId && (
          <div style={{ marginBottom: 10, fontWeight: 600 }}>
            Incident ID: {incidentId}
          </div>
        )}

        <h2 className="section-title">Deviation Information</h2>

        {/* Title */}
        <div className="form-group">
          <label className="form-label">Title</label>
          <input
            type="text"
            className="form-input"
            value={deviationData.title}
            onChange={(e) => handleChange("title", e.target.value)}
            disabled={viewOnly}
          />
        </div>

        {/* Description */}
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea
            className="form-textarea"
            value={deviationData.description}
            onChange={(e) => handleChange("description", e.target.value)}
            disabled={viewOnly}
          ></textarea>
        </div>

        {/* Standard */}
        <div className="form-group">
          <label className="form-label">Standard</label>
          <textarea
            className="form-textarea"
            value={deviationData.standard}
            onChange={(e) => handleChange("standard", e.target.value)}
            disabled={deviationData.standardNotApplicable || viewOnly}
          ></textarea>
          <div className="checkbox-group">
            <input
              type="checkbox"
              id="standardNotApplicable"
              checked={deviationData.standardNotApplicable}
              onChange={() => handleCheckbox("standardNotApplicable")}
              disabled = {viewOnly}
            />
            <label htmlFor="standardNotApplicable">Not Applicable</label>
          </div>
        </div>

        {/* Immediate Action */}
        <div className="form-group">
          <label className="form-label">Immediate Action (if any)</label>
          <textarea
            className="form-textarea"
            value={deviationData.immediateAction}
            onChange={(e) => handleChange("immediateAction", e.target.value)}
            disabled={deviationData.immediateActionNotApplicable || viewOnly}
          ></textarea>
          <div className="checkbox-group">
            <input
              type="checkbox"
              id="immediateActionNotApplicable"
              checked={deviationData.immediateActionNotApplicable}
              onChange={() =>
                handleCheckbox("immediateActionNotApplicable")
              }
              disabled = {viewOnly}
            />
            <label htmlFor="immediateActionNotApplicable">Not Applicable</label>
          </div>
        </div>

        {/* Reviewer Remarks */}
        <div className="form-group">
          <label className="form-label">Remarks by Reviewer</label>
          <textarea
            className="form-textarea"
            value={deviationData.reviewerRemarks}
            onChange={(e) => handleChange("reviewerRemarks", e.target.value)}
            disabled = {viewOnly}
          ></textarea>
        </div>

        {/* Buttons */}
        <div className="btn-container">
          <button className="btn btn-exit" onClick={handleExitOnly}>
            Back
          </button>
          <button
            className="btn btn-save"
            onClick={() => handleSaveAndGo("/preliminary")}
            //disabled={viewOnly}
          >
            Next
          </button>
          <button
            className="btn btn-save-exit"
            onClick={() => handleSaveAndGo("/dashboard")}
            //disabled={viewOnly}
          >
            Save &amp; Exit
          </button>
        </div>
      </main>
    </>
  );
}
