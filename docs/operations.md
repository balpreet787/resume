# Operations: S3 static website and CodePipeline

This guide applies to the direct S3 static-hosting architecture in [README.md](../README.md). The site uses an HTTP website endpoint and a native Amazon S3 Deploy action.

## Routine content changes

1. Edit `src/index.html`, `src/styles.css`, or `src/app.js`.
2. Run `npm test`, then `npm run dev` for browser review. Restart the dev command after source changes.
3. When ready to publish, commit and push the intended files to `main`.
4. Watch the automatic pipeline execution and compare its source revision to the commit.
5. Check the updated website after all four stages succeed.

Edit source files, not the generated `dist/` output. Keep account keys and private files out of Git and out of the public website bucket. Keep the separate pipeline artifact bucket private.

## Configuration changes

Update console settings directly for CodePipeline, CodeBuild, S3 hosting, IAM roles, and logging, and record the matching change in the README. Pushing `infra/template.yml` does not configure the selected pipeline; that file belongs to an unused alternative setup.

Keep these artifact names consistent:

- Source output: `SourceArtifact`.
- Build output: `BuildArtifact`.
- Test inputs: both artifacts, with `PrimarySource=SourceArtifact`.
- Deploy input: `BuildArtifact` only.

Changes to buildspecs or source take effect in the next execution. Changes to project image, IAM permissions, action configuration, and bucket settings must be made in AWS itself.

## Logs and optional monitoring

- CodePipeline shows the failed stage/action and execution revision.
- In CodeBuild, open the project's build history and select its CloudWatch logs. The generated log groups are typically `/aws/codebuild/resume-build` and `/aws/codebuild/resume-test`; verify the project settings.
- Set CloudWatch log retention explicitly if needed, for example 14 days; this console setup does not set it automatically.
- Optional: configure CodeBuild failure alarms or EventBridge pipeline-failure notifications through SNS. Email subscriptions require confirmation. No alarm or notification subscription is currently included in the manual setup.
- S3 server access logging is optional and not configured by these steps.

## Troubleshooting

| Problem | Diagnosis and correction |
| --- | --- |
| Cannot create a GitHub connection or AWS resources | Check the selected role/account permissions. STS sign-in success does not prove provisioning access. Ask the account/lab administrator if restricted. |
| Connection is Pending | Complete authorization of the AWS Connector for GitHub and grant access to `balpreet787/resume`. Wait for Available. |
| Push does not start an execution | Verify the branch is `main`, push/change detection is enabled, trigger filters include it, and the GitHub connection still has repository access. |
| Buildspec not found | Check filename and repository root. Build uses `buildspec-build.yml`; Test uses the inline definition from README step 7 (or the corrected repository file if explicitly switched), with `SourceArtifact` as its primary source. |
| Node runtime fails | Verify the image supports Node.js 22; the documented image is `aws/codebuild/standard:7.0`. |
| Test cannot find BuildArtifact | Keep the default Build output `BuildArtifact`, pass it alongside `SourceArtifact` to Test, and check that the GitHub buildspec reads `CODEBUILD_SRC_DIR_BuildArtifact`. The inline definition from README step 7 already uses this variable; local edits alone do not update a repository-file buildspec in AWS. |
| Invalid input: both sourceType and artifactType must be CODEPIPELINE | If the project does not exist, use README step 7 to create it correctly. For an existing project, update both types to CODEPIPELINE together. This is separate from leaving the Test action output empty. |
| Test DOWNLOAD_SOURCE returns AccessDenied | Add artifact-bucket read permissions to the Test project's role, and KMS decrypt access if that artifact store uses a customer-managed key. |
| Project list has no resume-test | Create the separate CodeBuild project first (README step 7), then refresh the project dropdown in the pipeline action. A stage named Test does not create a project. |
| Test stage has no provider/project fields | Click **Add action group** inside the empty stage to open those fields. |
| Build screen only shows Commands | Select **Other build providers → AWS CodeBuild → Create project**. |
| Deploy demands an S3 object key | Enable **Extract file before deploy** and leave the key empty. |
| Pipeline cannot start resume-test | Extend the pipeline role's StartBuild/BatchGetBuilds permissions to the Test project ARN. |
| Tests fail after an intentional content edit | Read the failed assertion. Update the corresponding content assertion only when the resume change is deliberate; retain integrity and link checks. |
| Deploy returns AccessDenied | Check the pipeline role, not the CodeBuild role. It needs PutObject access to the website bucket and the bucket metadata permissions shown in the README. |
| AccessControlListNotSupported | Remove the deploy action's CannedACL value. Keep ACLs disabled and use the public-read bucket policy. |
| Public bucket policy cannot be saved | Check the bucket name in Resource and the public-policy Block Public Access settings at bucket/account level. Organization restrictions may require an administrator. Do not relax the artifact bucket. |
| Website returns 403 | Confirm public GetObject permission, effective Block Public Access settings, SSE-S3 encryption, and a successful deployment. SSE-KMS objects cannot be read anonymously. |
| Website returns 404 | Verify static website hosting is enabled, index document is exactly `index.html`, and that file exists at bucket root. Select Extract file before deploy. |
| Browser fails when using HTTPS | Use the HTTP website endpoint copied from S3 Properties. Direct S3 static hosting does not support HTTPS. |
| Browser shows XML or downloads an unexpected file | Confirm you are using the website endpoint, not a REST object endpoint, and deployed the built artifact rather than the source ZIP. |
| Website is missing CSS/JS | Inspect `assets/`, verify the complete Build output was deployed, and confirm root-relative references resolve. Do not upload only index.html. |
| Website still shows old text | Check deployed source revision in build-info.json, verify a successful new execution, set deploy CacheControl to no-cache, and refresh. Existing browser cache entries may require a hard refresh once. |
| Old assets remain in the bucket | Native S3 Deploy overwrites matching keys but does not delete obsolete objects. Review and remove unused asset hashes only after considering older pages and rollback needs. |
| Local edits do not appear | Restart `npm run dev` to rebuild; the local server does not watch files. |

## Rollback

Restore known-good source through a new Git commit so the repository and live website agree:

```sh
git log --oneline
# Replace KNOWN_GOOD_COMMIT with a verified commit SHA.
git restore --source=KNOWN_GOOD_COMMIT -- src/
npm test
git add src/
git commit -m "Restore known-good resume website"
git push origin main
```

If the fault is in scripts, tests, or buildspecs, restore the affected files too. Console-setting failures require an AWS configuration fix; restoring website content will not repair IAM or action settings. Verify the new execution and the live website before declaring recovery.

Native S3 deployment updates objects individually. A failed upload may leave a mixture of revisions; retry the corrected deployment or deploy a known-good revision. A versioned bucket can assist recovery, but restoring individual objects does not automatically align them with Git.

## Demonstrate a test failure (optional)

Locally, temporarily change an anchor to a nonexistent section and run `npm test`. Confirm it fails, then restore the correct anchor and rerun. If demonstrating the failure in AWS, restore and deploy a passing revision before submission; capture Test failed / Deploy blocked as additional evidence, not the final state.

## Cleanup after grading

Keep the site available until grading is finished. When resources are no longer needed:

1. Remove or disable the pipeline so further pushes cannot deploy.
2. Delete the two CodeBuild projects and review their unused service roles and log groups.
3. Review and delete website/artifact bucket contents, then delete the buckets. Versioned buckets require deletion of all object versions and delete markers. This permanently removes that data.
4. Delete the GitHub connection only if no other pipelines use it.
5. Remove optional alarms, SNS subscriptions, or logging buckets created separately.
6. Keep the repository, documentation, and submission evidence.

No CloudFormation stack or CloudFront distribution needs removal for this selected setup. If you separately created resources from the older instructions, review and clean those up independently.

## References

- [S3 website permissions](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteAccessPermissionsReqd.html)
- [S3 deployment behavior](https://docs.aws.amazon.com/codepipeline/latest/userguide/tutorials-s3deploy.html)
- [CodeBuild action configuration](https://docs.aws.amazon.com/codepipeline/latest/userguide/action-reference-CodeBuild.html)
