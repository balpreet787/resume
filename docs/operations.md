# Operations guide

## Change the website

Edit `src/index.html`, `src/styles.css`, or `src/app.js`. Run `npm test`, preview with `npm run dev`, then commit and push to `main`. Never edit the generated `dist/` files or upload local files over a running pipeline deployment.

## Change infrastructure

Pushing `infra/template.yml` does **not** update the CloudFormation stack automatically. Use **CloudFormation → resume-cd → Update stack → Replace current template**, upload the changed template, keep the existing connection/repository parameters, and review the change set before executing it. Alternatively, rerun the README's `aws cloudformation deploy` command with the same stack name and parameters.

Deleting or renaming stateful resources can replace them. Both S3 buckets have `DeletionPolicy: Retain` and `UpdateReplacePolicy: Retain` to preserve data.

## Monitor

- **CodePipeline:** inspect source revision, execution status, and failed action details.
- **CodeBuild:** open the failed project's build logs. Log groups are `/aws/codebuild/resume-cd-build`, `/aws/codebuild/resume-cd-test`, and `/aws/codebuild/resume-cd-deploy` (substitute your stack name).
- **CloudWatch:** the template creates an alarm for failed deployment builds. It has no notification actions by default. To receive email, create an SNS topic/subscription, confirm the subscription, and attach the topic as an alarm action; codify the addition in CloudFormation to avoid configuration drift.
- **CloudFront:** inspect Requests and error-rate metrics in its monitoring console. Additional website-health alarms and access logging are not configured by this project.
- **S3:** inspect object versions if investigating an unexpected deployment. Do not enable public bucket access.

An alarm for deployment failures does not cover every Source/Build/Test failure. Check pipeline status when demonstrating or submitting the assignment; add EventBridge/SNS pipeline failure notifications if needed.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| AccessDenied for CodeConnections | Confirm the selected account/profile and its IAM permissions. A working STS identity does not imply pipeline provisioning permissions. Ask your account/lab administrator for the required access. |
| Connection remains Pending | Finish GitHub authorization in the AWS console and confirm the AWS Connector can access this repository. An ARN alone is insufficient. |
| Source action cannot find repository | Use `balpreet787/resume`, not its URL or `.git` suffix; check `main` exists and connection access is granted. |
| Push does not start pipeline | Check that the push was to the configured branch, the connection is Available, GitHub app repository access is intact, and `DetectChanges` is true. |
| CloudFormation rolls back | Read the earliest failed resource in Events, not just the final rollback message. Common causes are IAM restrictions, service quotas, connection region mismatch, and existing resource names. Correct the cause before recreating or updating. |
| Buildspec not found | Buildspecs must be at repository root. Test/Deploy actions must set `PrimarySource: SourceArtifact`. |
| Missing WebsiteArtifact path | Confirm the Build output is named `WebsiteArtifact` and both Test/Deploy actions take it as an input alongside `SourceArtifact`. |
| Node runtime selection fails | Check CodeBuild image/runtime availability. Configuration uses `aws/codebuild/standard:7.0` with Node.js 22. See the [AWS runtime table](https://docs.aws.amazon.com/codebuild/latest/userguide/runtime-versions.html). |
| Test fails after content change | Read the failed assertion. Update a content assertion only when a deliberate, accurate resume change makes it obsolete; keep integrity/link checks intact. |
| S3 AccessDenied during upload | Check the Deploy project's service role and target bucket. Its role needs `s3:PutObject` for that bucket's objects; Build/Test roles intentionally cannot deploy. |
| CloudFront returns 403 | Wait for the first successful deployment. Confirm `index.html` is at bucket root, default root object is `index.html`, and the OAC/bucket policy identifies the correct distribution. Direct S3 access is intentionally denied. |
| Old page appears | Inspect deployment and invalidation status. Check the source revision in `/build-info.json`. HTML uses no-cache; an in-progress or failed deployment may not have switched the entry point. |
| Invalidation failed | Check `cloudfront:CreateInvalidation` and `cloudfront:GetInvalidation` permissions for this distribution. Retry the failed pipeline stage after fixing the cause. |
| HTTPS smoke checksum mismatch | Compare the pipeline revision, S3 object versions, and invalidation status. Do not mark this execution successful. Rerun the failed stage after resolving stale/partial content. |
| Local changes do not appear | Restart `npm run dev` to rebuild, then refresh. The local server does not watch files. |

## Roll back

Prefer a new Git commit restoring a known-good website revision so the source of truth remains accurate:

```sh
git log --oneline
# Replace KNOWN_GOOD_COMMIT with a verified SHA from your repository.
git restore --source=KNOWN_GOOD_COMMIT -- src/
npm test
git add src/
git commit -m "Restore known-good resume website"
git push origin main
```

If the incident involved scripts, buildspecs, or tests, restore the corresponding known-good files too and rerun the checks. Restoring only `src/` will not repair a broken deployment script.

Watch the new pipeline execution through completion and verify the live URL. An emergency S3 object-version restore is possible, but a matching source commit and CloudFront invalidation are still necessary to reconcile the website and repository.

## Demonstrate a failing test (optional)

Locally, temporarily change an internal link to a nonexistent section and run `npm test`; the link check should fail. Restore the link and rerun. For an AWS demonstration, commit a controlled failure only when you can immediately restore it; confirm Test fails and Deploy does not run. Restore and push a passing revision before submission. Do not leave the demonstration failure on `main`.

## Cleanup after grading

Keep the website and pipeline available until grading is complete. When ready to remove them:

1. Record bucket names and the connection ARN from the stack/connection console.
2. Delete the `resume-cd` CloudFormation stack. CloudFront removal can take time.
3. Both S3 buckets are retained and may continue to incur storage costs. Separately review and delete their objects, **all versions and delete markers**, then delete the buckets if no longer needed. This is destructive; ordinary recursive deletion alone does not empty a versioned bucket.
4. Delete the GitHub connection only if nothing else uses it. It was created separately and is not removed with the stack.
5. Delete any manually added SNS topics/subscriptions, alarms, and other resources you created for the assignment when no longer needed.
6. Keep the GitHub repository and documentation as your submission record.

Old content-hashed assets deliberately remain as current S3 objects. The noncurrent-version lifecycle does not remove these unique current keys. For this small resume site that is intentional; periodically remove unused asset hashes only after reviewing their references and rollback requirements.
