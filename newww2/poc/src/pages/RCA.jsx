import React, { useRef, useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";
import "./RCA.css";

const API_BASE = "http://127.0.0.1:5000";
//const API_BASE ="https://deviation-backend-z706.onrender.com";

export default function Review() {
  const viewOnly = localStorage.getItem("view_only") === "true";
  const navigate = useNavigate();
  const incidentId = localStorage.getItem("incident_id") || "";

  const editorRoot = useRef(null);
  const editorJust = useRef(null);

  const [rootCauseNA, setRootCauseNA] = useState(false);
  const [action, setAction] = useState([]);
  const [actionNA, setActionNA] = useState(false);
  const [justificationNA, setJustificationNA] = useState(false);
  const [remarksNA, setRemarksNA] = useState(false);
  const [remarks, setRemarks] = useState("");

  const actionOptions = [
    "Continued Manufacturing",
    "Stopped Manufacturing",
    "Other Action",
    "Not Applicable",
  ];

  const format = (cmd, ref) => {
    if (!ref.current) return;
    ref.current.focus();
    document.execCommand(cmd);
  };

  const handleCheckboxChange = (option) => {
    if (action.includes(option)) {
      setAction([]);
    } else {
      setAction([option]);
    }
  };

  // -------- LOAD EXISTING ----------
  useEffect(() => {
    if (!incidentId) return;

    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/rca/${incidentId}`);
        if (!res.ok) return;

        const d = await res.json();

        setRootCauseNA(!!d.root_cause_na);
        setAction(Array.isArray(d.action) ? d.action : []);
        setActionNA(!!d.action_na);
        setJustificationNA(!!d.justification_na);
        setRemarksNA(!!d.remarks_na);
        setRemarks(d.remarks || "");

        if (editorRoot.current && d.root_cause_html) {
          editorRoot.current.innerHTML = d.root_cause_html;
        }
        if (editorJust.current && d.justification_html) {
          editorJust.current.innerHTML = d.justification_html;
        }
      } catch (err) {
        console.error("Error loading RCA:", err);
      }
    };

    load();
  }, [incidentId]);

  const handleSave = async () => {
    if (!incidentId) {
      alert("Incident ID missing. Please start from Department page.");
      return false;
    }

    const payload = {
      incident_id: incidentId,
      root_cause_html: rootCauseNA
        ? ""
        : editorRoot.current?.innerHTML || "",
      root_cause_na: rootCauseNA,
      action,
      action_na: actionNA,
      justification_html: justificationNA
        ? ""
        : editorJust.current?.innerHTML || "",
      justification_na: justificationNA,
      remarks,
      remarks_na: remarksNA,
    };

    try {
      const res = await fetch(`${API_BASE}/api/rca`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      console.log("RCA saved:", data);
      return true;
    } catch (err) {
      console.error("Error saving RCA:", err);
      alert("Failed to save RCA. Check backend logs.");
      return false;
    }
  };

  return (
    <>
      <Navbar activeTab={3} />
      <main className="capa-container">
        {incidentId && (
          <div style={{ margin: "10px 0", fontWeight: 600 }}>
            Incident ID: {incidentId}
          </div>
        )}

        {/* ROOT CAUSE */}
        <section className="capa-section">
          <div className="capa-section-header">
            <label className="input-label">
              Reason / Root Cause Identification:
            </label>
            <label className="capa-na">
              <input
                type="checkbox"
                checked={rootCauseNA}
                onChange={(e) => setRootCauseNA(e.target.checked)}
                disabled={viewOnly}
              />
              NOT APPLICABLE
            </label>
          </div>

          <div className={`capa-editor ${(viewOnly || rootCauseNA ) ? "disabled" : ""}`}>
            <div className="capa-toolbar">
              <button onClick={() => format("bold", editorRoot)}>𝐁</button>
              <button onClick={() => format("italic", editorRoot)}>𝑖</button>
              <button onClick={() => format("underline", editorRoot)}>U̲</button>
              <button
                onClick={() => format("insertUnorderedList", editorRoot)}
              >
                •
              </button>
              <button
                onClick={() => format("insertOrderedList", editorRoot)}
              >
                1.
              </button>
            </div>

            <div
              ref={editorRoot}
              className="capa-editor-body"
              contentEditable={!viewOnly && !rootCauseNA}
              placeholder="Enter root cause..."
            />
          </div>
        </section>

        {/* ACTION TAKEN */}
        <section className="capa-section">
          <div className="capa-section-header">
            <label className="input-label">
              Action Taken:{" "}
              <span className="note">(Only one should be selected)</span>
            </label>

            <label className="capa-na">
              <input
                type="checkbox"
                checked={actionNA}
                onChange={(e) => {
                  disabled={viewOnly}
                  setActionNA(e.target.checked);
                  if (e.target.checked) setAction([]);
                }}
              />
              NOT APPLICABLE
            </label>
          </div>

          <div className="action-list">
            {actionOptions.map((opt) => (
              <label className="action-row" key={opt}>
                <input
                  type="checkbox"
                  checked={action.includes(opt)}
                  onChange={() => handleCheckboxChange(opt)}
                  disabled={actionNA || viewOnly}
                />
                <span className="action-text">{opt}</span>
              </label>
            ))}
          </div>
        </section>

        {/* JUSTIFICATION */}
        <section className="capa-section">
          <div className="capa-section-header">
            <label className="input-label">
              Justification for Action Taken:
            </label>
            <label className="capa-na">
              <input
                type="checkbox"
                checked={justificationNA}
                onChange={(e) => setJustificationNA(e.target.checked)}
                disabled={viewOnly}
              />
              NOT APPLICABLE
            </label>
          </div>

          <div className={`capa-editor ${(viewOnly || justificationNA) ? "disabled" : ""}`}>
            <div className="capa-toolbar">
              <button onClick={() => format("bold", editorJust)}>𝐁</button>
              <button onClick={() => format("italic", editorJust)}>𝑖</button>
              <button onClick={() => format("underline", editorJust)}>U̲</button>
              <button
                onClick={() => format("insertUnorderedList", editorJust)}
              >
                •
              </button>
              <button
                onClick={() => format("insertOrderedList", editorJust)}
              >
                1.
              </button>
            </div>

            <div
              ref={editorJust}
              className="capa-editor-body"
              contentEditable={!viewOnly && !justificationNA}
              placeholder="Mandatory for selected Action(s)"
            />
          </div>
        </section>

        {/* REVIEWER REMARKS */}
        <section className="capa-section">
          <div className="capa-section-header">
            <label className="input-label">Remarks by Reviewer:</label>
            <label className="capa-na">
              <input
                type="checkbox"
                checked={remarksNA}
                onChange={(e) => setRemarksNA(e.target.checked)}
                disabled={viewOnly}
              />
              NOT APPLICABLE
            </label>
          </div>

          <textarea
            className="capa-reviewer-text"
            disabled={remarksNA || viewOnly}
            placeholder="Enter reviewer comments..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
        </section>

        {/* BUTTONS */}
        <div className="capa-buttons">
                    <button
            className="btn"
            style={{ backgroundColor: "#6c757d" }}
            //disabled={viewOnly}
            onClick={() => navigate("/preliminary")}
          >
            Back
          </button>
          <button
            className="btn"
            style={{ backgroundColor: "#28a745" }}
            //disabled={viewOnly}
            onClick={async () => {
              const ok = await handleSave();
              if (!ok) return;
              navigate("/closure");
            }}
          >
            Next
          </button>

          <button
            className="btn"
            style={{ backgroundColor: "#007bff" }}
            //disabled={viewOnly}
            onClick={async () => {
              const ok = await handleSave();
              if (!ok) return;
              navigate("/dashboard");
            }}
          >
            Save &amp; Exit
          </button>
        </div>
      </main>
    </>
  );
}
