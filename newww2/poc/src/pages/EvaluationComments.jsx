import React, { useRef, useState, useEffect } from "react";
import "./QAComments.css";
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://127.0.0.1:5000";
//const API_BASE ="https://deviation-backend-z706.onrender.com";

const departments = [
  "Quality Control",
  "Warehouse",
  "Regulatory Affairs",
  "Production Orals",
  "Microbiology",
  "Personnel and Administration",
  "Customer",
];

export default function EvaluationComments() {
  const viewOnly = localStorage.getItem("view_only") === "true";
  const navigate = useNavigate();
  const incidentId = localStorage.getItem("incident_id") || "";
  const editorRefs = useRef({});
  const [selectedDepts, setSelectedDepts] = useState([]);
  const [deptData, setDeptData] = useState(
    departments.reduce((acc, dept) => {
      acc[dept] = { comment_na: false };
      return acc;
    }, {})
  );
  // FETCH SELECTED DEPARTMENTS
  useEffect(() => {
    if (!incidentId) return;

    fetch(`${API_BASE}/api/incidents/${incidentId}/selected-departments`)
      .then((res) => res.json())
      .then((data) => {
        console.log("API RESPONSE:", data);

        if (!Array.isArray(data)) {
          console.error("Expected array but got:", data);
          setSelectedDepts([]);
          return;
        }

        const normalized = data.map((d) => (d || "").toLowerCase());
        setSelectedDepts(normalized);
      })
      .catch((err) => console.error("Error fetching selected depts:", err));
  }, [incidentId]);

  //  CHECK IF ENABLED
  const DEPT_MAP = {
  "qualitycontrol": "qc",
  "qc": "qc",
  "warehouse": "warehouse",
  "productionorals": "production",
  "production": "production",
  "microbiology": "microbiology",
  "regulatoryaffairs": "regulatory",
  "personnelandadministration": "hr",
  "customer": "customer",
  };
  //const normalize = (str) => (str || "").toLowerCase().replace(/\s+/g, "");
  const normalize = (str) => {
  const key = (str || "").toLowerCase().replace(/\s+/g, "");
  return DEPT_MAP[key] || key;
  };
  const isEnabled = (dept) => {
  return selectedDepts.some(
    (d) => normalize(d) === normalize(dept)
    );
  };
  //console.log("Selected:", selectedDepts);
  //console.log("Dept:", dept, "Enabled:", isEnabled(dept));
  const execFormat = (dept, cmd) => {
    const el = editorRefs.current[dept];
    if (!el) return;
    el.focus();
    setTimeout(() => {
      document.execCommand(cmd, false, null);
    }, 1);
  };

  const Toolbar = ({ dept }) => (
    <div className="capa-toolbar">
      <button onMouseDown={(e) => e.preventDefault()} onClick={() => execFormat(dept, "bold")}>
        B
      </button>
      <button onMouseDown={(e) => e.preventDefault()} onClick={() => execFormat(dept, "italic")}>
        I
      </button>
      <button onMouseDown={(e) => e.preventDefault()} onClick={() => execFormat(dept, "underline")}>
        U
      </button>
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => execFormat(dept, "insertUnorderedList")}
      >
        •
      </button>
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => execFormat(dept, "insertOrderedList")}
      >
        1.
      </button>
    </div>
  );

  useEffect(() => {
    if (!incidentId) return;

    const loadEvaluation = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/evaluation/${incidentId}`);
        if (!res.ok) return;

        const data = await res.json();
        const savedDepartments = data.departments || {};

        setDeptData((prev) => {
          const updated = { ...prev };
          departments.forEach((dept) => {
            updated[dept] = {
              comment_na: !!savedDepartments[dept]?.comment_na,
            };
          });
          return updated;
        });

        setTimeout(() => {
          departments.forEach((dept) => {
            if (editorRefs.current[dept]) {
              editorRefs.current[dept].innerHTML =
                savedDepartments[dept]?.comment_html || "";
            }
          });
        }, 0);
      } catch (err) {
        console.error("Error loading evaluation comments:", err);
      }
    };

    loadEvaluation();
  }, [incidentId]);

  const handleSave = async () => {
    if (!incidentId) {
      alert("Incident ID missing. Please start from Department page.");
      return false;
    }

    const payload = {
      incident_id: incidentId,
      departments: departments.reduce((acc, dept) => {
        acc[dept] = {
          comment_html: deptData[dept].comment_na
            ? ""
            : editorRefs.current[dept]?.innerHTML || "",
          comment_na: deptData[dept].comment_na,
        };
        return acc;
      }, {}),
    };

    try {
      const res = await fetch(`${API_BASE}/api/evaluation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await res.json();
      return true;
    } catch (err) {
      console.error("Error saving evaluation comments:", err);
      alert("Failed to save Evaluation Comments. Check backend logs.");
      return false;
    }
  };

  return (
    <>
      <Navbar activeTab={5} />

      <div className="capa-container">
        {incidentId && (
          <div style={{ margin: "10px 0", fontWeight: 600 }}>
            Incident ID: {incidentId}
          </div>
        )}

        {departments.map((dept) => {
          const enabled = isEnabled(dept);

          return (
            <section className="capa-section" key={dept}>
              <div className="capa-section-header">
                <h3>{dept} Comments:</h3>

                <div className="capa-na">
                  <input
                    type="checkbox"
                    checked={deptData[dept].comment_na}
                    disabled={!enabled || viewOnly}
                    onChange={(e) =>
                      setDeptData((prev) => ({
                        ...prev,
                        [dept]: {
                          ...prev[dept],
                          comment_na: e.target.checked,
                        },
                      }))
                    }
                  />
                  <label>NOT APPLICABLE</label>
                </div>
              </div>

              <div className="capa-editor">
              {enabled && <Toolbar dept={dept} />}

              <div
              ref={(el) => {
                editorRefs.current[dept] = el;
              }}
              className="capa-editor-body"
              contentEditable={enabled && !viewOnly && !deptData[dept].comment_na}
              suppressContentEditableWarning={true}
              data-placeholder={`Enter ${dept} comments...`}
              style={{
                backgroundColor: enabled ? "#fff" : "#f3f4f6",
                cursor: enabled ? "text" : "not-allowed",

                // 🔥 ADD THESE (CRITICAL)
                pointerEvents: enabled ? "auto" : "none",
                userSelect: "text",
              }}
            ></div>
            </div>
            </section>
          );
        })}

        <div className="capa-buttons">
          <button
            className="btn"
            style={{ backgroundColor: "#6c757d", color: "white" }}
            //disabled={viewOnly}
            onClick={() => navigate("/closure")}
          >
            Back
          </button>

          <button
            className="btn"
            style={{ backgroundColor: "#28a745", color: "white" }}
            //disabled={viewOnly}
            onClick={async () => {
              const ok = await handleSave();
              if (!ok) return;
              navigate("/qacomments");
            }}
          >
            Next
          </button>

          <button
            className="btn"
            style={{ backgroundColor: "#007bff", color: "white" }}
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
      </div>
    </>
  );
}