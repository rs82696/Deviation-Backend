import React, { useRef, useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";
import "./capa.css";

//const API_BASE = "http://127.0.0.1:5000";
const API_BASE ="https://deviation-backend-z706.onrender.com";

export default function CAPA() {
   const viewOnly = localStorage.getItem("view_only") === "true";
  const navigate = useNavigate();
  const incidentId = localStorage.getItem("incident_id") || "";

  const correctiveRef = useRef(null);
  const preventiveRef = useRef(null);
  const deptHeadRef = useRef(null);

  const [correctiveNA, setCorrectiveNA] = useState(false);
  const [preventiveNA, setPreventiveNA] = useState(false);
  const [deptHeadNA, setDeptHeadNA] = useState(false);
  const [reviewerRemarks, setReviewerRemarks] = useState("");

  const execFormat = (editorRef, command, value = null) => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    document.execCommand(command, false, value);
  };

  const getEditorHTML = (ref, isNA) => {
    if (isNA) return "";
    const el = ref.current;
    return el ? el.innerHTML : "";
  };

  // -------- LOAD EXISTING ----------
  useEffect(() => {
    if (!incidentId) return;

    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/capa/${incidentId}`);
        if (!res.ok) return;

        const d = await res.json();
        setCorrectiveNA(!!d.corrective_na);
        setPreventiveNA(!!d.preventive_na);
        setDeptHeadNA(!!d.dept_head_na);
        setReviewerRemarks(d.reviewer_remarks || "");

        if (correctiveRef.current && d.corrective_html) {
          correctiveRef.current.innerHTML = d.corrective_html;
        }
        if (preventiveRef.current && d.preventive_html) {
          preventiveRef.current.innerHTML = d.preventive_html;
        }
        if (deptHeadRef.current && d.dept_head_html) {
          deptHeadRef.current.innerHTML = d.dept_head_html;
        }
      } catch (err) {
        console.error("Error loading CAPA:", err);
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
      corrective_html: getEditorHTML(correctiveRef, correctiveNA),
      corrective_na: correctiveNA,
      preventive_html: getEditorHTML(preventiveRef, preventiveNA),
      preventive_na: preventiveNA,
      dept_head_html: getEditorHTML(deptHeadRef, deptHeadNA),
      dept_head_na: deptHeadNA,
      reviewer_remarks: reviewerRemarks,
    };

    try {
      const res = await fetch(`${API_BASE}/api/capa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      console.log("CAPA saved:", data);
      return true;
    } catch (err) {
      console.error("Error saving CAPA:", err);
      alert("Failed to save CAPA. Check backend logs.");
      return false;
    }
  };

  return (
    <>
      <Navbar activeTab={4} />

      <div className="capa-container">
        {incidentId && (
          <div style={{ margin: "10px 0", fontWeight: 600 }}>
            Incident ID: {incidentId}
          </div>
        )}

        {/* Corrective Actions */}
        <section className="capa-section">
          <div className="capa-section-header">
            <h3>Corrective Actions:</h3>
            <div className="capa-na">
              <input
                id="corrective-na"
                type="checkbox"
                checked={correctiveNA}
                onChange={(e) => setCorrectiveNA(e.target.checked)}
                disabled={viewOnly}
              />
              <label htmlFor="corrective-na">NOT APPLICABLE</label>
            </div>
          </div>

          <div className={`capa-editor ${(viewOnly ||correctiveNA) ? "disabled" : ""}`}>
            <div className="capa-toolbar">
              <button
                type="button"
                title="Bold"
                onClick={() => execFormat(correctiveRef, "bold")}
              >
                B
              </button>
              <button
                type="button"
                title="Italic"
                onClick={() => execFormat(correctiveRef, "italic")}
              >
                I
              </button>
              <button
                type="button"
                title="Underline"
                onClick={() => execFormat(correctiveRef, "underline")}
              >
                U
              </button>
              <button
                type="button"
                title="Bulleted list"
                onClick={() =>
                  execFormat(correctiveRef, "insertUnorderedList")
                }
              >
                •
              </button>
              <button
                type="button"
                title="Numbered list"
                onClick={() =>
                  execFormat(correctiveRef, "insertOrderedList")
                }
              >
                1.
              </button>
            </div>

            <div
              ref={correctiveRef}
              className="capa-editor-body"
              contentEditable={!viewOnly && !correctiveNA}
              suppressContentEditableWarning={true}
              role="textbox"
              aria-multiline="true"
              data-placeholder="Enter corrective actions..."
            />
          </div>
        </section>

        {/* Preventive Actions */}
        <section className="capa-section">
          <div className="capa-section-header">
            <h3>Preventive Actions:</h3>
            <div className="capa-na">
              <input
                id="preventive-na"
                type="checkbox"
                checked={preventiveNA}
                onChange={(e) => setPreventiveNA(e.target.checked)}
                disabled={viewOnly}
              />
              <label htmlFor="preventive-na">NOT APPLICABLE</label>
            </div>
          </div>

          <div className={`capa-editor ${(viewOnly || preventiveNA) ? "disabled" : ""}`}>
            <div className="capa-toolbar">
              <button
                type="button"
                title="Bold"
                onClick={() => execFormat(preventiveRef, "bold")}
              >
                B
              </button>
              <button
                type="button"
                title="Italic"
                onClick={() => execFormat(preventiveRef, "italic")}
              >
                I
              </button>
              <button
                type="button"
                title="Underline"
                onClick={() => execFormat(preventiveRef, "underline")}
              >
                U
              </button>
              <button
                type="button"
                title="Bulleted list"
                onClick={() =>
                  execFormat(preventiveRef, "insertUnorderedList")
                }
              >
                •
              </button>
              <button
                type="button"
                title="Numbered list"
                onClick={() =>
                  execFormat(preventiveRef, "insertOrderedList")
                }
              >
                1.
              </button>
            </div>

            <div
              ref={preventiveRef}
              className="capa-editor-body"
              contentEditable={!viewOnly && !preventiveNA}
              suppressContentEditableWarning={true}
              role="textbox"
              aria-multiline="true"
              data-placeholder="Enter preventive actions..."
            />
          </div>
        </section>

        {/* Department Head Review Comments */}
        <section className="capa-section">
          <div className="capa-section-header">
            <h3>Department Head Review Comments:</h3>
            <div className="capa-na">
              <input
                id="depthead-na"
                type="checkbox"
                checked={deptHeadNA}
                onChange={(e) => setDeptHeadNA(e.target.checked)}
                disabled = {viewOnly}
              />
              <label htmlFor="depthead-na">NOT APPLICABLE</label>
            </div>
          </div>

          <div className={`capa-editor ${(viewOnly || deptHeadNA) ? "disabled" : ""}`}>
            <div className="capa-toolbar">
              <button
                type="button"
                title="Bold"
                onClick={() => execFormat(deptHeadRef, "bold")}
              >
                B
              </button>
              <button
                type="button"
                title="Italic"
                onClick={() => execFormat(deptHeadRef, "italic")}
              >
                I
              </button>
              <button
                type="button"
                title="Underline"
                onClick={() => execFormat(deptHeadRef, "underline")}
              >
                U
              </button>
              <button
                type="button"
                title="Bulleted list"
                onClick={() =>
                  execFormat(deptHeadRef, "insertUnorderedList")
                }
              >
                •
              </button>
              <button
                type="button"
                title="Numbered list"
                onClick={() =>
                  execFormat(deptHeadRef, "insertOrderedList")
                }
              >
                1.
              </button>
            </div>

            <div
              ref={deptHeadRef}
              className="capa-editor-body"
              contentEditable={!viewOnly && !deptHeadNA}
              suppressContentEditableWarning={true}
              role="textbox"
              aria-multiline="true"
              data-placeholder="Enter department head review comments..."
            />
          </div>
        </section>

        {/* Remarks by reviewer */}
        <div className="capa-reviewer">
          <label className="capa-label">Remarks By Reviewer:</label>
          <textarea
            className="capa-reviewer-text"
            placeholder="Enter remarks by reviewer..."
            value={reviewerRemarks}
            onChange={(e) => setReviewerRemarks(e.target.value)}
            disabled = {viewOnly}
          />
        </div>

        {/* Buttons */}
        <div className="capa-buttons">
                    <button
            className="btn"
            style={{ backgroundColor: "#6c757d" }}
            //disabled = {viewOnly}
            onClick={() => navigate("/review")}
          >
            Back
          </button>

          <button
            className="btn"
            style={{ backgroundColor: "#28a745" }}
            //disabled = {viewOnly}
            onClick={async () => {
              const ok = await handleSave();
              if (!ok) return;
              navigate("/comments");
            
            }}
          >
            Next
          </button>

          <button
            className="btn"
            style={{ backgroundColor: "#007bff" }}
            //disabled = {viewOnly}
            onClick={async () => {
              const ok = await handleSave();
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
