namespace aidcm;

using { cuid, managed } from '@sap/cds/common';

entity Users {
  key ID       : UUID;
  email        : String(150) @assert.unique;
  passwordHash : String(255);
  fullName     : String(100);
  role         : String(30) enum {
    Administrator; FirstLevelReviewer; SecondLevelReviewer; EscalationManager;
  };
  active       : Boolean default true;
  createdAt    : Timestamp @cds.on.insert: $now;
}

entity BusinessSectors {
  key ID : UUID;
  name   : String(100);
}

entity Regions {
  key ID : UUID;
  code   : String(20);
  name   : String(50);
}

entity Systems {
  key ID           : UUID;
  name             : String(50);
  connectionType   : String(30);
}

entity Controls {
  key ID          : UUID;
  code            : String(20);
  description     : String(255);
  system          : Association to Systems;
  ruleLogic       : String(1000);
}

entity SystemControlMapping {
  key ID          : UUID;
  businessSector  : Association to BusinessSectors;
  region          : Association to Regions;
  system          : Association to Systems;
  control         : Association to Controls;
  active          : Boolean default true;
}

entity SourceSystemUsers {
  key ID        : UUID;
  system        : Association to Systems;
  sourceUserId  : String(50);
  rolesProfiles : String(500);
  syncedAt      : Timestamp;
}

entity ReviewRecords {
  key ID              : UUID;
  businessSector      : Association to BusinessSectors;
  region              : Association to Regions;
  system              : Association to Systems;
  control             : Association to Controls;
  sourceUser          : Association to SourceSystemUsers;
  rolePermissions     : String(200);
  decision            : String(20) enum { Pending; Approved; Rejected; Escalated } default 'Pending';
  reasonForApproval   : String(500);
  comments            : String(500);
  reviewLevel         : String(30) enum {
    FirstLevel; SecondLevel; EscalationManager;
  };
  assignedTo          : Association to Users;
  createdAt           : Timestamp @cds.on.insert: $now;
  decidedAt           : Timestamp;
}

entity AuditLog {
  key ID          : UUID;
  reviewRecord    : Association to ReviewRecords;
  action          : String(50);
  actor           : Association to Users;
  timestamp       : Timestamp @cds.on.insert: $now;
  notes           : String(500);
}
