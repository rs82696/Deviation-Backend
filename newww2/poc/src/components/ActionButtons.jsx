import React from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://127.0.0.1:5000";
//const API_BASE ="https://deviation-backend-z706.onrender.com";

const ActionButtons = ({
  tableDepartments = [],
  checkedStates = [],
  selectedDept = "",
  selectedIncident = "",
  fetchTableData,
}) => {
  const navigate = useNavigate();

  const validateFields = () => {
    if (!selectedIncident) {
      alert("⚠ Please select an Incident Type!");
      return false;
    }
    if (!selectedDept) {
      alert("⚠ Please select a Department!");
      return false;
    }
    return true;
  };

  // ✅ NEW: checkbox validation
  const hasAtLeastOneChecked = () => {
    return checkedStates.some(
      (state) => state?.approval || state?.informed
    );
  };

  const saveToBackend = async () => {
    const payload = {
      tableDepartments,
      checkedStates,
      selectedDept,
      selectedIncident,
    };

    const res = await fetch(`${API_BASE}/api/selection`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Backend error: ${res.status}`);
    }

    const data = await res.json();
    console.log("✅ Department selections saved:", data);

    if (data.incident_id) {
      localStorage.setItem("incident_id", data.incident_id);
    }

    if (fetchTableData) fetchTableData();
  };

  const handleSave = async (targetPath) => {
    if (!validateFields()) return;

    if (!hasAtLeastOneChecked()) {
      alert("⚠ Please select at least one Approval or Informed checkbox!");
      return;
    }

    try {
      await saveToBackend();
      if (targetPath) navigate(targetPath);
    } catch (err) {
      console.error(err);
      alert("Failed to save Department selections. Check backend logs.");
    }
  };

  return (
    <div className="action-buttons-wrapper">
            <button className="btn btn-exit" onClick={() => navigate("/dashboard")}>
        Back
      </button>
      <button
        className="btn btn-save"
        onClick={() => handleSave("/general-info")}
      >
        Next
      </button>

      <button
        className="btn btn-save-exit"
        onClick={() => handleSave("/dashboard")}
      >
        Save &amp; Exit
      </button>
    </div>
  );
};

export default ActionButtons;
