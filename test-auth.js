const jwt = require('jsonwebtoken');
const token = jwt.sign({ actor_id: 'user_123', actor_type: 'user', auth_identity_id: 'auth_123', app_metadata: {} }, 'supersecret');
console.log(token);
