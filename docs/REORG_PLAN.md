# SAMS Reorganization Plan

## Goals
- Consolidate applications into `apps/`
- Unify infrastructure into `infra/`
- Centralize DB assets under `database/`
- Keep agents in `servers/`
- Consolidate docs under `docs/`

## Steps
1. Dry run the reorg:
   - PowerShell: `scripts/maintenance/reorganize_sams.ps1`
2. Apply changes:
   - `scripts/maintenance/reorganize_sams.ps1 -Execute`
3. Validate builds:
   - `apps/web`: `npm ci && npm run build`
   - `apps/sams-backend`: `mvn -q -DskipTests package` or Node build per project
   - `apps/sams-mobile`: `npm ci && npm start`
4. Update references:
   - Docker/K8s paths now under `infra/`
   - Scripts run from `scripts/`

## Notes
- The script creates a manifest at `backups/archive/manifests` before moving files.
- Re-run with `-VerboseReport` for detailed move logs.
- No files are deleted except empty directories after a successful move.


