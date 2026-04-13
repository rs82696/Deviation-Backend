import React, { useRef, useState, useEffect } from "react";
import "./QAComments.css";
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://127.0.0.1:5000";
//const API_BASE = "https://deviation-backend-z706.onrender.com";

export default function QAComments() {
  const viewOnly = localStorage.getItem("view_only") === "true";
  const navigate = useNavigate();
  const incidentId = localStorage.getItem("incident_id") || "";

  const qaEvalRef = useRef(null);
  const impactRef = useRef(null);
  const finalRef = useRef(null);

  const [qaNA, setQaNA] = useState(false);
  const [impactNA, setImpactNA] = useState(false);
  const [finalNA, setFinalNA] = useState(false);

  const [designeeName, setDesigneeName] = useState("");

  // ✅ Attachments state (multi-upload)
  const [selectedFiles, setSelectedFiles] = useState([]); // File[]
  const [attachments, setAttachments] = useState([]);     // from backend
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");

  const execFormat = (ref, cmd) => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    setTimeout(() => {
      document.execCommand(cmd, false, null);
    }, 1);
  };

  const Toolbar = ({ refName }) => (
    <div className="capa-toolbar">
      <button onMouseDown={(e) => e.preventDefault()} onClick={() => execFormat(refName, "bold")}>
        B
      </button>
      <button onMouseDown={(e) => e.preventDefault()} onClick={() => execFormat(refName, "italic")}>
        I
      </button>
      <button onMouseDown={(e) => e.preventDefault()} onClick={() => execFormat(refName, "underline")}>
        U
      </button>
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => execFormat(refName, "insertUnorderedList")}
      >
        •
      </button>
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => execFormat(refName, "insertOrderedList")}
      >
        1.
      </button>
    </div>
  );

  // ✅ Load attachments list
  const loadAttachments = async () => {
    if (!incidentId) return;
    try {
      const res = await fetch(`${API_BASE}/api/incidents/${incidentId}/attachments`);
      if (!res.ok) return;
      const data = await res.json();
      setAttachments(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error loading attachments:", e);
    }
  };

  // ✅ Upload multiple files (sequential, reliable)
  const uploadSelectedFiles = async () => {
    if (!incidentId) {
      alert("Incident ID missing. Please start from Department page.");
      return;
    }
    if (!selectedFiles.length) return;

    setUploading(true);
    setUploadErr("");

    try {
      for (const file of selectedFiles) {
        const form = new FormData();
        form.append("file", file);

        const res = await fetch(`${API_BASE}/api/incidents/${incidentId}/attachments`, {
          method: "POST",
          body: form,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || `Upload failed (${res.status})`);
        }
      }

      // refresh list + clear selection
      await loadAttachments();
      setSelectedFiles([]);
    } catch (e) {
      console.error(e);
      setUploadErr(e.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  // ✅ Optional delete (only works if you added DELETE endpoint)
  const deleteAttachment = async (attachmentId) => {
    try {
      const res = await fetch(`${API_BASE}/api/attachments/${attachmentId}`, {
        method: "DELETE",
      });
      if (!res.ok) return;
      await loadAttachments();
    } catch (e) {
      console.error("Delete failed:", e);
    }
  };

  // -------- LOAD EXISTING QA EVALUATION + ATTACHMENTS ----------
  useEffect(() => {
    if (!incidentId) return;

    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/qacomment/${incidentId}`);
        if (res.ok) {
          const d = await res.json();
          setQaNA(!!d.qa_na);
          setImpactNA(!!d.impact_na);
          setFinalNA(!!d.final_na);
          setDesigneeName(d.designee_name || "");

          if (qaEvalRef.current && d.qa_eval_html) qaEvalRef.current.innerHTML = d.qa_eval_html;
          if (impactRef.current && d.impact_html) impactRef.current.innerHTML = d.impact_html;
          if (finalRef.current && d.final_eval_html) finalRef.current.innerHTML = d.final_eval_html;
        }
      } catch (err) {
        console.error("Error loading  QA evaluation:", err);
      }
    };

    load();
    loadAttachments();
  }, [incidentId]);

  const handleSave = async () => {
    if (!incidentId) {
      alert("Incident ID missing. Please start from Department page.");
      return false;
    }

    const payload = {
      incident_id: incidentId,
      qa_eval_html: qaNA ? "" : qaEvalRef.current?.innerHTML || "",
      qa_na: qaNA,
      impact_html: impactNA ? "" : impactRef.current?.innerHTML || "",
      impact_na: impactNA,
      final_eval_html: finalNA ? "" : finalRef.current?.innerHTML || "",
      final_na: finalNA,
      designee_name: designeeName,
    };

    try {
      const res = await fetch(`${API_BASE}/api/qacomment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await res.json();
      return true;
    } catch (err) {
      console.error("Error saving QA evaluation:", err);
      alert("Failed to save QA Comments. Check backend logs.");
      return false;
    }
  };

  return (
    <>
      <Navbar activeTab={6} />

      <div className="capa-container">
        {incidentId && (
          <div style={{ margin: "10px 0", fontWeight: 600 }}>
            Incident ID: {incidentId}
          </div>
        )}

        {/* QA Designee */}
        <section className="capa-section">
          <div className="capa-section-header">
            <h3>Quality Assurance Designee Name:</h3>
          </div>

          <select className="qa-select" value={designeeName} onChange={(e) => setDesigneeName(e.target.value)} disabled = {viewOnly}>
            <option value="">Select Name</option>
            <option value="Person A">Person A</option>
            <option value="Person B">Person B</option>
          </select>
        </section>

        {/* QA Evaluation */}
        <section className="capa-section">
          <div className="capa-section-header">
            <h3>Quality Assurance Evaluation Comments:</h3>
            <div className="capa-na">
              <input type="checkbox" checked={qaNA} onChange={(e) => setQaNA(e.target.checked)} 
              disabled = {viewOnly} />
              <label>NOT APPLICABLE</label>
            </div>
          </div>

          <div className={`capa-editor ${(viewOnly || qaNA) ? "disabled" : ""}`}>
            <Toolbar refName={qaEvalRef} />
            <div
              ref={qaEvalRef}
              className="capa-editor-body"
              contentEditable={!viewOnly && !qaNA}
              suppressContentEditableWarning={true}
              data-placeholder="Enter QA evaluation comments..."
            ></div>
          </div>
        </section>

        {/* Impact Assessment */}
        <section className="capa-section">
          <div className="capa-section-header">
            <h3>Impact Assessment of the Deviation:</h3>
            <div className="capa-na">
              <input type="checkbox" checked={impactNA} onChange={(e) => setImpactNA(e.target.checked)} disabled ={viewOnly}/>
              <label>NOT APPLICABLE</label>
            </div>
          </div>

          <div className={`capa-editor ${(viewOnly || impactNA) ? "disabled" : ""}`}>
            <Toolbar refName={impactRef} />
            <div
              ref={impactRef}
              className="capa-editor-body"
              contentEditable={!viewOnly && !impactNA}
              suppressContentEditableWarning={true}
              data-placeholder="Enter impact assessment..."
            ></div>
          </div>
        </section>

        {/* Final Evaluation */}
        <section className="capa-section">
          <div className="capa-section-header">
            <h3>Final Evaluation of Deviation by Quality Assurance Head:</h3>
            <div className="capa-na">
              <input type="checkbox" checked={finalNA} onChange={(e) => setFinalNA(e.target.checked)} disabled = {viewOnly} />
              <label>NOT APPLICABLE</label>
            </div>
          </div>

          <div className={`capa-editor ${(viewOnly || finalNA) ? "disabled" : ""}`}>
            <Toolbar refName={finalRef} />
            <div
              ref={finalRef}
              className="capa-editor-body"
              contentEditable={!viewOnly && !finalNA}
              suppressContentEditableWarning={true}
              data-placeholder="Enter final QA head evaluation..."
            ></div>
          </div>
        </section>

        {/* ✅ Attachments (MULTI UPLOAD) */}
        <section className="capa-section">
          <div className="capa-section-header" style={{ alignItems: "flex-start" }}>
            <h3>Attachments:</h3>
          </div>

          <div className="attach-row">
            <input
              type="file"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || []);

                // ✅ append files (so you can select multiple times)
                setSelectedFiles((prev) => {
                  const seen = new Set(prev.map((f) => `${f.name}-${f.size}-${f.lastModified}`));
                  const merged = [...prev];

                  for (const f of files) {
                    const key = `${f.name}-${f.size}-${f.lastModified}`;
                    if (!seen.has(key)) merged.push(f);
                  }
                  return merged;
                });

                // ✅ allow selecting same file again
                e.target.value = "";
              }}
              disabled={viewOnly}
            />

            <button
              className="btn"
              style={{ backgroundColor: "#2563eb", color: "white" }}
              onClick={uploadSelectedFiles}
              disabled={!selectedFiles.length || uploading}
            >
              {uploading ? "Uploading..." : `Upload ${selectedFiles.length ? `(${selectedFiles.length})` : ""}`}
            </button>

            {selectedFiles.length > 0 && (
              <button
                className="btn"
                style={{ backgroundColor: "#6c757d", color: "white" }}
                onClick={() => setSelectedFiles([])}
                disabled={uploading}
              >
                Clear
              </button>
            )}
          </div>

          {uploadErr && <p style={{ color: "red", marginTop: 10 }}>{uploadErr}</p>}

          {/* ✅ selected file names + cross to remove */}
          {!!selectedFiles.length && (
            <div style={{ marginTop: 10, fontSize: 14 }}>
              <b>Selected:</b>
              <ul style={{ marginTop: 6 }}>
                {selectedFiles.map((f) => (
                  <li
                    key={f.name + f.size + f.lastModified}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 6,
                    }}
                  >
                    <span>{f.name}</span>

                    {/* ❌ remove before upload */}
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedFiles((prev) =>
                          prev.filter(
                            (x) =>
                              !(
                                x.name === f.name &&
                                x.size === f.size &&
                                x.lastModified === f.lastModified
                              )
                          )
                        )
                      }
                      style={{
                        border: "none",
                        background: "transparent",
                        color: "#dc2626",
                        fontSize: 18,
                        fontWeight: 700,
                        cursor: "pointer",
                        lineHeight: 1,
                      }}
                      title="Remove"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* uploaded list (unchanged) */}
          {!!attachments.length && (
            <div style={{ marginTop: 12 }}>
              <b>Uploaded:</b>
              <ul className="attach-list">
                {attachments.map((a) => (
                  <li key={a._id} className="attach-item">
                    <a href={a.url} target="_blank" rel="noreferrer">
                      {a.filename}
                    </a>

                    {/* Optional delete button (unchanged) */}
                    <button
                      className="attach-del"
                      onClick={() => deleteAttachment(a._id)}
                      title="Delete attachment"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Buttons */}
        <div className="capa-buttons">
          <button className="btn" style={{ backgroundColor: "#6c757d", color: "white" }} onClick={() => navigate("/comments")}>
            Back
          </button>

          <button
            className="btn"
            //disabled = {viewOnly}
            style={{ backgroundColor: "#28a745", color: "white" }}
            onClick={async () => {
              const ok = await handleSave();
              if (!ok) return;
              navigate("/dashboard");
            }}
          >
            Save
          </button>

          <button
            className="btn"
            style={{ backgroundColor: "#007bff", color: "white" }}
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
