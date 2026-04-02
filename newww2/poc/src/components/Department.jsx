import React from "react";

const Department = ({ selectedDept, setSelectedDept, selectedIncident, setSelectedIncident }) => {
  const departments = [
    "Customer",
    "Microbiology",
    "Personnel and administration",
    "Production Orals",
    "Quality Assurance",
    "Quality Control",
    "Regulatory Affairs",
    "Warehouse",
  ];
  const incidentTypes = ["Deviation Record", "Control Change"];

  return (
    <div className="department-wrapper">
      <div className="department-container">
        <div className="dropdown-section">
          <div className="dropdown-item">
            <label>Department *</label>
            <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)}>
              <option value="" disabled>
                -- Select Department --
              </option>
              {departments.map((dept, index) => (
                <option key={index} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          <div className="dropdown-item">
            <label>Incident Type *</label>
            <select
              value={selectedIncident}
              onChange={(e) => setSelectedIncident(e.target.value)}
            >
              <option value="" disabled>
                -- Select Incident Type --
              </option>
              {incidentTypes.map((type, index) => (
                <option key={index} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Department;
