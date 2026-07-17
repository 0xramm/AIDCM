const cds = require('@sap/cds');
const crypto = require('crypto');

// ponytail: fixed dev salt, stdlib scrypt instead of a bcrypt dependency —
// swap for a real IdP (XSUAA) before this ever sees prod, per plan Phase 6.
const DEV_SALT = 'aidcm-dev-salt';
const hash = (password) => crypto.scryptSync(password, DEV_SALT, 64).toString('hex');

module.exports = class AuthService extends cds.ApplicationService {
  init() {
    this.on('login', async (req) => {
      const { email, password } = req.data;
      const { Users } = cds.entities('aidcm');
      const user = await SELECT.one.from(Users).where({ email });

      if (!user || !user.active || hash(password) !== user.passwordHash) {
        return req.error(401, 'Invalid email or password');
      }

      return { ID: user.ID, email: user.email, fullName: user.fullName, role: user.role };
    });

    return super.init();
  }
};
