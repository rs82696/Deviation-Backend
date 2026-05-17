import React, { useRef, useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";
import "./PreliminaryInvestigation.css";

//const API_BASE = "http://127.0.0.1:5000";
const API_BASE ="https://deviation-backend-z706.onrender.com";
//const API_BASE = "https://deviation-backend-z706.onrender.com";

export default function PreliminaryInvestigation() {
  const viewOnly = localStorage.getItem("view_only") === "true";
  const navigate = useNavigate();
  const incidentId = localStorage.getItem("incident_id") || "";

  const investigationRef = useRef(null);
  const reviewerRef = useRef(null);

  const [investigationNA, setInvestigationNA] = useState(false);
  const [reviewerNA, setReviewerNA] = useState(false);

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");

  const execFormat = (ref, command) => {
    if (!ref.current || viewOnly) return;
    ref.current.focus();
    document.execCommand(command, false, null);
  };

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

      await loadAttachments();
      setSelectedFiles([]);
    } catch (e) {
      console.error(e);
      setUploadErr(e.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

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
    loadAttachments();
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

          <div className={`capa-editor ${(viewOnly || investigationNA) ? "disabled" : ""}`}>
            <div className="capa-toolbar">
              <button
                disabled={viewOnly}
                onClick={() => execFormat(investigationRef, "bold")}
              >
                <b>B</b>
              </button>
              <button
                disabled={viewOnly}
                onClick={() => execFormat(investigationRef, "italic")}
              >
                <i>I</i>
              </button>
              <button
                disabled={viewOnly}
                onClick={() => execFormat(investigationRef, "underline")}
              >
                <u>U</u>
              </button>
              <button
                disabled={viewOnly}
                onClick={() => execFormat(investigationRef, "insertUnorderedList")}
              >
                •
              </button>
              <button
                disabled={viewOnly}
                onClick={() => execFormat(investigationRef, "insertOrderedList")}
              >
                1.
              </button>
            </div>

            <div
              ref={investigationRef}
              className="capa-editor-body"
              contentEditable={!viewOnly && !investigationNA}
              suppressContentEditableWarning={true}
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

          <div className={`capa-editor ${(viewOnly || reviewerNA) ? "disabled" : ""}`}>
            <div className="capa-toolbar">
              <button
                disabled={viewOnly}
                onClick={() => execFormat(reviewerRef, "bold")}
              >
                <b>B</b>
              </button>
              <button
                disabled={viewOnly}
                onClick={() => execFormat(reviewerRef, "italic")}
              >
                <i>I</i>
              </button>
              <button
                disabled={viewOnly}
                onClick={() => execFormat(reviewerRef, "underline")}
              >
                <u>U</u>
              </button>
              <button
                disabled={viewOnly}
                onClick={() => execFormat(reviewerRef, "insertUnorderedList")}
              >
                •
              </button>
              <button
                disabled={viewOnly}
                onClick={() => execFormat(reviewerRef, "insertOrderedList")}
              >
                1.
              </button>
            </div>

            <div
              ref={reviewerRef}
              className="capa-editor-body"
              contentEditable={!viewOnly && !reviewerNA}
              suppressContentEditableWarning={true}
              data-placeholder="Enter reviewer remarks..."
            />
          </div>
        </section>

        {/* Attachments */}
        <section className="capa-section">
          <div className="capa-section-header" style={{ alignItems: "flex-start" }}>
            <h3>Attachments:</h3>
          </div>

          <div className="attach-row">
            <input
              type="file"
              multiple
              disabled={viewOnly}
              onChange={(e) => {
                const files = Array.from(e.target.files || []);

                setSelectedFiles((prev) => {
                  const seen = new Set(
                    prev.map((f) => `${f.name}-${f.size}-${f.lastModified}`)
                  );

                  const merged = [...prev];

                  for (const f of files) {
                    const key = `${f.name}-${f.size}-${f.lastModified}`;
                    if (!seen.has(key)) merged.push(f);
                  }

                  return merged;
                });

                e.target.value = "";
              }}
            />

            {!viewOnly && (
              <button
                className="btn"
                style={{ backgroundColor: "#2563eb", color: "white" }}
                onClick={uploadSelectedFiles}
                disabled={!selectedFiles.length || uploading}
              >
                {uploading
                  ? "Uploading..."
                  : `Upload ${selectedFiles.length ? `(${selectedFiles.length})` : ""}`}
              </button>
            )}

            {!viewOnly && selectedFiles.length > 0 && (
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

          {!!selectedFiles.length && !viewOnly && (
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

          {!!attachments.length && (
            <div style={{ marginTop: 12 }}>
              <b>Uploaded:</b>
              <ul className="attach-list">
                {attachments.map((a) => (
                  <li key={a._id} className="attach-item">
                    <a href={a.url} target="_blank" rel="noreferrer">
                      {a.filename}
                    </a>

                    {!viewOnly && (
                      <button
                        className="attach-del"
                        onClick={() => deleteAttachment(a._id)}
                        title="Delete attachment"
                      >
                        ✕
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Buttons */}
        <div className="capa-buttons">
          <button
            className="btn"
            style={{ backgroundColor: "#6c757d", color: "white" }}
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