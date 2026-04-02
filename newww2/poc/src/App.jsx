import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import LoginPage from "./pages/LoginPage.jsx"; 
import RegisterPage from "./pages/RegisterPage";
import IncidentDashboard from "./pages/IncidentDashboard.jsx";
import DepartmentPage from "./pages/DepartmentPage.jsx";
import GeneralInfo from "./pages/GeneralInfo.jsx";
import DeviationInfo from "./pages/DeviationInfo.jsx";
import PreliminaryInvestigation from "./pages/PreliminaryInvestigation.jsx";
import Review from "./pages/RCA.jsx";
import CAPA from "./pages/CAPA.jsx";
import EvaluationComments from "./pages/EvaluationComments.jsx";
import QAComments from "./pages/QAComments.jsx";
import PendingIncidents from "./pages/PendingIncidents.jsx";
import ViewIncidents from "./pages/ViewIncidents.jsx";
import RejectedIncidents from "./pages/RejectedIncidents.jsx";
import ActionRequired from "./pages/ActionRequired.jsx";
import RaisedByDepartment from "./pages/RaisedByDepartment";
import AssignedToDepartment from "./pages/AssignedToDepartment";



function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<IncidentDashboard />} />
        <Route path="/department" element={<DepartmentPage />} />

        <Route path="/general-info" element={<GeneralInfo />} />
        <Route path="/deviation" element={<DeviationInfo />} />
        <Route path="/preliminary" element={<PreliminaryInvestigation />} />
        <Route path="/review" element={<Review />} />
        <Route path="/closure" element={<CAPA />} />
        <Route path="/comments" element={<EvaluationComments />} />
        <Route path="/qacomments" element={<QAComments />} />

        {/* ✅ Pending incidents list */}
        <Route path="/pending" element={<PendingIncidents />} />
        <Route path="/incidents" element={<ViewIncidents />} />
        <Route path="/rejected" element={<RejectedIncidents />} />
        <Route path="/action-required" element={<ActionRequired />} />
        <Route path="/raised-by-department" element={<RaisedByDepartment />} />
        <Route path="/assigned-to-department" element={<AssignedToDepartment />} />
      </Routes>
    </Router>
  );
}

export default App;
