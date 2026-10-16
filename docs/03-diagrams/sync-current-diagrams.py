"""Generate current access diagrams and annotate implemented versus planned workflow steps."""
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
BASE = "whiteSpace=wrap;html=1;fontFamily=Arial;fontSize=14;"


def cell(root, name, value, x, y, width, height, style, parent="1"):
    element = ET.SubElement(root, "mxCell", id=name, value=value, style=BASE + style,
                            vertex="1", parent=parent)
    ET.SubElement(element, "mxGeometry", x=str(x), y=str(y), width=str(width),
                  height=str(height), **{"as": "geometry"})
    return element


def edge(root, name, source, target, value="", generalization=False, include=False):
    style = "endArrow=block;endFill=0;" if generalization else (
        "endArrow=open;dashed=1;" if include else "endArrow=none;")
    element = ET.SubElement(root, "mxCell", id=name, source=source, target=target,
                            value=value, edge="1", parent="1",
                            style="html=1;fontFamily=Arial;fontSize=13;edgeStyle=none;rounded=0;" + style
                            + ("exitX=1;exitY=0.5;entryX=0;entryY=0.5;" if include else ""))
    ET.SubElement(element, "mxGeometry", relative="1", **{"as": "geometry"})
    return element


def page(mxfile, identity, name, height=1250):
    diagram = ET.SubElement(mxfile, "diagram", id=identity, name=name)
    model = ET.SubElement(diagram, "mxGraphModel", grid="1", gridSize="10", page="1",
                          pageWidth="1400", pageHeight=str(height), background="#ffffff")
    root = ET.SubElement(model, "root")
    ET.SubElement(root, "mxCell", id="0")
    ET.SubElement(root, "mxCell", id="1", parent="0")
    return diagram, root


def write(mxfile, name):
    ET.indent(mxfile, space="  ")
    (ROOT / name).write_text(ET.tostring(mxfile, encoding="unicode") + "\n")


def use_cases():
    mxfile = ET.Element("mxfile", host="app.diagrams.net", modified="2026-10-15", type="device")
    _, root = page(mxfile, "page0", "All users", 700)
    cell(root, "title", "UCMS - Actors and fixed club access", 220, 20, 1050, 45, "text;fontSize=24;fontStyle=1;")
    actors = [("User", 650, 100), ("Student", 400, 240), ("ICPDP Officer", 950, 240),
              ("Club Member", 400, 390), ("Club Leader", 400, 540)]
    for label, x, y in actors:
        cell(root, label, label, x, y, 120, 100, "shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;")
    for i, (child, parent) in enumerate([("Student", "User"), ("ICPDP Officer", "User"),
                                         ("Club Member", "Student"), ("Club Leader", "Club Member")]):
        edge(root, "inherit" + str(i), child, parent, generalization=True)
    for i, label in enumerate(["Sign in with Google", "View dashboard"]):
        cell(root, "common" + str(i), label, 920, 75 + i * 80, 350, 56,
             "ellipse;fillColor=#ffffff;strokeColor=#000000;")
        edge(root, "common-assoc" + str(i), "User", "common" + str(i))
    cell(root, "fixed", "Club Leader: confirmed president or vice president in the active term.<br>"
         "Both receive the same 14 club permissions.<br>Club Member: no management permissions.<br>"
         "No custom club roles. UC23 withdrawn.", 720, 420, 580, 150,
         "shape=note;fillColor=#fff2cc;strokeColor=#d6b656;")
    pages = [
        ("page1", "Student", "Student", "User", [
            ("Manage club participation", ["Browse clubs and events", "Submit club application", "Apply for membership"]),
            ("Manage event participation", ["Register for event", "Check in", "Submit event feedback"]),
            ("Manage my feedback", ["Submit feedback to club or ICPDP", "View my sent feedback"])],
         "UC06/07/17/29/31/48/50. Client requires sign-in, including discovery pages. UC50 is one-way feedback."),
        ("page4", "Club Member - Events & bookings", "Club Member", "Student", [
            ("Manage my membership", ["View member workspace", "Request to leave club"]),
            ("View club information", ["View member names and positions", "View board and upcoming events"]),
            ("Reconfirm membership", ["Confirm membership for the new semester"])],
         "UC21 A2/22/24. The roster is read through member-space. Allocated rooms require Leader permission; members cannot view UC58."),
        ("page2", "Club Leader", "Club Leader", "Club Member", [
            ("Manage board", ["Nominate board", "Plan leadership transition"]),
            ("Manage club status", ["Request club suspension"])],
         "UC10/12/14. ICPDP confirms the transition (UC13) and decides the suspension request (UC15). UC23 withdrawn."),
        ("page3", "Club Leader - Club & recruitment", "Club Leader", "Club Member", [
            ("Manage club profile", ["View club profile", "Update club information", "Define departments"]),
            ("Manage recruitment", ["Create or update recruitment campaign", "Publish or cancel campaign"]),
            ("Manage applications and members", ["Screen applications", "Record candidate evaluation", "Onboard members", "Update membership status"])],
         "UC09/16/18/19/20/21. UC21 A2: a job opens semester reconfirmation; Leaders are exempt. No role/permission configuration."),
        ("page5", "Club Leader - Events, bookings & finance", "Club Leader", "Club Member", [
            ("Manage events", ["Submit event proposal", "Publish event", "Cancel or reschedule event", "Manage waitlist"]),
            ("Manage accountability", ["Check in attendees manually", "Finalize attendance", "Submit event report", "Review event feedback"]),
            ("Manage facilities and feedback", ["Request non-room facility booking", "Cancel or release facility booking", "View allocated rooms", "Read club feedback inbox"]),
            ("Manage reporting and compliance", ["Record expenses and submit settlement", "Submit periodic report", "Respond to school event invitation", "Explain violation and submit corrective action", "View published evaluation"])],
         "UC25/27/28/30/31/32/33/36/38/40/43/45/47/49/50/54/58. UC52 withdrawn."),
        ("page6", "ICPDP 1 - Access & club lifecycle", "ICPDP Officer", "User", [
            ("Manage access and configuration", ["Manage accounts and system roles", "Configure policy and deadlines", "Manage club fields"]),
            ("Manage club lifecycle", ["Decide club application", "Confirm board", "Confirm leadership transition", "Decide suspension request", "Suspend, reactivate or dissolve club"])],
         "UC03/04/08/11/13/15. UC05 withdrawn; one ICPDP officer decision. UC08 creates an Active club and confirmed founding board; overdue revisions expire automatically."),
        ("page7", "ICPDP 2 - Events, bookings & finance", "ICPDP Officer", "User", [
            ("Manage events and finance", ["Decide event proposal", "Close event report", "Record disbursement", "Reconcile budget", "Create and publish school event"]),
            ("Manage facilities", ["Manage properties", "Decide non-room facility request", "Allocate club room by semester", "Revoke room allocation"])],
         "UC26/34/35/37/44/46/53/58. UC37 forced reconciliation (A2) never tops up beyond the advance."),
        ("page8", "ICPDP 3 - Compliance & evaluation", "ICPDP Officer", "User", [
            ("Manage compliance", ["Assess periodic report", "Manage violation case", "Read feedback sent to ICPDP"]),
            ("Manage evaluation", ["Request periodic report revision", "Approve periodic report", "Configure evaluation scheme", "Generate evaluation draft", "Publish evaluation"]),
            ("Manage data export", ["Preview and export data"])],
         "UC39/40/41/42/43/50/55. UC39 reviews UC38 submissions and resubmissions. UC51/52 complaint workflow is out of scope.")]
    for identity, name, actor, parent, groups, note in pages:
        height = max(800, sum(max(1, len(items)) * 70 + 70 for _, items in groups) + 190)
        _, root = page(mxfile, identity, name, height)
        cell(root, "title", "UCMS - " + name, 230, 10, 1080, 45, "text;fontSize=23;fontStyle=1;")
        cell(root, "boundary", "UCMS", 240, 75, 1080, height - 200,
             "rounded=0;fillColor=none;strokeColor=#000000;verticalAlign=top;fontStyle=1;align=left;spacing=12;")
        cell(root, "actor", actor, 60, 240, 110, 110, "shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;")
        cell(root, "ancestor", parent, 60, 90, 110, 90, "shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;")
        edge(root, "inherit", "actor", "ancestor", generalization=True)
        y = 130
        for j, (group, children) in enumerate(groups):
            center = y + (len(children) - 1) * 35
            group_id = "group" + str(j)
            cell(root, group_id, group, 310, center, 280, 56, "ellipse;fillColor=#ffffff;strokeColor=#000000;")
            edge(root, group_id + "actor", "actor", group_id)
            for k, label in enumerate(children):
                child_id = group_id + "child" + str(k)
                cell(root, child_id, label, 840, y + k * 70, 370, 56,
                     "ellipse;fillColor=#ffffff;strokeColor=#000000;")
                edge(root, child_id + "include", group_id, child_id, "«include»", include=True)
            y += len(children) * 70 + 70
        cell(root, "status", "Implementation snapshot 2026-10-15<br>" + note, 260, height - 105, 1040, 85,
             "shape=note;fillColor=#fff2cc;strokeColor=#d6b656;fontSize=13;")
    write(mxfile, "UCMS_UseCase_ByActor.drawio")


def context():
    mxfile = ET.Element("mxfile", host="app.diagrams.net", modified="2026-10-15", type="device")
    _, root = page(mxfile, "context-v2-1", "Context diagram v2.1", 1150)
    cell(root, "title", "UCMS - Current code context (2026-10-15)", 230, 20, 1050, 45, "text;fontSize=24;fontStyle=1;")
    cell(root, "sys", "UCMS<br>React SPA + Express API", 550, 360, 330, 220,
         "ellipse;fillColor=#dae8fc;strokeColor=#6c8ebf;fontStyle=1;fontSize=22;")
    entities = [("student", "Student", 20, 80), ("member", "Club Member", 20, 700),
                ("leader", "Club Leader", 1030, 80), ("icpdp", "ICPDP Officer", 1030, 700)]
    labels = {
        "student": ("Applications, registration, check-in, feedback", "Discovery, own applications and registrations"),
        "member": ("Own membership and participation requests", "Member workspace and read-only roster"),
        "leader": ("Club profile, board, recruitment, events, reports, facilities", "Decisions, attendance, feedback and allocated rooms"),
        "icpdp": ("Policy, decisions, lifecycle, finance, evaluation, room allocations", "Review queues, club data, feedback and exports")}
    for identity, label, x, y in entities:
        cell(root, identity, label, x, y, 330, 100, "rounded=0;fillColor=#f5f5f5;strokeColor=#666666;fontStyle=1;")
        for direction in (0, 1):
            source, target = (identity, "sys") if direction == 0 else ("sys", identity)
            e = edge(root, identity + str(direction), source, target, labels[identity][direction])
            e.set("style", e.get("style").replace("endArrow=none;", "endArrow=classic;") + "fontSize=12;labelBackgroundColor=#ffffff;")
            e.find("mxGeometry").set("y", "22")
    for i, (identity, text) in enumerate([("oauth", "Google OAuth"), ("files", "Cloudinary")]):
        cell(root, identity, text, 490 + i * 230, 900, 210, 70, "rounded=0;fillColor=#e1d5e7;strokeColor=#9673a6;")
        e = edge(root, identity + "external", "sys", identity, "Authentication" if i == 0 else "Upload / private download")
        e.set("style", e.get("style").replace("endArrow=none;", "endArrow=classic;startArrow=classic;") + "fontSize=12;")
    cell(root, "status", "Current limitations: UC50 is one-way feedback. UC05/23/51/52 withdrawn.<br>Google SMTP remains a design dependency; no mail delivery worker is wired in main.ts.",
         280, 1020, 850, 100, "shape=note;fillColor=#fff2cc;strokeColor=#d6b656;fontSize=13;")
    write(mxfile, "UCMS_Context_Diagram_v2.1.drawio")


def workflows():
    mxfile = ET.parse(ROOT / "UCMS_Swimlane_Flows.drawio").getroot()
    notes = {
        "swim-02": "Club-side UC12 plan, return and resubmission and ICPDP UC13 confirmation are implemented.",
        "swim-06": "UC35-UC37 are wired into the main app: receipts required (BR25), recovery due in 7 days (BR58), no top-up in forced reconciliation.",
        "swim-10": "Club-side UC38 draft, submission and resubmission and ICPDP UC39 review are implemented end to end.",
        "swim-11": "ICPDP records cases; the club explains and submits corrective evidence in its compliance screen.",
        "swim-13": "Club-side UC14 request with impact acknowledgement and ICPDP UC15 decision and job are implemented."}
    for diagram in mxfile.findall("diagram"):
        root = diagram.find(".//root")
        if diagram.get("id") in notes:
            for existing in list(root):
                if existing.get("id") == "current-implementation":
                    root.remove(existing)
            if diagram.get("annotationShifted") != "1":
                for existing in list(root):
                    geometry = existing.find("mxGeometry")
                    if existing.get("vertex") == "1" and geometry is not None and existing.get("id") != "f" + diagram.get("id")[-2:] + "-1":
                        if geometry.get("y") is not None:
                            geometry.set("y", str(float(geometry.get("y")) + 80))
                    for point in existing.findall(".//mxPoint"):
                        if point.get("y") is not None:
                            point.set("y", str(float(point.get("y")) + 80))
                diagram.set("annotationShifted", "1")
            cell(root, "current-implementation", "Implementation snapshot 2026-10-15: " + notes[diagram.get("id")],
                 30, 65, 1200, 55, "shape=note;fillColor=#fff2cc;strokeColor=#d6b656;fontSize=13;")
        if diagram.get("id") == "swim-09":
            diagram.set("name", "09 Student Feedback")
            for child in list(diagram):
                diagram.remove(child)
            temporary = ET.Element("mxfile")
            generated, new_root = page(temporary, "feedback", "Student Feedback", 700)
            diagram.append(generated.find("mxGraphModel"))
            cell(new_root, "title", "Flow 9 - One-way Student Feedback", 30, 20, 1150, 50, "text;fontSize=23;fontStyle=1;")
            steps = ["Student chooses CLUB or ICPDP, category, message and anonymity",
                     "UCMS validates recipient and linked club/event; saves Submitted in complaints",
                     "Student reads own history; recipient reads only its inbox",
                     "Anonymous feedback omits sender identity; no triage, reply, withdraw or SLA"]
            for i, text in enumerate(steps):
                cell(new_root, "step" + str(i), text, 260, 120 + i * 130, 800, 80,
                     "rounded=1;fillColor=#dae8fc;strokeColor=#6c8ebf;")
                if i:
                    e = edge(new_root, "flow" + str(i), "step" + str(i-1), "step" + str(i))
                    e.set("style", e.get("style").replace("endArrow=none;", "endArrow=classic;"))
    write(mxfile, "UCMS_Swimlane_Flows.drawio")
    mxfile = ET.parse(ROOT / "UCMS_Organization_and_Flows.drawio").getroot()
    for c in mxfile.findall(".//mxCell"):
        value = c.get("value", "")
        if "Submit complaint" in value:c.set("value", value.replace("Submit complaint", "Submit one-way feedback"))
        if "F7 Feedback & complaint" in value:c.set("value", "F7 Event feedback & student feedback")
        if "Triage" in value or "triage" in value or "Forward" in value or "forward" in value:
            c.set("value", "Read recipient inbox (no complaint workflow)")
    for diagram in mxfile.findall("diagram"):
        root = diagram.find(".//root")
        removed = {"s6_5", "s6_6"}
        for c in list(root):
            if c.get("id") in removed or c.get("source") in removed or c.get("target") in removed:
                root.remove(c)
    write(mxfile, "UCMS_Organization_and_Flows.drawio")


if __name__ == "__main__":
    use_cases()
    context()
    workflows()
