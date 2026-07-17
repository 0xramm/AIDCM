using { aidcm } from '../db/schema';

/* Login: verify email/password against Users, resolve role for client-side routing */
service AuthService @(path: '/odata/v4/auth') {
  action login(email: String, password: String) returns {
    ID       : UUID;
    email    : String;
    fullName : String;
    role     : String;
  };
}
