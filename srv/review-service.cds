using { aidcm } from '../db/schema';

/* 1st/2nd Level Reviewer + Escalation Manager dashboards, and the CON01-style rule scan */
service ReviewService @(path: '/odata/v4/review') {
  entity ReviewRecords as projection on aidcm.ReviewRecords;
  entity AuditLog      as projection on aidcm.AuditLog;
  entity SourceSystemUsers as projection on aidcm.SourceSystemUsers;

  // Scans SourceSystemUsers against active SystemControlMapping rules, creates new ReviewRecords
  action runControlScan() returns Integer;

  // Approve / Reject (finalizes) or Escalate (advances to next review level)
  action decide(
    ID                : UUID,
    decision          : String,
    reasonForApproval : String,
    comments          : String,
    actorEmail        : String
  ) returns ReviewRecords;
}
