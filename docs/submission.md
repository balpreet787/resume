# Submission evidence

Complete this file using actual AWS results. The selected architecture uses a public-read S3 static website and CodePipeline's native S3 Deploy action. Prepared code/documentation is not proof of a successful cloud deployment.

- Repository: https://github.com/balpreet787/resume
- Live **HTTP S3 website endpoint**: **Not deployed yet**
- AWS region: **Record the region used** (instructions use `us-west-2`)
- Website bucket name: **Record actual name**
- CodePipeline name: **Record actual name** (instructions use `resume-pipeline`)
- CodeBuild projects: **Record actual names** (instructions use `resume-build` and `resume-test`)
- Successful deployment commit SHA: **Record from Source action**
- Pipeline execution ID: **Record from execution details**
- Automatic follow-up deployment commit SHA: **Record after a visible update**
- Local tests: **8 checks passed during implementation; rerun before submission**
- AWS Test stage: **Not run yet**
- Live browser verification: **Not performed yet**
- CloudFront / Elastic Beanstalk / CloudFormation: **Not used**

## Evidence to capture

1. Live resume website with the S3 HTTP website endpoint visible.
2. Source, Build, Test, and Deploy all successful in CodePipeline.
3. Automated test output in CodeBuild/CloudWatch.
4. A second execution automatically triggered by a push to `main`, with its commit SHA.
5. Changed text visible on the website after that execution.

Save screenshots under `docs/evidence/` when ready to include them. Exclude credentials and unnecessary account details.

## Documentation requirement

| Requirement | File |
| --- | --- |
| Pipeline architecture and diagram | `README.md` |
| Setup instructions and configuration | `README.md`, `buildspec-build.yml`, `buildspec-test.yml` |
| Maintenance, rollback, and troubleshooting | `docs/operations.md` |
| Deployment evidence | This file and `docs/evidence/` |
| Documentation uploaded onto codebase | Commit and push revised docs to GitHub when authorized; verify they appear there |

## Final checklist

- [ ] Full-time Incognito start year confirmed (currently May 2026).
- [ ] Resume content reviewed and accurate.
- [ ] README reflects the actual S3 static-hosting setup.
- [ ] Revised documentation committed and pushed to GitHub.
- [ ] Website code, `.gitignore`, and active buildspecs available in GitHub.
- [ ] All four AWS pipeline stages succeeded.
- [ ] Pushes to `main` automatically trigger deployment.
- [ ] S3 website endpoint loads and displays the expected revision.
- [ ] Website bucket contains only intended public site files; artifact bucket remains private.
- [ ] Repository and website URLs included in the assignment submission.

Assignment due date from the supplied instructions: **November 15, 2026 at 11:59 PM**, with a 48-hour grace period through **November 17 at 11:59 PM**. Verify the course platform's displayed timezone and closing time.
