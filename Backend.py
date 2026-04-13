# app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from pymongo.collection import ReturnDocument
from datetime import datetime

# app.py
from bson import ObjectId
import os
import boto3
from botocore.exceptions import ClientError

from werkzeug.security import check_password_hash

app = Flask(__name__)
CORS(app)

# ✅ Optional: max upload size (10MB)
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024  # 10 MB

AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
S3_BUCKET = os.getenv("S3_BUCKET_NAME")

if not S3_BUCKET:
    raise RuntimeError("S3_BUCKET_NAME environment variable is required")
s3 = boto3.client("s3", region_name=AWS_REGION)

#MONGO_URI = "mongodb+srv://monikars82696_db_user:Monika123@cluster01.nslata7.mongodb.net/?retryWrites=true&w=majority&appName=Cluster01"
MONGO_URI = os.getenv("MONGO_URI")
DATABASE_NAME = "testdb1"

client = MongoClient(MONGO_URI)
db = client[DATABASE_NAME]

# Existing collections
department_selection_collection = db["DepartmentSelection"]
general_info_collection = db["GeneralInformation"]
deviation_info_collection = db["DeviationInformation"]
preliminary_collection = db["PreliminaryInvestigation"]
rca_collection = db["RCA"]
capa_collection = db["CAPA"]
evaluation_collection = db["EvaluationComments"]
qa_collection = db["QAComments"]
users_collection = db["Users"]
assigned_to_my_dept_collection = db["AssignedToMyDept"]

# ✅ NEW: Single source of truth for incident header + status
incidents_collection = db["Incidents"]

# ✅ NEW: Attachments collection
attachments_collection = db["IncidentAttachments"]


# -------------------- HELPERS --------------------
def now_utc():
    return datetime.utcnow()


def normalize_status(s: str) -> str:
    """
    Keep statuses consistent across the app.
    """
    if not s:
        return "created"
    s = s.strip().lower()

    mapping = {
        "in_progress": "pending",
        "in progress": "pending",
        "inprogress": "pending",
        "pending": "pending",
        "created": "created",
        "action_required": "action_required",
        "action required": "action_required",
        "rejected": "rejected",
        "approved": "approved",
        "completed": "approved",
        "done": "approved",
    }
    return mapping.get(s, s)


def default_next_step(status: str) -> str:
    """
    Where to navigate when opening an incident from lists.
    """
    status = normalize_status(status)
    if status in ("created", "pending"):
        return "/general-info"
    if status == "action_required":
        return "/review"
    if status == "rejected":
        return "/general-info"
    if status == "approved":
        return "/general-info"
    return "/general-info"


def compute_next_step_for_incident(incident_id: str) -> str:
    """
    Determine first incomplete step based on which docs exist in Mongo.
    This drives Pending Incidents "Open" routing.
    """
    if not general_info_collection.find_one({"incident_id": incident_id}):
        return "/general-info"
    if not deviation_info_collection.find_one({"incident_id": incident_id}):
        return "/deviation"
    if not preliminary_collection.find_one({"incident_id": incident_id}):
        return "/preliminary"
    if not rca_collection.find_one({"incident_id": incident_id}):
        return "/review"
    if not capa_collection.find_one({"incident_id": incident_id}):
        return "/closure"
    if not evaluation_collection.find_one({"incident_id": incident_id}):
        return "/comments"
    if not qa_collection.find_one({"incident_id": incident_id}):
        return "/qacomments"
    return "/qacomments"
 


# -------------------- INCIDENT ID GENERATION --------------------
def generate_incident_id(site_code: str = "PS") -> str:
    """
    Returns IDs like: DR|PS|25|009
    Uses Incidents collection as the sequence source (recommended).
    Falls back to DepartmentSelection if needed.
    """
    prefix = "DR"
    year = now_utc().strftime("%y")
    pattern = f"^{prefix}\\|{site_code}\\|{year}\\|"

    cursor = (
        incidents_collection
        .find({"incident_id": {"$regex": pattern}})
        .sort("created_at", -1)
        .limit(1)
    )

    last_seq = 0
    for doc in cursor:
        try:
            last_part = str(doc.get("incident_id", "")).split("|")[-1]
            last_seq = int(last_part)
        except Exception:
            last_seq = 0

    if last_seq == 0:
        cursor2 = (
            department_selection_collection
            .find({"incident_id": {"$regex": pattern}})
            .sort("created_at", -1)
            .limit(1)
        )
        for doc in cursor2:
            try:
                last_part = str(doc.get("incident_id", "")).split("|")[-1]
                last_seq = int(last_part)
            except Exception:
                last_seq = 0

    new_seq = last_seq + 1
    seq_str = f"{new_seq:03d}"
    return f"{prefix}|{site_code}|{year}|{seq_str}"

    
# -------------------- INCIDENTS (STATUS + LISTS) --------------------
@app.route("/api/incidents/<incident_id>/status", methods=["PATCH"])
def update_incident_status_patch(incident_id):
    data = request.json or {}
    status = normalize_status(data.get("status"))

    allowed = {"created", "pending", "action_required", "rejected", "approved"}
    if status not in allowed:
        return jsonify({"message": "Invalid status"}), 400

    try:
        doc = incidents_collection.find_one_and_update(
            {"incident_id": incident_id},
            {"$set": {"status": status, "updated_at": now_utc()}},
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )

        department_selection_collection.update_many(
            {"incident_id": incident_id},
            {"$set": {"status": status, "updated_at": now_utc()}}
        )

        doc["_id"] = str(doc["_id"])
        doc["next_step"] = compute_next_step_for_incident(incident_id)
        return jsonify(doc), 200

    except Exception as e:
        return jsonify({"message": f"Error updating status: {e}"}), 500


@app.route("/api/incident/status", methods=["POST"])
def update_incident_status_post_compat():
    data = request.json or {}
    incident_id = data.get("incident_id")
    status = normalize_status(data.get("status"))

    if not incident_id or not status:
        return jsonify({"message": "incident_id and status required"}), 400

    allowed = {"created", "pending", "action_required", "rejected", "approved"}
    if status not in allowed:
        return jsonify({"message": "Invalid status"}), 400

    try:
        incidents_collection.update_one(
            {"incident_id": incident_id},
            {"$set": {"status": status, "updated_at": now_utc()}},
            upsert=True
        )
        department_selection_collection.update_many(
            {"incident_id": incident_id},
            {"$set": {"status": status, "updated_at": now_utc()}}
        )
        return jsonify({"message": "Status updated", "incident_id": incident_id, "status": status}), 200
    except Exception as e:
        return jsonify({"message": f"Error updating status: {e}"}), 500

from datetime import datetime

@app.route("/api/incidents/<incident_id>/department-decision", methods=["POST"])
def department_decision(incident_id):
    try:
        data = request.json

        # ✅ normalize everything
        department = (data.get("department") or "").strip().lower()
        status = (data.get("status") or "").strip().lower()
        decision_by = data.get("decision_by")

        if not department or not status:
            return jsonify({"error": "Missing fields"}), 400

        # ===============================
        # ✅ SAVE / UPDATE DECISION
        # ===============================
        assigned_to_my_dept_collection.update_one(
            {
                "incident_id": incident_id,
                "department": department
            },
            {
                "$set": {
                    "incident_id": incident_id,
                    "department": department,
                    "status": status,
                    "decision_by": decision_by,
                    "updated_at": datetime.utcnow()
                }
            },
            upsert=True
        )

        # ===============================
        # ✅ GET ASSIGNED DEPARTMENTS
        # ===============================
        dept_docs = list(
            department_selection_collection.find({
                "incident_id": incident_id
            })
        )

        assigned_departments = list({
            (d.get("department") or "").strip().lower()
            for d in dept_docs if d.get("department")
        })

        # ===============================
        # ✅ GET DECISIONS
        # ===============================
        decision_docs = list(
            assigned_to_my_dept_collection.find({
                "incident_id": incident_id
            })
        )

        decision_map = {
            (d.get("department") or "").strip().lower():
            (d.get("status") or "").strip().lower()
            for d in decision_docs
        }

        # ===============================
        # ✅ DETERMINE STATUS
        # ===============================
        all_approved = all(
            decision_map.get(dept) == "approved"
            for dept in assigned_departments
        )

        any_rejected = any(
            decision_map.get(dept) == "rejected"
            for dept in assigned_departments
        )

        if all_approved and assigned_departments:
            new_status = "approved"
        elif any_rejected:
            new_status = "rejected"
        else:
            new_status = "action_required"

        # ===============================
        # ✅ UPDATE INCIDENT
        # ===============================
        incidents_collection.update_one(
            {"incident_id": incident_id},
            {"$set": {"status": new_status}}
        )

        return jsonify({
            "message": "Decision saved",
            "status": new_status
        }), 200

    except Exception as e:
        print("ERROR:", e)
        return jsonify({"error": str(e)}), 500
    
@app.route("/api/incidents", methods=["GET"])
def list_all_incidents():
    try:
        # ================================
        # ✅ Helper: normalize department
        # ================================
        DEPT_MAP = {
            "quality assurance": "qa",
            "qa": "qa",
            "quality control": "qc",
            "qc": "qc",
            "warehouse": "warehouse",
            "microbiology": "microbiology",
            "production orals": "production orals",
            "customer": "customer"
        }

        def normalize_dept(dept):
            dept = (dept or "").strip().lower()
            return DEPT_MAP.get(dept, dept)

        # ================================
        # ✅ Step 1: Fetch incidents
        # ================================
        docs = list(
            incidents_collection.find(
                {},
                {
                    "incident_id": 1,
                    "title": 1,
                    "status": 1,
                    "created_at": 1,
                    "updated_at": 1
                }
            )
            .sort("created_at", -1)
            .limit(10)
        )

        incident_ids = [d.get("incident_id") for d in docs]

        # ================================
        # ✅ Step 2: Departments assigned
        # ================================
        dept_all = list(
            department_selection_collection.find(
                {"incident_id": {"$in": incident_ids}}
            )
        )

        dept_map = {}
        for d in dept_all:
            iid = d.get("incident_id")
            dept_map.setdefault(iid, []).append(d)

        # ================================
        # ✅ Step 3: Department decisions
        # ================================
        assigned_all = list(
            assigned_to_my_dept_collection.find(
                {"incident_id": {"$in": incident_ids}}
            )
        )

        assigned_map = {}

        for d in assigned_all:
            iid = d.get("incident_id")
            dept = normalize_dept(d.get("department"))
            status_val = (d.get("status") or "").strip().lower()

            assigned_map.setdefault(iid, {})[dept] = status_val

        # ================================
        # ✅ Step 4: Build response
        # ================================
        out = []

        for d in docs:
            incident_id = d.get("incident_id")

            dept_docs = dept_map.get(incident_id, [])

            created_by_department = ""
            assigned_departments = []

            if dept_docs:
                created_by_department = dept_docs[0].get("selectedDept", "") or ""

                assigned_departments = sorted(list({
                    normalize_dept(x.get("department"))
                    for x in dept_docs if x.get("department")
                }))

            assigned_to_department = ", ".join([
                dept.title() for dept in assigned_departments
            ]) if assigned_departments else ""

            # ================================
            # ✅ FINAL PROGRESS LOGIC
            # ================================
            dept_status = assigned_map.get(incident_id, {})

            statuses = []
            for dept in assigned_departments:
                statuses.append(dept_status.get(dept, "pending"))

            # 🔥 APPLY RULES
            if statuses and all(s == "approved" for s in statuses):
                overall_status = "approved"
                progress = "Approved by all"

            elif statuses and all(s == "rejected" for s in statuses):
                overall_status = "rejected"
                progress = "Rejected by all"

            elif "rejected" in statuses:
                overall_status = "action_required"

                parts = []
                for dept in assigned_departments:
                    s = dept_status.get(dept, "pending")
                    if s == "approved":
                        parts.append(f"Approved by {dept.title()}")
                    elif s == "rejected":
                        parts.append(f"Rejected by {dept.title()}")

                progress = " | ".join(parts)

            else:
                overall_status = "pending"

                parts = []
                for dept in assigned_departments:
                    s = dept_status.get(dept, "pending")
                    parts.append(f"{s.capitalize()} by {dept.title()}")

                progress = " | ".join(parts)

            # ================================
            # ✅ NEXT STEP LOGIC
            # ================================
            if overall_status == "approved":
                next_step = "Completed"
            elif overall_status == "rejected":
                next_step = "Closed"
            elif overall_status == "action_required":
                next_step = "Pending Department Action"
            else:
                next_step = "In Progress"

            out.append({
                "_id": str(d["_id"]),
                "incident_id": incident_id,
                "title": d.get("title", ""),
                "status": overall_status,   # ✅ IMPORTANT CHANGE
                "progress": progress,
                "created_at": d.get("created_at"),
                "updated_at": d.get("updated_at"),
                "created_by_department": created_by_department,
                "assigned_to_department": assigned_to_department,
                "next_step": next_step,
            })

        return jsonify(out), 200

    except Exception as e:
        return jsonify({"message": f"Error listing incidents: {e}"}), 500
    
#----------------- EvaluationComments Disabled textarea -------------------
@app.route("/api/incidents/<incident_id>/selected-departments", methods=["GET"])
def get_selected_departments(incident_id):
    try:
        docs = list(department_selection_collection.find({
            "incident_id": incident_id
        }))

        departments = list({
            d.get("department").strip().lower()
            for d in docs if d.get("department")
        })

        return jsonify(departments), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

#@app.route("/api/incidents/pending", methods=["GET"])
@app.route("/api/incidents/pending-by-department/<department>", methods=["GET"])
def list_pending_incidents_by_department(department):
    try:
        # incidents where this department is either creator or assigned department
        dept_docs = list(
            department_selection_collection.find({
                "$or": [
                    {"selectedDept": department},
                    {"department": department}
                ]
            })
        )

        incident_map = {}

        for d in dept_docs:
            incident_id = d.get("incident_id")
            if not incident_id:
                continue

            if incident_id not in incident_map:
                incident_map[incident_id] = {
                    "created_by_department": d.get("selectedDept", "") or "",
                    "assigned_departments": set(),
                }

            if d.get("department"):
                incident_map[incident_id]["assigned_departments"].add(d.get("department"))

        incident_ids = sorted(list(incident_map.keys()))

        incidents = list(
            incidents_collection.find({
                "incident_id": {"$in": incident_ids},
                "status": {"$in": ["created", "pending"]}
            }).sort("updated_at", -1)
        )

        out = []
        for d in incidents:
            incident_id = d.get("incident_id")
            meta = incident_map.get(incident_id, {})
            assigned_departments = sorted(list(meta.get("assigned_departments", set())))

            out.append({
                "incident_id": incident_id,
                "title": d.get("title", ""),
                "status": d.get("status", "created"),
                "created_at": d.get("created_at"),
                "updated_at": d.get("updated_at"),
                "created_by_department": meta.get("created_by_department", ""),
                "assigned_to_department": ", ".join(assigned_departments) if assigned_departments else "",
                "next_step": compute_next_step_for_incident(incident_id),
            })

        return jsonify(out), 200

    except Exception as e:
        return jsonify({"message": f"Error fetching pending incidents by department: {e}"}), 500



#@app.route("/api/incidents/rejected", methods=["GET"])
@app.route("/api/incidents/rejected-by-department/<department>", methods=["GET"])
def list_rejected_incidents_by_department(department):
    try:
        # incidents where the logged-in department is either the creator or the assigned dept
        dept_docs = list(
            department_selection_collection.find({
                "$or": [
                    {"selectedDept": department},
                    {"department": department}
                ]
            })
        )

        incident_map = {}

        for d in dept_docs:
            incident_id = d.get("incident_id")
            if not incident_id:
                continue

            if incident_id not in incident_map:
                incident_map[incident_id] = {
                    "created_by_department": d.get("selectedDept", "") or "",
                    "assigned_departments": set(),
                }

            if d.get("department"):
                incident_map[incident_id]["assigned_departments"].add(d.get("department"))

        incident_ids = sorted(list(incident_map.keys()))

        incidents = list(
            incidents_collection.find({
                "incident_id": {"$in": incident_ids},
                "status": "rejected"
            }).sort("updated_at", -1)
        )

        out = []
        for d in incidents:
            incident_id = d.get("incident_id")
            meta = incident_map.get(incident_id, {})
            assigned_departments = sorted(list(meta.get("assigned_departments", set())))

            out.append({
                "incident_id": incident_id,
                "title": d.get("title", ""),
                "status": d.get("status", "rejected"),
                "created_at": d.get("created_at"),
                "updated_at": d.get("updated_at"),
                "created_by_department": meta.get("created_by_department", ""),
                "assigned_to_department": ", ".join(assigned_departments) if assigned_departments else "",
                "next_step": default_next_step("rejected"),
            })

        return jsonify(out), 200

    except Exception as e:
        return jsonify({"message": f"Error fetching rejected incidents by department: {e}"}), 500


#@app.route("/api/incidents/action-required", methods=["GET"])
@app.route("/api/incidents/action-required-by-department/<department>", methods=["GET"])
def list_action_required_incidents_by_department(department):
    try:
        dept_docs = list(
            department_selection_collection.find({
                "$or": [
                    {"selectedDept": department},
                    {"department": department}
                ]
            })
        )

        incident_map = {}

        for d in dept_docs:
            incident_id = d.get("incident_id")
            if not incident_id:
                continue

            if incident_id not in incident_map:
                incident_map[incident_id] = {
                    "created_by_department": d.get("selectedDept", "") or "",
                    "assigned_departments": set(),
                }

            if d.get("department"):
                incident_map[incident_id]["assigned_departments"].add(d.get("department"))

        incident_ids = sorted(list(incident_map.keys()))

        incidents = list(
            incidents_collection.find({
                "incident_id": {"$in": incident_ids},
                "status": "action_required"
            }).sort("updated_at", -1)
        )

        out = []
        for d in incidents:
            incident_id = d.get("incident_id")
            meta = incident_map.get(incident_id, {})
            assigned_departments = sorted(list(meta.get("assigned_departments", set())))

            out.append({
                "incident_id": incident_id,
                "title": d.get("title", ""),
                "status": d.get("status", "action_required"),
                "created_at": d.get("created_at"),
                "updated_at": d.get("updated_at"),
                "created_by_department": meta.get("created_by_department", ""),
                "assigned_to_department": ", ".join(assigned_departments) if assigned_departments else "",
                "next_step": compute_next_step_for_incident(incident_id),
            })

        return jsonify(out), 200

    except Exception as e:
        return jsonify({"message": f"Error fetching action required incidents by department: {e}"}), 500
           

  

@app.route("/api/incidents/status/<status>", methods=["GET"])
def get_incidents_by_status_compat(status):
    try:
        status = normalize_status(status)
        docs = list(incidents_collection.find({"status": status}).sort("updated_at", -1))
        out = []
        for d in docs:
            out.append({
                "incident_id": d.get("incident_id"),
                "title": d.get("title", ""),
                "status": d.get("status"),
                "created_at": d.get("created_at"),
                "updated_at": d.get("updated_at"),
                "next_step": compute_next_step_for_incident(d.get("incident_id")),
            })
        return jsonify(out), 200
    except Exception as e:
        return jsonify({"message": f"Error fetching incidents by status: {e}"}), 500
    
# -------------------- ✅ LOGIN PAGE --------------------
@app.route("/api/login", methods=["POST"])
def login():
    data = request.json or {}
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"message": "Username and password required"}), 400

    user = users_collection.find_one({"username": username})
    if not user:
        return jsonify({"message": "Invalid credentials"}), 401

    # TEMP (since you're still using plain passwords)
    if password != user.get("password"):
        return jsonify({"message": "Invalid credentials"}), 401

    return jsonify({
        "user_id": user["user_id"],
        "username": user["username"],
        "department": user["department"],
        "roles": user.get("roles", [])
    }), 200

# -------------------- ✅ User Register --------------------
@app.route("/api/register", methods=["POST"])
def register():
    data = request.json or {}

    username = data.get("username", "").strip()
    password = data.get("password", "").strip()
    department = data.get("department", "").strip()
    role = data.get("role", "Originator")

    if not username or not password or not department:
        return jsonify({"message": "Username, password, and department are required"}), 400

    try:
        existing_user = users_collection.find_one({"username": username})
        if existing_user:
            return jsonify({"message": "Username already exists"}), 409

        # generate next user_id
        last_user = users_collection.find_one(sort=[("user_id", -1)])
        if last_user and last_user.get("user_id"):
            try:
                last_num = int(str(last_user["user_id"]).replace("U", ""))
                next_num = last_num + 1
            except:
                next_num = 1001
        else:
            next_num = 1001

        user_id = f"U{next_num}"

        new_user = {
            "user_id": user_id,
            "username": username,
            "password": password,   # later you can hash this
            "department": department,
            "roles": [role],
            "created_at": now_utc(),
        }

        users_collection.insert_one(new_user)

        return jsonify({
            "message": "User registered successfully",
            "user_id": user_id,
            "username": username,
            "department": department,
            "roles": [role]
        }), 201

    except Exception as e:
        return jsonify({"message": f"Error registering user: {e}"}), 500
# -------------------- ✅ ATTACHMENTS ( AWS + Mongo) --------------------
@app.route("/api/incidents/<incident_id>/attachments", methods=["POST"])
def upload_incident_attachment(incident_id):
    if "file" not in request.files:
        return jsonify({"message": "file is required"}), 400

    f = request.files["file"]
    if not f or not f.filename:
        return jsonify({"message": "empty file"}), 400

    allowed_ext = {"pdf", "png", "jpg", "jpeg", "doc", "docx", "xlsx", "csv", "txt"}
    ext = f.filename.rsplit(".", 1)[-1].lower()
    if ext not in allowed_ext:
        return jsonify({"message": f"File type .{ext} not allowed"}), 400

    s3_key = f"incidents/{incident_id}/{int(datetime.utcnow().timestamp())}_{f.filename}"

    try:
        s3.upload_fileobj(
            f,
            S3_BUCKET,
            s3_key,
            ExtraArgs={"ContentType": f.content_type}
        )

        url = f"https://{S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{s3_key}"

        doc = {
            "incident_id": incident_id,
            "filename": f.filename,
            "content_type": f.content_type,
            "s3_key": s3_key,
            "url": url,
            "created_at": now_utc(),
        }

        ins = attachments_collection.insert_one(doc)

        return jsonify({
            "_id": str(ins.inserted_id),
            "incident_id": incident_id,
            "filename": f.filename,
            "content_type": f.content_type,
            "url": url,
            "created_at": doc["created_at"],
        }), 201

    except ClientError as e:
        return jsonify({"message": f"S3 upload failed: {e}"}), 500

@app.route("/api/incidents/<incident_id>/attachments", methods=["GET"])
def list_incident_attachments(incident_id):
    docs = attachments_collection.find({"incident_id": incident_id}).sort("created_at", -1)
    return jsonify([
        {
            "_id": str(d["_id"]),
            "filename": d["filename"],
            "content_type": d["content_type"],
            "url": d["url"],
            "created_at": d["created_at"],
        } for d in docs
    ]), 200

@app.route("/api/attachments/<attachment_id>", methods=["DELETE"])
def delete_incident_attachment(attachment_id):
    doc = attachments_collection.find_one({"_id": ObjectId(attachment_id)})
    if not doc:
        return jsonify({"message": "Not found"}), 404

    try:
        s3.delete_object(Bucket=S3_BUCKET, Key=doc["s3_key"])
        attachments_collection.delete_one({"_id": ObjectId(attachment_id)})
        return jsonify({"message": "Deleted"}), 200
    except ClientError as e:
        return jsonify({"message": f"S3 delete failed: {e}"}), 500

# -------------------- Tickets by USER department --------------------   
@app.route("/api/incidents/by-user-department/<department>", methods=["GET"])
def get_incidents_by_user_department(department):
    try:
        docs = list(
            department_selection_collection.find({
                "selectedDept": department
            })
        )

        incident_ids = sorted(list({d["incident_id"] for d in docs if d.get("incident_id")}))

        incidents = list(
            incidents_collection.find({"incident_id": {"$in": incident_ids}})
        )

        total = len(incident_ids)
        open_count = len([
            i for i in incidents
            if i.get("status") not in ["approved", "rejected"]
        ])

        return jsonify({
            "department": department,
            "total": total,
            "open": open_count,
            "incident_ids": incident_ids
        }), 200

    except Exception as e:
        return jsonify({"message": f"Error fetching user department tickets: {e}"}), 500
    
# -------------------- Incidents by My Department --------------------  
@app.route("/api/incidents/raised-by-department/<department>", methods=["GET"])
def list_incidents_raised_by_department(department):
    try:
        docs = list(
            department_selection_collection.find({
                "selectedDept": department
            })
        )

        incident_ids = sorted(list({d["incident_id"] for d in docs if d.get("incident_id")}))

        incidents = list(
            incidents_collection.find({"incident_id": {"$in": incident_ids}})
            .sort("updated_at", -1)
        )

        out = []
        for d in incidents:
            out.append({
                "incident_id": d.get("incident_id"),
                "title": d.get("title", ""),
                "status": d.get("status", "created"),
                "created_at": d.get("created_at"),
                "updated_at": d.get("updated_at"),
                "next_step": compute_next_step_for_incident(d.get("incident_id")),
            })

        return jsonify(out), 200

    except Exception as e:
        return jsonify({"message": f"Error fetching incidents raised by department: {e}"}), 500

     
# -------------------- Tickets by OTHER departments --------------------
@app.route("/api/incidents/by-other-department/<department>", methods=["GET"])
def get_incidents_by_other_department(department):
    try:
        docs = list(
            department_selection_collection.find({
                "department": department,
                "selectedDept": {"$ne": department}
            })
        )

        incident_ids = sorted(list({d["incident_id"] for d in docs if d.get("incident_id")}))

        incidents = list(
            incidents_collection.find({"incident_id": {"$in": incident_ids}})
        )

        total = len(incident_ids)
        open_count = len([
            i for i in incidents
            if i.get("status") not in ["approved", "rejected"]
        ])

        return jsonify({
            "department": department,
            "total": total,
            "open": open_count,
            "incident_ids": incident_ids
        }), 200

    except Exception as e:
        return jsonify({"message": f"Error fetching other department tickets: {e}"}), 500

# -------------------- Incidents assigned to my department --------------------  
"""
@app.route("/api/incidents/assigned-to-department/<department>", methods=["GET"])
def list_incidents_assigned_to_department(department):
    try:
        docs = list(
            department_selection_collection.find({
                "department": department,
                "selectedDept": {"$ne": department}
            })
        )

        # map incident_id -> selectedDept
        incident_owner_map = {}
        for d in docs:
            incident_id = d.get("incident_id")
            if incident_id and incident_id not in incident_owner_map:
                incident_owner_map[incident_id] = d.get("selectedDept", "")

        incident_ids = sorted(list(incident_owner_map.keys()))

        incidents = list(
            incidents_collection.find({"incident_id": {"$in": incident_ids}})
            .sort("updated_at", -1)
        )

        out = []
        for d in incidents:
            incident_id = d.get("incident_id")
            out.append({
                "incident_id": incident_id,
                "title": d.get("title", ""),
                "status": d.get("status", "created"),
                "created_at": d.get("created_at"),
                "updated_at": d.get("updated_at"),
                "next_step": compute_next_step_for_incident(incident_id),
                "raised_by_department": incident_owner_map.get(incident_id, ""),
            })

        return jsonify(out), 200

    except Exception as e:
        return jsonify({"message": f"Error fetching incidents assigned to department: {e}"}), 500
"""
from flask import jsonify

@app.route("/api/incidents/assigned-to-department/<dept>", methods=["GET"])
def get_assigned_to_my_department(dept):
    try:
        # ✅ normalize input
        dept = (dept or "").strip().lower()

        results = []

        # ✅ STEP 1: fetch assigned documents (SAFE REGEX)
        assigned_docs = list(department_selection_collection.find({
            "department": {
                "$regex": dept,
                "$options": "i"
            }
        }))

        #print("DEBUG → DEPT:", dept)
        #print("DEBUG → ASSIGNED_DOCS COUNT:", len(assigned_docs))

        # ✅ STEP 2: loop through assigned incidents
        for doc in assigned_docs:
            incident_id = (doc.get("incident_id") or "").strip()

            if not incident_id:
                continue

            # ✅ STEP 3: fetch decision (SAFE)
            decision = assigned_to_my_dept_collection.find_one({
                "incident_id": incident_id,
                "department": {
                    "$regex": dept,
                    "$options": "i"
                }
            }) or {}

            # ✅ STEP 4: fetch incident details (SAFE)
            incident = incidents_collection.find_one({
                "incident_id": incident_id
            }) or {}

            #print("DEBUG → INCIDENT:", incident_id, "→", incident)

            # ✅ STEP 5: build response safely
            results.append({
                "incident_id": incident_id,
                "title": (
                    incident.get("title") or
                    incident.get("description") or
                    incident.get("incident_title")
                ),
                "raised_by_department": incident.get("selectedDept"),
                "created_at": (
                    incident.get("created_at") or
                    incident.get("createdAt")
                ),
                "status": decision.get("status", "pending"),
                "decision_by": decision.get("decision_by")
            })

        return jsonify(results), 200

    except Exception as e:
        print("❌ ERROR:", str(e))
        return jsonify({"error": str(e)}), 500
    
# -------------------- 1) DEPARTMENT SELECTION --------------------
@app.route("/api/selection", methods=["GET"])
def get_department_selection():
    try:
        docs = list(department_selection_collection.find({}))
        out = []
        for d in docs:
            out.append({
                "_id": str(d.get("_id")),
                "incident_id": d.get("incident_id"),
                "department": d.get("department"),
                "selectedDept": d.get("selectedDept"),
                "incidentType": d.get("incidentType"),
                "approval": bool(d.get("approval", False)),
                "informed": bool(d.get("informed", False)),
                "status": d.get("status", "created"),
                "created_at": d.get("created_at"),
                "updated_at": d.get("updated_at"),
            })
        return jsonify(out), 200
    except Exception as e:
        return jsonify({"message": f"Error fetching selections: {e}"}), 500
from datetime import datetime

@app.route("/api/selection", methods=["POST"])
def save_department_selection():
    data = request.json or {}

    table_departments = data.get("tableDepartments", [])
    checked_states = data.get("checkedStates", [])
    selected_dept = data.get("selectedDept", "")
    incident_type = data.get("selectedIncident", "")

    if not selected_dept or not incident_type:
        return jsonify({"message": "selectedDept and selectedIncident are required"}), 400

    try:
        incident_id = generate_incident_id(site_code="PS")
        now = now_utc()

        docs = []
        for dept, state in zip(table_departments, checked_states):
            approval = bool(state.get("approval", False))
            informed = bool(state.get("informed", False))

            if not approval and not informed:
                continue

            docs.append({
                "incident_id": incident_id,
                "department": dept,
                "selectedDept": selected_dept,
                "incidentType": incident_type,
                "approval": approval,
                "informed": informed,
                "status": "created",

                # NEW: per-department decision tracking
                "decision_status": "pending",
                "decision_by": "",
                "decision_at": None,
                "decision_comment": "",

                "created_at": now,
                "updated_at": now,
            })

        if docs:
            department_selection_collection.insert_many(docs)

        incidents_collection.update_one(
            {"incident_id": incident_id},
            {"$setOnInsert": {
                "incident_id": incident_id,
                "status": "created",
                "created_at": now,
                "updated_at": now,
                "selectedDept": selected_dept,
                "incidentType": incident_type,
                "title": "",
            }},
            upsert=True,
        )

        return jsonify({"message": "Department selections saved", "incident_id": incident_id}), 201

    except Exception as e:
        return jsonify({"message": f"Error saving selections: {e}"}), 500
    

def recalculate_incident_status(incident_id: str):
    rows = list(department_selection_collection.find({
        "incident_id": incident_id,
        "approval": True
    }))

    if not rows:
        incidents_collection.update_one(
            {"incident_id": incident_id},
            {"$set": {"status": "created", "updated_at": now_utc()}},
            upsert=True
        )
        return

    statuses = [r.get("decision_status", "pending") for r in rows]

    # nobody acted yet
    if all(s == "pending" for s in statuses):
        incident_status = "created"

    # all approved
    elif all(s == "approved" for s in statuses):
        incident_status = "approved"

    # all rejected
    elif all(s == "rejected" for s in statuses):
        incident_status = "rejected"

    # mixed state: some approved / rejected / under_review / pending
    else:
        incident_status = "action_required"

    incidents_collection.update_one(
        {"incident_id": incident_id},
        {"$set": {"status": incident_status, "updated_at": now_utc()}},
        upsert=True
    )

def build_progress_text(incident_id: str) -> str:
    rows = list(department_selection_collection.find({
        "incident_id": incident_id,
        "approval": True
    }))

    if not rows:
        return "Created"

    approved = [r["department"] for r in rows if r.get("decision_status") == "approved"]
    rejected = [r["department"] for r in rows if r.get("decision_status") == "rejected"]
    under_review = [r["department"] for r in rows if r.get("decision_status") == "under_review"]
    pending = [r["department"] for r in rows if r.get("decision_status", "pending") == "pending"]

    # all approved
    if len(approved) == len(rows):
        return "Approved by all"

    # all rejected
    if len(rejected) == len(rows):
        return "Rejected by all"

    parts = []

    if approved:
        parts.append(f"Approved by {', '.join(approved)}")
    if rejected:
        parts.append(f"Rejected by {', '.join(rejected)}")
    if under_review:
        parts.append(f"Under review by {', '.join(under_review)}")
    if pending:
        parts.append(f"Pending {', '.join(pending)}")

    return ", ".join(parts) if parts else "Created"


"""
@app.route("/api/incidents/<incident_id>/department-decision", methods=["POST"])
def update_department_decision(incident_id):
    data = request.json or {}
    department = data.get("department")
    decision_status = data.get("decision_status")
    decision_by = data.get("decision_by", "")
    decision_comment = data.get("decision_comment", "")

    allowed = {"pending", "under_review", "approved", "rejected"}
    if not department or decision_status not in allowed:
        return jsonify({"message": "department and valid decision_status are required"}), 400

    try:
        result = department_selection_collection.update_one(
            {"incident_id": incident_id, "department": department},
            {
                "$set": {
                    "decision_status": decision_status,
                    "decision_by": decision_by,
                    "decision_comment": decision_comment,
                    "decision_at": now_utc(),
                    "updated_at": now_utc(),
                }
            }
        )

        if result.matched_count == 0:
            return jsonify({"message": "Department assignment not found"}), 404

        recalculate_incident_status(incident_id)

        return jsonify({"message": "Department decision updated"}), 200

    except Exception as e:
        return jsonify({"message": f"Error updating department decision: {e}"}), 500
"""

# -------------------- 2) GENERAL INFORMATION --------------------
@app.route("/api/general/<incident_id>", methods=["GET"])
def get_general_info(incident_id):
    try:
        doc = general_info_collection.find_one({"incident_id": incident_id})
        if not doc:
            return jsonify({"message": "Not found"}), 404

        result = {k: v for k, v in doc.items() if k != "_id"}
        result["_id"] = str(doc["_id"])
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"message": f"Error fetching general info: {e}"}), 500


@app.route("/submit", methods=["POST"])
def submit_general_info():
    data = request.json or {}
    incident_id = data.get("incident_id")

    if not incident_id:
        return jsonify({"message": "incident_id is required"}), 400

    doc = {
        "incident_id": incident_id,
        "originator": data.get("Originator"),
        "title": data.get("Title"),
        "original_date_due": data.get("Original Date Due"),
        "date_opened": data.get("Date Opened"),
        "date_due": data.get("Date Due"),
        "quality_approver": data.get("Quality Approver"),
        "quality_reviewer": data.get("Quality Reviewer"),
        "supervisor_manager": data.get("Supervisor"),
        "description": data.get("Description"),
        "batch_no": data.get("BatchNo"),
        "updated_at": now_utc(),
    }

    try:
        general_info_collection.update_one(
            {"incident_id": incident_id},
            {"$set": doc, "$setOnInsert": {"created_at": now_utc()}},
            upsert=True,
        )

        incidents_collection.update_one(
            {"incident_id": incident_id},
            {"$set": {
                "title": data.get("Title") or "",
                "updated_at": now_utc(),
                "date_opened": data.get("Date Opened"),
            }},
            upsert=True
        )

        saved = general_info_collection.find_one({"incident_id": incident_id})
        mongo_id = str(saved["_id"]) if saved else None

        return jsonify({"message": "General info saved", "mongo_id": mongo_id, "incident_id": incident_id}), 200

    except Exception as e:
        return jsonify({"message": f"Error saving general info: {e}"}), 500


# -------------------- 3) DEVIATION INFORMATION --------------------
@app.route("/api/deviation/<incident_id>", methods=["GET"])
def get_deviation_info(incident_id):
    try:
        doc = deviation_info_collection.find_one({"incident_id": incident_id})
        if not doc:
            return jsonify({"message": "Not found"}), 404

        result = {k: v for k, v in doc.items() if k != "_id"}
        result["_id"] = str(doc["_id"])
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"message": f"Error fetching deviation info: {e}"}), 500


@app.route("/api/deviation", methods=["POST"])
def save_deviation_info():
    data = request.json or {}
    incident_id = data.get("incident_id")
    if not incident_id:
        return jsonify({"message": "incident_id is required"}), 400

    doc = {
        "incident_id": incident_id,
        "title": data.get("title"),
        "description": data.get("description"),
        "standard": data.get("standard"),
        "standard_na": bool(data.get("standard_na")),
        "immediate_action": data.get("immediate_action"),
        "immediate_action_na": bool(data.get("immediate_action_na")),
        "reviewer_remarks": data.get("reviewer_remarks"),
        "updated_at": now_utc(),
    }

    try:
        deviation_info_collection.update_one(
            {"incident_id": incident_id},
            {"$set": doc, "$setOnInsert": {"created_at": now_utc()}},
            upsert=True,
        )

        incidents_collection.update_one(
            {"incident_id": incident_id},
            {"$set": {"updated_at": now_utc()}},
            upsert=True
        )

        return jsonify({"message": "Deviation info saved", "incident_id": incident_id}), 200
    except Exception as e:
        return jsonify({"message": f"Error saving deviation info: {e}"}), 500


# -------------------- 4) PRELIMINARY INVESTIGATION --------------------
@app.route("/api/preliminary/<incident_id>", methods=["GET"])
def get_preliminary(incident_id):
    try:
        doc = preliminary_collection.find_one({"incident_id": incident_id})
        if not doc:
            return jsonify({"message": "Not found"}), 404

        result = {k: v for k, v in doc.items() if k != "_id"}
        result["_id"] = str(doc["_id"])
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"message": f"Error fetching preliminary: {e}"}), 500


@app.route("/api/preliminary", methods=["POST"])
def save_preliminary():
    data = request.json or {}
    incident_id = data.get("incident_id")
    if not incident_id:
        return jsonify({"message": "incident_id is required"}), 400

    doc = {
        "incident_id": incident_id,
        "investigation_html": data.get("investigation_html"),
        "investigation_na": bool(data.get("investigation_na")),
        "reviewer_html": data.get("reviewer_html"),
        "reviewer_na": bool(data.get("reviewer_na")),
        "updated_at": now_utc(),
    }

    try:
        preliminary_collection.update_one(
            {"incident_id": incident_id},
            {"$set": doc, "$setOnInsert": {"created_at": now_utc()}},
            upsert=True,
        )
        incidents_collection.update_one(
            {"incident_id": incident_id},
            {"$set": {"updated_at": now_utc()}},
            upsert=True
        )
        return jsonify({"message": "Preliminary investigation saved", "incident_id": incident_id}), 200
    except Exception as e:
        return jsonify({"message": f"Error saving preliminary: {e}"}), 500


# -------------------- 5) RCA --------------------
@app.route("/api/rca/<incident_id>", methods=["GET"])
def get_rca(incident_id):
    try:
        doc = rca_collection.find_one({"incident_id": incident_id})
        if not doc:
            return jsonify({"message": "Not found"}), 404

        result = {k: v for k, v in doc.items() if k != "_id"}
        result["_id"] = str(doc["_id"])
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"message": f"Error fetching RCA: {e}"}), 500


@app.route("/api/rca", methods=["POST"])
def save_rca():
    data = request.json or {}
    incident_id = data.get("incident_id")
    if not incident_id:
        return jsonify({"message": "incident_id is required"}), 400

    doc = {
        "incident_id": incident_id,
        "root_cause_html": data.get("root_cause_html"),
        "root_cause_na": bool(data.get("root_cause_na")),
        "action": data.get("action", []),
        "action_na": bool(data.get("action_na")),
        "justification_html": data.get("justification_html"),
        "justification_na": bool(data.get("justification_na")),
        "remarks": data.get("remarks"),
        "remarks_na": bool(data.get("remarks_na")),
        "updated_at": now_utc(),
    }

    try:
        rca_collection.update_one(
            {"incident_id": incident_id},
            {"$set": doc, "$setOnInsert": {"created_at": now_utc()}},
            upsert=True,
        )
        incidents_collection.update_one(
            {"incident_id": incident_id},
            {"$set": {"updated_at": now_utc()}},
            upsert=True
        )
        return jsonify({"message": "RCA saved", "incident_id": incident_id}), 200
    except Exception as e:
        return jsonify({"message": f"Error saving RCA: {e}"}), 500


# -------------------- 6) CAPA --------------------
@app.route("/api/capa/<incident_id>", methods=["GET"])
def get_capa(incident_id):
    try:
        doc = capa_collection.find_one({"incident_id": incident_id})
        if not doc:
            return jsonify({"message": "Not found"}), 404

        result = {k: v for k, v in doc.items() if k != "_id"}
        result["_id"] = str(doc["_id"])
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"message": f"Error fetching CAPA: {e}"}), 500


@app.route("/api/capa", methods=["POST"])
def save_capa():
    data = request.json or {}
    incident_id = data.get("incident_id")
    if not incident_id:
        return jsonify({"message": "incident_id is required"}), 400

    doc = {
        "incident_id": incident_id,
        "corrective_html": data.get("corrective_html"),
        "corrective_na": bool(data.get("corrective_na")),
        "preventive_html": data.get("preventive_html"),
        "preventive_na": bool(data.get("preventive_na")),
        "dept_head_html": data.get("dept_head_html"),
        "dept_head_na": bool(data.get("dept_head_na")),
        "reviewer_remarks": data.get("reviewer_remarks"),
        "updated_at": now_utc(),
    }

    try:
        capa_collection.update_one(
            {"incident_id": incident_id},
            {"$set": doc, "$setOnInsert": {"created_at": now_utc()}},
            upsert=True,
        )
        incidents_collection.update_one(
            {"incident_id": incident_id},
            {"$set": {"updated_at": now_utc()}},
            upsert=True
        )
        return jsonify({"message": "CAPA saved", "incident_id": incident_id}), 200
    except Exception as e:
        return jsonify({"message": f"Error saving CAPA: {e}"}), 500


# -------------------- 7) EVALUATION COMMENTS --------------------

@app.route("/api/evaluation/<incident_id>", methods=["GET"])
def get_evaluation(incident_id):
    try:
        doc = evaluation_collection.find_one({"incident_id": incident_id})
        if not doc:
            return jsonify({"message": "Not found"}), 404

        result = {k: v for k, v in doc.items() if k != "_id"}
        result["_id"] = str(doc["_id"])
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"message": f"Error fetching evaluation: {e}"}), 500


@app.route("/api/evaluation", methods=["POST"])
def save_evaluation():
    data = request.json or {}
    incident_id = data.get("incident_id")
    departments = data.get("departments", {})

    if not incident_id:
        return jsonify({"message": "incident_id is required"}), 400

    doc = {
        "incident_id": incident_id,
        "departments": departments,
        "updated_at": now_utc(),
    }

    try:
        evaluation_collection.update_one(
            {"incident_id": incident_id},
            {"$set": doc, "$setOnInsert": {"created_at": now_utc()}},
            upsert=True,
        )

        incidents_collection.update_one(
            {"incident_id": incident_id},
            {"$set": {"updated_at": now_utc()}},
            upsert=True
        )

        return jsonify({"message": "Evaluation comments saved", "incident_id": incident_id}), 200
    except Exception as e:
        return jsonify({"message": f"Error saving evaluation: {e}"}), 500

# -------------------- 8) QA COMMENTS --------------------
@app.route("/api/qacomment/<incident_id>", methods=["GET"])
def get_qacomment(incident_id):
    try:
        doc =  qa_collection.find_one({"incident_id": incident_id})
        if not doc:
            return jsonify({"message": "Not found"}), 404

        result = {k: v for k, v in doc.items() if k != "_id"}
        result["_id"] = str(doc["_id"])
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"message": f"Error fetching evaluation: {e}"}), 500


@app.route("/api/qacomment", methods=["POST"])
def save_qacomment():
    data = request.json or {}
    incident_id = data.get("incident_id")
    if not incident_id:
        return jsonify({"message": "incident_id is required"}), 400

    doc = {
        "incident_id": incident_id,
        "qa_eval_html": data.get("qa_eval_html"),
        "qa_na": bool(data.get("qa_na")),
        "impact_html": data.get("impact_html"),
        "impact_na": bool(data.get("impact_na")),
        "final_eval_html": data.get("final_eval_html"),
        "final_na": bool(data.get("final_na")),
        "designee_name": data.get("designee_name"),
        "updated_at": now_utc(),
    }

    try:
        qa_collection.update_one(
            {"incident_id": incident_id},
            {"$set": doc, "$setOnInsert": {"created_at": now_utc()}},
            upsert=True,
        )

        incidents_collection.update_one(
            {"incident_id": incident_id},
            {"$set": {"updated_at": now_utc()}},
            upsert=True
        )

        return jsonify({"message": "QA comments saved", "incident_id": incident_id}), 200
    except Exception as e:
        return jsonify({"message": f"Error saving evaluation: {e}"}), 500

""" # -------------------- 7) EVALUATION COMMENTS --------------------
@app.route("/api/evaluation/<incident_id>", methods=["GET"])
def get_evaluation(incident_id):
    try:
        doc =  evaluation_collection.find_one({"incident_id": incident_id})
        if not doc:
            return jsonify({"message": "Not found"}), 404

        result = {k: v for k, v in doc.items() if k != "_id"}
        result["_id"] = str(doc["_id"])
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"message": f"Error fetching evaluation: {e}"}), 500


@app.route("/api/evaluation", methods=["POST"])
def save_evaluation():
    data = request.json or {}
    incident_id = data.get("incident_id")
    if not incident_id:
        return jsonify({"message": "incident_id is required"}), 400

    doc = {
        "incident_id": incident_id,
        "qa_eval_html": data.get("qa_eval_html"),
        "qa_na": bool(data.get("qa_na")),
        "impact_html": data.get("impact_html"),
        "impact_na": bool(data.get("impact_na")),
        "final_eval_html": data.get("final_eval_html"),
        "final_na": bool(data.get("final_na")),
        "designee_name": data.get("designee_name"),
        "updated_at": now_utc(),
    }

    try:
        evaluation_collection.update_one(
            {"incident_id": incident_id},
            {"$set": doc, "$setOnInsert": {"created_at": now_utc()}},
            upsert=True,
        )

        incidents_collection.update_one(
            {"incident_id": incident_id},
            {"$set": {"updated_at": now_utc()}},
            upsert=True
        )

        return jsonify({"message": "Evaluation comments saved", "incident_id": incident_id}), 200
    except Exception as e:
        return jsonify({"message": f"Error saving evaluation: {e}"}), 500 """


# -------------------- OPTIONAL: QUICK "EXIT ANYWHERE" MARK AS PENDING --------------------
@app.route("/api/incidents/<incident_id>/mark-pending", methods=["POST"])
def mark_pending(incident_id):
    try:
        incidents_collection.update_one(
            {"incident_id": incident_id},
            {"$set": {"status": "pending", "updated_at": now_utc()}},
            upsert=True
        )
        department_selection_collection.update_many(
            {"incident_id": incident_id},
            {"$set": {"status": "pending", "updated_at": now_utc()}}
        )
        return jsonify({"message": "Marked pending", "incident_id": incident_id}), 200
    except Exception as e:
        return jsonify({"message": f"Error marking pending: {e}"}), 500


if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
