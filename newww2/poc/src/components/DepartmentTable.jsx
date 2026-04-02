import React from "react";

const DepartmentTable = ({
  tableDepartments,
  checkedStates,
  setCheckedStates,
}) => {
  const handleCheckboxChange = (index, type) => {
    const current = checkedStates[index] || {
      approval: false,
      informed: false,
    };

    const newState =
      type === "approval"
        ? { approval: !current.approval, informed: false }
        : { approval: false, informed: !current.informed };

    const updatedStates = [...checkedStates];
    updatedStates[index] = newState;

    setCheckedStates(updatedStates);
  };

  return (
    <div className="table-wrapper">
      <div className="table-scroll">
        <table className="dept-table">
          <thead>
            <tr>
              <th>Department</th>
              <th>Request Approval</th>
              <th>Just Keep Informed</th>
            </tr>
          </thead>
          <tbody>
            {tableDepartments.map((dept, index) => (
              <tr key={index}>
                <td>{dept}</td>

                <td>
                  <input
                    type="checkbox"
                    checked={checkedStates[index]?.approval || false}
                    onChange={() =>
                      handleCheckboxChange(index, "approval")
                    }
                  />
                </td>

                <td>
                  <input
                    type="checkbox"
                    checked={checkedStates[index]?.informed || false}
                    onChange={() =>
                      handleCheckboxChange(index, "informed")
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DepartmentTable;
