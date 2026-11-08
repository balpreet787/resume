# Submission evidence

Complete this file using actual AWS results after setup. This checklist is not a claim that deployment has already occurred.

- Repository: https://github.com/balpreet787/resume
- Live HTTPS website URL: **Not deployed yet**
- AWS region: **Record the region used**
- CloudFormation stack: **Record the stack name**
- CodePipeline name: **Record the pipeline name**
- Successful deployment commit SHA: **Record from the pipeline Source action**
- Pipeline execution ID: **Record from execution details**
- Automatic follow-up deployment commit SHA: **Record after a visible website update**
- Local automated tests: **8 checks passed during implementation; rerun before submission**
- AWS Test stage: **Not run yet**
- AWS live smoke test: **Not run yet**

## Screenshots to capture

1. Live resume website with its CloudFront HTTPS URL visible.
2. Source, Build, Test, and Deploy all successful in CodePipeline.
3. Automated test output in CodeBuild/CloudWatch.
4. A second execution automatically triggered by a push to `main`.
5. Updated visible website text after that execution.

Save screenshots under `docs/evidence/` if you want them in the repository. Remove secrets and unnecessary account identifiers before committing them.

## Final checks

- [ ] Full-time Incognito start year confirmed (currently May 2026).
- [ ] Website content reviewed and accurate.
- [ ] GitHub repository includes website code, `.gitignore`, buildspecs, infrastructure, and documentation.
- [ ] All four AWS pipeline stages succeeded.
- [ ] Changes to `main` automatically trigger deployment.
- [ ] CloudFront website loads and shows the latest expected revision.
- [ ] Repository and website URLs supplied in the assignment submission.

Assignment due date: **November 15, 2026 at 11:59 PM**. The supplied instructions allow a 48-hour grace period through **November 17 at 11:59 PM**, with the dropbox closing afterward. Confirm the course platform's timezone and displayed deadline before submitting.
