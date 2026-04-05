import React from "react";
import { useNavigate } from "react-router-dom";
import "./Navbar.css";

export default function Navbar({ activeTab, disableTabs = false }) {
  const navigate = useNavigate();
  const username = localStorage.getItem("username") || "";
  const department = localStorage.getItem("department") || "";
  const incidentTitle = localStorage.getItem("incident_title") || "New Incident";
  const today = new Date().toLocaleDateString("en-GB");

  const tabs = [
    { name: "General Information", path: "/general-info" },
    { name: "Deviation Information", path: "/deviation" },
    { name: "Preliminary Investigation", path: "/preliminary" },
    { name: "RCA", path: "/review" },
    { name: "CAPA", path: "/closure" },
    { name: "EvaluationComments", path: "/comments" },
    { name: "QAComments", path: "/qacomments" },
  ];
    const handleHome = () => {
    // ✅ clear all session data
    //localStorage.clear();

    // ✅ redirect to Dashboard & prevent back navigation
    navigate("/dashboard", { replace: true });
  };

    const handledept = () => {
    // ✅ clear all session data
    //localStorage.clear();

    // ✅ redirect to Dashboard & prevent back navigation
    navigate("/department", { replace: true });
  };

  const handleLogout = () => {
    // ✅ clear all session data
    localStorage.clear();

    // ✅ redirect to login & prevent back navigation
    navigate("/", { replace: true });
  };


  return (
    <>
      {/* HEADER */}
      <header className="top-bar">
        <div className="title-area">
          <h1 className="record-title">
            {incidentTitle}
          </h1>
          <div className="record-sub">User: {username}</div>
          <div className="record-sub">Department: {department}</div>
          <div className="record-sub">Pending Data Review</div>
          <div className="record-sub">Created: {today}</div>
        </div>
        {/* ✅ Home Button */}
        <button className="Home-btn" onClick={handleHome}>
          Home
        </button>
        {/* ✅ Department Button */}
        <button className="Department-btn" onClick={handledept}>
          Departments
        </button>
        {/* ✅ Logout BUTTON */}
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </header>
      {/* TABS */}
      <nav className="tabs" role="tablist" aria-label="Deviation workflow steps">
        {tabs.map((tab, index) => {
          const isActive = activeTab === index;

          return (
            <button
              key={tab.name}
              type="button"
              onClick={() => !disableTabs && navigate(tab.path)}
              className={`tab ${isActive ? "active" : ""} ${
                disableTabs ? "disabled" : ""
              }`}
              disabled={disableTabs}
              role="tab"
              aria-selected={isActive}
            >
              {tab.name}
            </button>
          );
        })}
      </nav>
    </>
  );
}
