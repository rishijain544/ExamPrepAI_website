# Security Specification for ExamPrepAI

## Data Invariants
1. A QuizResult must be owned by the user who created it (`userId` equals `request.auth.uid`).
2. `createdAt` must be a server timestamp.
3. Users can only read their own results.
4. Users cannot delete or update results once they are submitted (to preserve history integrity).

## The "Dirty Dozen" Payloads (Unauthorized Attempts)

1. **Identity Spoofing**: `create` with `userId` of another user.
2. **Identity Spoofing (Read)**: `get` or `list` for another user's `userId`.
3. **Timestamp Manipulation**: `create` with a client-side date instead of `serverTimestamp()`.
4. **Malicious ID**: `create` with a 2MB string as a document ID.
5. **Shadow Field Injection**: `create` with an extra field like `isAdmin: true`.
6. **Type Poisoning**: `create` with `accuracy` as a string instead of a number.
7. **Resource Poisoning**: `create` with `materialName` being a 1MB string.
8. **Unauthorized Update**: Attempt to `update` a result after creation.
9. **Unauthorized Delete**: Attempt to `delete` a result.
10. **Query Scraper**: `list` request without a `where` clause (blanket read attempt).
11. **Negative Score**: `create` with `score: -1`.
12. **Impossible Accuracy**: `create` with `accuracy: 101`.

## Tests
- Verification that all these payloads return `PERMISSION_DENIED` will be implemented.
