const cds = require('@sap/cds');
const { randomUUID } = require('crypto');

// ponytail: rule engine is just "does rolesProfiles equal the literal in
// ruleLogic" — matches the plan's Section 6 scope ("simple condition checks,
// not a generic rule DSL"). Swap for a real expression evaluator only if a
// control needs more than an equality check.
function ruleMatches(ruleLogic, rolesProfiles) {
  const m = /==\s*'([^']*)'/.exec(ruleLogic || '');
  return m ? rolesProfiles === m[1] : false;
}

const NEXT_LEVEL = {
  FirstLevel: 'SecondLevel',
  SecondLevel: 'EscalationManager',
  EscalationManager: 'EscalationManager',
};

module.exports = class ReviewService extends cds.ApplicationService {
  init() {
    const { ReviewRecords, AuditLog, SourceSystemUsers } = this.entities;
    const { SystemControlMapping, Controls, Users } = cds.entities('aidcm');

    this.on('runControlScan', async () => {
      const mappings = await SELECT.from(SystemControlMapping).where({ active: true });

      let created = 0;
      for (const mapping of mappings) {
        const control = await SELECT.one.from(Controls).where({ ID: mapping.control_ID });
        const sourceUsers = await SELECT.from(SourceSystemUsers).where({ system_ID: mapping.system_ID });

        for (const srcUser of sourceUsers) {
          if (!ruleMatches(control.ruleLogic, srcUser.rolesProfiles)) continue;

          const exists = await SELECT.one.from(ReviewRecords).where({
            businessSector_ID: mapping.businessSector_ID,
            region_ID: mapping.region_ID,
            control_ID: mapping.control_ID,
            sourceUser_ID: srcUser.ID,
          });
          if (exists) continue;

          await INSERT.into(ReviewRecords).entries({
            ID: randomUUID(),
            businessSector_ID: mapping.businessSector_ID,
            region_ID: mapping.region_ID,
            system_ID: mapping.system_ID,
            control_ID: mapping.control_ID,
            sourceUser_ID: srcUser.ID,
            rolePermissions: srcUser.rolesProfiles,
            decision: 'Pending',
            reviewLevel: 'FirstLevel',
          });
          created++;
        }
      }
      return created;
    });

    this.on('decide', async (req) => {
      const { ID, decision, reasonForApproval, comments, actorEmail } = req.data;
      const record = await SELECT.one.from(ReviewRecords).where({ ID });
      if (!record) return req.error(404, `ReviewRecord ${ID} not found`);

      const actor = actorEmail && await SELECT.one.from(Users).where({ email: actorEmail });
      const patch = { reasonForApproval, comments };

      if (decision === 'Escalated') {
        patch.reviewLevel = NEXT_LEVEL[record.reviewLevel] || record.reviewLevel;
        patch.decision = 'Pending';
      } else {
        patch.decision = decision;
        patch.decidedAt = new Date().toISOString();
      }

      await UPDATE(ReviewRecords, ID).with(patch);
      await INSERT.into(AuditLog).entries({
        ID: randomUUID(),
        reviewRecord_ID: ID,
        action: decision,
        actor_ID: actor && actor.ID,
        notes: comments,
      });

      return SELECT.one.from(ReviewRecords).where({ ID });
    });

    return super.init();
  }
};
