## Fix the Bug

**Environment** (1 line): macOS Darwin arm64, Go 1.25.3, swag v1.16.4, backend-go chi + swaggo + go-scalar-api-reference.

**Actual Behavior**:
Running `cd backend-go && make docs` regenerates `backend-go/docs/swagger.yaml`, `backend-go/docs/swagger.json`, and `backend-go/docs/docs.go`, but the Scalar UI served by the backend at `/scalar` does not reflect the updated OpenAPI spec. There is no stack trace; the route renders successfully but appears stale. Current handler uses embedded generated Go docs:

```go
html, err := scalar.ApiReferenceHTML(&scalar.Options{
    SpecContent: docs.SwaggerInfo.ReadDoc(),
    CustomOptions: scalar.CustomOptions{PageTitle: "Go Server API"},
})
```

**Expected Behavior**:
After `make docs` updates `backend-go/docs/swagger.yaml` or `backend-go/docs/swagger.json`, the `/scalar` page should render from the current generated spec file contents. Prefer `backend-go/docs/swagger.yaml`; JSON is acceptable if easier. Swagger UI at `/swagger/*` should keep working.

**Steps to Reproduce**:
1. In `backend-go`, change a Swagger annotation in a handler, then run `make docs`.
2. Run or refresh the backend and open `http://localhost:8080/scalar`; observe Scalar does not show the updated generated spec content.

**Key Files**:
- `backend-go/internal/handler/handler.go` — defines `/scalar` and currently passes `docs.SwaggerInfo.ReadDoc()` into Scalar.
- `backend-go/docs/swagger.yaml` — generated spec file that Scalar should be based on.
- `backend-go/docs/swagger.json` — generated spec alternative if YAML is not convenient.
- `backend-go/docs/docs.go` — generated embedded spec currently used by Scalar; likely source of staleness.
- `backend-go/Makefile` — `make docs` command regenerates docs.
- `backend-go/internal/handler/course_test.go` — existing handler test location for regression coverage.

**Already Tried**:
- Running `cd backend-go && make docs`, which regenerates files but does not make Scalar reflect the changes reliably.
- Verifying generated docs files exist and contain updated paths/definitions.

**Constraints** (do not touch):
- Do not change public API routes or OpenAPI response contracts.
- Do not remove `/swagger/*` or break Swagger UI.
- Do not edit generated docs by hand except through `make docs`.
- Keep operational routes unversioned: `/health`, `/scalar`, `/swagger/*`.
- Keep the fix in `backend-go` unless a test fixture absolutely requires otherwise.

**Success Looks Like**:
`/scalar` is rendered from the current contents of `backend-go/docs/swagger.yaml` or `backend-go/docs/swagger.json`, so a docs regeneration is reflected without relying on stale embedded `docs.SwaggerInfo.ReadDoc()` content. `cd backend-go && make test && make docs` passes. A regression test proves the Scalar handler uses the generated spec file content rather than a hardcoded/stale embedded doc string.

**Test Coverage**:
Create a test for this bug so it doesn't happen anymore.
After fixing, run the existing test suite. If all pass, generate a regression test that:
1. Reproduces the exact failure condition described above
2. Asserts the expected behavior
3. Is placed alongside related tests in `backend-go/internal/handler/course_test.go` or a new nearby handler test file
If any existing tests fail during the fix, try to fix them.
