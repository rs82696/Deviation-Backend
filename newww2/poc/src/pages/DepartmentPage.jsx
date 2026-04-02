import React, { useState, useEffect } from "react";
import Department from "../components/Department";
import DepartmentTable from "../components/DepartmentTable";
import ActionButtons from "../components/ActionButtons";
import Navbar from "../components/Navbar";
import "./DepartmentPage.css";

const DepartmentPage = () => {
  const tableDepartments = [
    "Quality Assurance",
    "Quality Control",
    "Warehouse",
    "Regulatory Affairs",
    "Production Orals",
    "Microbiology",
    "Personnel and administration",
    "Customer",
  ];

  const [selectedDept, setSelectedDept] = useState("");
  const [selectedIncident, setSelectedIncident] = useState("");

  // ✅ frontend-only checkbox state
  const [checkedStates, setCheckedStates] = useState(
    tableDepartments.map(() => ({
      approval: false,
      informed: false,
    }))
  );

  useEffect(() => {
    localStorage.removeItem("view_only");
    localStorage.removeItem("incident_id");
  }, []);

  return (
    <div>
      <Navbar disableTabs={true} />

      <Department
        selectedDept={selectedDept}
        setSelectedDept={setSelectedDept}
        selectedIncident={selectedIncident}
        setSelectedIncident={setSelectedIncident}
      />

      <DepartmentTable
        tableDepartments={tableDepartments}
        checkedStates={checkedStates}
        setCheckedStates={setCheckedStates}
      />

      <ActionButtons
        tableDepartments={tableDepartments}
        checkedStates={checkedStates}
        selectedDept={selectedDept}
        selectedIncident={selectedIncident}
      />
    </div>
  );
};

export default DepartmentPage;
