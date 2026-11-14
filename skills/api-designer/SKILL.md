---
name: api-designer
description: RESTful & RPC API design standards, uniform JSON envelopes, predictable status codes, idempotency, backward compatibility, and validation.
---

# API Designer & Architect Skill

Designing elegant, developer-friendly, and rock-solid APIs.

## Core Rules

1. **Predictable Resource Naming**: Use plural nouns for REST resources (`/users`, `/projects/:id/tasks`). Use clear verbs for RPC endpoints.
2. **Standard Status Codes**:
   - `200 OK` (success with body), `201 Created` (new resource created), `204 No Content` (success without body).
   - `400 Bad Request` (client input error), `401 Unauthorized` (unauthenticated), `403 Forbidden` (authenticated but disallowed), `404 Not Found`.
   - `409 Conflict` (state collision), `422 Unprocessable Entity` (validation failure), `429 Too Many Requests`.
3. **Consistent Error Envelopes**:
   Always return errors in a uniform JSON format:
   ```json
   {
     "error": {
       "code": "INVALID_ARGUMENT",
       "message": "Field 'email' must be a valid email address.",
       "details": []
     }
   }
   ```
4. **Idempotency**: Ensure `GET`, `PUT`, `DELETE` operations are strictly idempotent. Use idempotency keys for sensitive `POST` requests (like billing or creations).
5. **Backward Compatibility**: Never delete or rename fields in active public schemas. Deprecate with clear warnings before removing in a major version bump.
