// Esquema lógico de autenticación de GateFlow.
// La migración ejecutable se conserva en drizzle/0000_gateflow_users.sql.
export const gateflowAuthSchema = {
  users: ["id", "name", "email", "role", "status", "created_at"],
  otpCodes: ["id", "email", "role", "purpose", "requested_name", "code_hash", "expires_at", "attempts", "consumed_at", "created_at"],
  sessions: ["id", "user_id", "token_hash", "expires_at", "created_at"],
  customerRequests: ["id", "user_id", "container_number", "reference", "operation", "preferred_date", "time_slot", "status", "created_at", "updated_at"],
} as const;
