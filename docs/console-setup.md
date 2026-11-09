# AWS console setup

The complete, current instructions are now in the [README's AWS console setup](../README.md#aws-console-setup).

The selected architecture is:

```text
GitHub main -> CodePipeline: Source -> Build -> Test -> S3 Deploy
                                                    |
Visitor ---------------- HTTP ----------------------v
                                         S3 static website
```

Use this order:

1. Create the website bucket, enable S3 static hosting, and configure public read.
2. Create the pipeline and connect GitHub (`SourceArtifact`).
3. On Build, select **Other build providers → AWS CodeBuild → Create project**; create `resume-build` with `buildspec-build.yml`. Keep output `BuildArtifact`.
4. Configure S3 Deploy with `BuildArtifact` and **Extract file before deploy** checked.
5. In CloudShell, use README step 7 to **create** `resume-test` directly with both types set to `CODEPIPELINE` and the corrected inline test commands.
6. In the pipeline editor, add stage **Test**, then **Add action group**. Select both artifacts, primary source `SourceArtifact`, and project `resume-test`.
7. Verify IAM permissions and the GitHub buildspec, then run and inspect the pipeline.

Follow the README for the public-read website bucket, private artifact bucket, CodeBuild settings, native S3 deployment, IAM policies, and automatic-deployment verification. This replaces the earlier CloudFront walkthrough.

- [Maintenance and troubleshooting](operations.md)
- [Submission evidence](submission.md)
