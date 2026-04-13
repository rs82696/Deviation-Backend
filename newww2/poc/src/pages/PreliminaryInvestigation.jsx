import React, { useRef, useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";
import "./PreliminaryInvestigation.css";

//const API_BASE = "http://127.0.0.1:5000";
const API_BASE = "https://deviation-backend-z706.onrender.com";

export default function PreliminaryInvestigation() {
   const viewOnly = localStorage.getItem("view_only") === "true";
  const navigate = useNavigate();
  const incidentId = localStorage.getItem("incident_id") || "";

  const investigationRef = useRef(null);
  const reviewerRef = useRef(null);

  const [investigationNA, setInvestigationNA] = useState(false);
  const [reviewerNA, setReviewerNA] = useState(false);

  const execFormat = (ref, command) => {
    if (!ref.current) return;
    ref.current.focus();
    document.execCommand(command, false, null);
  };

  // -------- LOAD EXISTING ----------
  useEffect(() => {
    if (!incidentId) return;

    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/preliminary/${incidentId}`);
        if (!res.ok) return;

        const d = await res.json();
        setInvestigationNA(!!d.investigation_na);
        setReviewerNA(!!d.reviewer_na);

        if (investigationRef.current && d.investigation_html) {
          investigationRef.current.innerHTML = d.investigation_html;
        }
        if (reviewerRef.current && d.reviewer_html) {
          reviewerRef.current.innerHTML = d.reviewer_html;
        }
      } catch (err) {
        console.error("Error loading preliminary:", err);
      }
    };

    load();
  }, [incidentId]);

  const savePreliminary = async () => {
    if (!incidentId) {
      alert("Incident ID missing. Please start from Department page.");
      return false;
    }

    const payload = {
      incident_id: incidentId,
      investigation_html: investigationNA
        ? ""
        : investigationRef.current?.innerHTML || "",
      investigation_na: investigationNA,
      reviewer_html: reviewerNA
        ? ""
        : reviewerRef.current?.innerHTML || "",
      reviewer_na: reviewerNA,
    };

    try {
      const res = await fetch(`${API_BASE}/api/preliminary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      console.log("Preliminary saved:", data);
      return true;
    } catch (err) {
      console.error("Error saving preliminary:", err);
      alert("Failed to save Preliminary Investigation. Check backend logs.");
      return false;
    }
  };

  return (
    <>
      <Navbar activeTab={2} />

      <div className="capa-container">
        {incidentId && (
          <div style={{ margin: "10px 0", fontWeight: 600 }}>
            Incident ID: {incidentId}
          </div>
        )}

        {/* Preliminary Investigation */}
        <section className="capa-section">
          <div className="capa-section-header">
            <h3>Preliminary Investigation:</h3>

            <div className="capa-na">
              <input
                type="checkbox"
                checked={investigationNA}
                onChange={(e) => setInvestigationNA(e.target.checked)}
                id="pi-na-1"
                disabled={viewOnly}
              />
              <label htmlFor="pi-na-1">NOT APPLICABLE</label>
            </div>
          </div>

          <div className={`capa-editor ${ (viewOnly ||investigationNA) ? "disabled" : ""}`}>
            <div className="capa-toolbar">
              <button onClick={() => execFormat(investigationRef, "bold")}>
                <b>B</b>
              </button>
              <button onClick={() => execFormat(investigationRef, "italic")}>
                <i>I</i>
              </button>
              <button
                onClick={() => execFormat(investigationRef, "underline")}
              >
                <u>U</u>
              </button>
              <button
                onClick={() =>
                  execFormat(investigationRef, "insertUnorderedList")
                }
              >
                •
              </button>
              <button
                onClick={() =>
                  execFormat(investigationRef, "insertOrderedList")
                }
              >
                1.
              </button>
            </div>

            <div
              ref={investigationRef}
              className="capa-editor-body"
              contentEditable={!viewOnly && !investigationNA}
              data-placeholder="Enter preliminary investigation details..."
            />
          </div>
        </section>

        {/* Reviewer Remarks */}
        <section className="capa-section">
          <div className="capa-section-header">
            <h3>Remarks By Reviewer:</h3>

            <div className="capa-na">
              <input
                type="checkbox"
                checked={reviewerNA}
                onChange={(e) => setReviewerNA(e.target.checked)}
                id="pi-na-2"
                disabled={viewOnly}
              />
              <label htmlFor="pi-na-2">NOT APPLICABLE</label>
            </div>
          </div>

          <div className={`capa-editor ${ (viewOnly || reviewerNA ) ? "disabled" : ""}`}>
            <div className="capa-toolbar">
              <button onClick={() => execFormat(reviewerRef, "bold")}>
                <b>B</b>
              </button>
              <button onClick={() => execFormat(reviewerRef, "italic")}>
                <i>I</i>
              </button>
              <button onClick={() => execFormat(reviewerRef, "underline")}>
                <u>U</u>
              </button>
              <button
                onClick={() =>
                  execFormat(reviewerRef, "insertUnorderedList")
                }
              >
                •
              </button>
              <button
                onClick={() =>
                  execFormat(reviewerRef, "insertOrderedList")
                }
              >
                1.
              </button>
            </div>

            <div
              ref={reviewerRef}
              className="capa-editor-body"
              contentEditable={!viewOnly && !reviewerNA}
              data-placeholder="Enter reviewer remarks..."
            />
          </div>
        </section>

        {/* Buttons */}
        <div className="capa-buttons">
          <button
            className="btn"
            style={{ backgroundColor: "#6c757d", color: "white" }}
            //disabled={viewOnly}
            onClick={() => navigate("/deviation")}
          >
            Back
          </button>

          <button
            className="btn"
            style={{ backgroundColor: "#28a745", color: "white" }}
            //disabled={viewOnly}
            onClick={async () => {
              const ok = await savePreliminary();
              if (!ok) return;
              navigate("/review");
            }}
          >
            Next
          </button>

          <button
            className="btn"
            style={{ backgroundColor: "#007bff", color: "white" }}
            //disabled={viewOnly}
            onClick={async () => {
              const ok = await savePreliminary();
              if (!ok) return;
              navigate("/dashboard");
            }}
          >
            Save &amp; Exit
          </button>
        </div>
      </div>
    </>
  );
}
