# Balpreet Sekhon — Resume website

A responsive resume website with a printable layout and an AWS continuous delivery configuration for the DevOps assignment.

**Repository:** https://github.com/balpreet787/resume

The website and pipeline configuration are included. **AWS infrastructure and live deployment must be set up separately using the steps below.** A successful local build is not evidence of a successful AWS deployment.

## Run locally

Install Node.js 22 or newer, then run:

```sh
npm ci
npm test
npm run dev
```

Open http://127.0.0.1:4173. Stop the server with Ctrl+C. After editing a source file, stop and run `npm run dev` again, then refresh the browser. This simple server does not hot-reload.

There are no third-party npm dependencies. The test suite uses Node's built-in test runner.

## Update the resume

- `src/index.html`: resume content, work experience, projects, contact details.
- `src/styles.css`: desktop, mobile, accessibility, and print styles.
- `src/app.js`: print/save-as-PDF button.
- `src/favicon.svg`: site icon.

The supplied resume PDF was used as a content reference. **`scripts/build.mjs` does not parse or convert a PDF.** It copies the website source into `dist/`, gives CSS and JavaScript content-based filenames, and writes a checksum manifest. Edit `src/`, not `dist/`. The original PDF is not published, so the site's print view includes the updated work experience.

The full-time Incognito role uses the official title **QA Software Engineer**, with software release management, test plan design, and co-op supervision listed as responsibilities. The start date is **May 2026**, inferred from the provided month and the earlier co-op ending in December 2025; correct the year in `src/index.html` and the corresponding content test if needed.

## Architecture

```text
Push to GitHub main
        |
        v
AWS CodeConnections (authorized GitHub connection)
        |
        v
AWS CodePipeline V2 (queued executions)
  Source --------> Build ----------> Test ----------> Deploy
  GitHub ZIP       CodeBuild        CodeBuild        CodeBuild
                   npm run build    Test the exact   Upload assets,
                   dist/ artifact   build artifact   then index.html;
                                                     invalidate cache;
                                                     HTTPS smoke test
        |                |                |                |
        +---------- Private S3 artifact bucket ------------+
                         |
                CloudWatch build logs

Visitor --HTTPS--> CloudFront --signed OAC request--> Private S3 website bucket
```

CloudFormation (`infra/template.yml`) creates the buckets, distribution, origin access control, cache/security-header policies, IAM service roles, three CodeBuild projects, pipeline, log groups, and a deployment failure alarm. You supply an existing authorized GitHub connection.

The S3 bucket is private: CloudFront reads it using Origin Access Control (OAC). Use the CloudFront HTTPS URL, not an S3 website URL. The template uses the standard S3 origin, not S3 website hosting. See [AWS's OAC documentation](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html).

## AWS setup — step by step

Use **US West (Oregon), `us-west-2`**, consistently for CodeConnections, CloudFormation, CodeBuild, and CodePipeline. CloudFront is global. You can choose another supported region, but create the connection and stack in that same region.

### 1. Check your AWS permissions

Sign in to the AWS account you intend to use for the assignment. You need permission to provision CloudFormation, S3, CloudFront, CodePipeline, CodeBuild, CloudWatch Logs/Alarms, and IAM service roles; CloudFormation must also be allowed to pass those roles to the services. A restricted AWS Academy role may not allow all of these services.

The locally configured default IAM user returned `AccessDeniedException` for `codeconnections:ListConnections` during preparation. If you use that same user, resolve its permissions with your account administrator or select an appropriate authorized profile before attempting setup. Do not paste AWS keys into source files or commit them.

This creates billable AWS resources. Check the account's budget and current [AWS pricing](https://aws.amazon.com/pricing/) before creating the stack. This project does not assume free-tier eligibility.

### 2. Check the repository

Open https://github.com/balpreet787/resume and confirm the `main` branch contains `src/`, `infra/template.yml`, and the three `buildspec-*.yml` files. The repository may be private; the GitHub connection must have access to it.

### 3. Create the GitHub connection

1. In AWS, select **Oregon (`us-west-2`)**.
2. Open the Developer Tools / CodePipeline console and go to **Settings → Connections** (AWS CodeConnections).
3. Choose **Create connection**, select **GitHub**, and name it `resume-github`.
4. Choose **Connect to GitHub**, authorize/install the AWS Connector for GitHub, and grant access to `balpreet787/resume`.
5. Finish the connection flow. Its status must be **Available**, not Pending.
6. Copy its **connection ARN**. It is a resource identifier, not a password.

Console wording can vary. The source provider is still named `CodeStarSourceConnection` in pipeline configuration even though the service is called CodeConnections. See [AWS's connection source reference](https://docs.aws.amazon.com/codepipeline/latest/userguide/action-reference-CodestarConnectionSource.html).

### 4. Create the CloudFormation stack

This is the simplest setup path. **It creates CodePipeline for you; do not also create a second pipeline manually.**

1. Open **CloudFormation → Create stack → With new resources (standard)**.
2. Choose **Choose an existing template → Upload a template file**.
3. Upload `infra/template.yml` from this repository.
4. Set the stack name to **`resume-cd`**.
5. Enter the parameters:

   | Parameter | Value |
   | --- | --- |
   | `RepositoryId` | `balpreet787/resume` |
   | `BranchName` | `main` |
   | `ConnectionArn` | The Available connection ARN from step 3 |

6. Continue through stack options. Leave defaults unless your AWS environment requires a particular CloudFormation execution role.
7. Acknowledge that CloudFormation may create IAM resources, then submit.
8. Watch **Events** until the stack reaches **CREATE_COMPLETE**. CloudFront provisioning can take several minutes.
9. Open **Outputs** and save `WebsiteURL`, `PipelineConsoleURL`, `PipelineName`, `WebsiteBucketName`, `ArtifactBucketName`, and `DistributionId`.

If you prefer the AWS CLI, use an already-authorized profile and substitute your connection ARN:

```sh
aws sts get-caller-identity

aws cloudformation validate-template \
  --region us-west-2 \
  --template-body file://infra/template.yml

aws cloudformation deploy \
  --region us-west-2 \
  --stack-name resume-cd \
  --template-file infra/template.yml \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    RepositoryId=balpreet787/resume \
    BranchName=main \
    ConnectionArn=YOUR_AVAILABLE_CONNECTION_ARN

aws cloudformation describe-stacks \
  --region us-west-2 \
  --stack-name resume-cd \
  --query 'Stacks[0].Outputs' \
  --output table
```

Replace the placeholder before executing. Add `--profile YOUR_PROFILE` to each command if you do not use the default profile. `validate-template` checks template syntax; it does not establish that your account has permission or capacity to create the resources.

### 5. Verify all four pipeline stages

Open the pipeline using `PipelineConsoleURL`. Its name is `resume-cd-pipeline`.

| Stage | Expected behavior |
| --- | --- |
| Source | Fetches the latest commit from GitHub `main`. |
| Build | Uses `buildspec-build.yml`, runs `npm ci` and `npm run build`, and packages only `dist/`. |
| Test | Uses `buildspec-test.yml` to run eight checks against the actual incoming build artifact. A failure blocks deployment. |
| Deploy | Uses `buildspec-deploy.yml` to upload assets first and HTML last, invalidate CloudFront, wait for invalidation, and verify every deployed file by checksum over HTTPS. |

The Deploy stage intentionally uses a **CodeBuild** action: it executes the upload, invalidation, and smoke-test commands. AWS labels the action category `Build`; its pipeline stage name and function are **Deploy**. It does not require CodeDeploy or EC2.

The pipeline normally starts when created. If it has no execution, choose **Release change**. Wait until every stage is green before claiming deployment success.

### 6. Open your website

Open the exact `WebsiteURL` from the stack outputs. It will resemble `https://d123example.cloudfront.net`. Check the resume, navigation, project links, phone link, and Print / save resume button. Narrow the browser to check mobile layout.

Before the first successful deployment, a CloudFront 403 is expected because `index.html` has not been uploaded yet.

### 7. Prove automatic deployment

1. Make a small visible change in `src/index.html`, such as a sentence in the introduction.
2. Run `npm test` locally.
3. Commit and push it:

```sh
git add src/index.html
git commit -m "Update resume introduction"
git push origin main
```

4. Watch a **new execution start automatically** in CodePipeline. Do not click Release change for this demonstration.
5. Verify that its source revision matches your commit and all stages turn green.
6. Refresh the CloudFront website and confirm the updated text appears.
7. Optionally inspect `/build-info.json`; its `revision` records the source revision used by the build.

### 8. Capture submission evidence

Record real results in [docs/submission.md](docs/submission.md): repository URL, live website URL, stack/pipeline names, successful commit ID, and test result. Add screenshots of the four green pipeline stages, the live website, and the automatically triggered follow-up execution. Do not include access keys, account secrets, or fabricated success screenshots.

## How testing and deployment work

`npm test` builds and runs eight automated checks: resume metadata/landmarks, required content, internal anchors, local asset references, checksums and hashed filenames, external-link safety, artifact contents, and responsive/print/reduced-motion stylesheet presence. These are structural and artifact checks, not a full browser accessibility audit or Selenium test suite.

Inside CodePipeline, the Test project receives both `SourceArtifact` (test code) and `WebsiteArtifact` (packaged website). `PrimarySource` is `SourceArtifact`; the tests read `CODEBUILD_SRC_DIR_WebsiteArtifact`. They **do not rebuild** the site. Deployment receives the same artifact and checks it again before upload.

CSS and JavaScript have content-hashed filenames and a long immutable cache lifetime. HTML is uploaded last with `Cache-Control: no-cache`. Old hashed assets remain available to visitors with older pages. Queued pipeline executions prevent two deployments from racing. Uploads are not a multi-object atomic transaction; failed deployments may need a rerun or rollback.

Build and test roles cannot write to the website bucket. The deploy role can upload to that bucket and invalidate only this distribution. Logs are retained for 14 days. Artifact objects expire after 30 days; noncurrent website object versions expire after 30 days. CloudFront adds security headers including CSP, HSTS, frame denial, and MIME-sniffing protection.

## Maintenance and troubleshooting

See [docs/operations.md](docs/operations.md) for rollback, monitoring, common failures, cleanup, and infrastructure update steps.

## Assignment coverage

| Requirement | Included implementation |
| --- | --- |
| Professional resume website | Responsive `src/` site with updated Incognito experience. |
| AWS hosting | CloudFront and private S3 in `infra/template.yml`. |
| Version control | GitHub source repository and `.gitignore`. |
| Change detection | CodeConnections source action with `DetectChanges: true`. |
| Build/package | Dedicated CodeBuild Build stage. |
| Automated testing | Dedicated CodeBuild Test stage using Node's test runner. |
| Deployment | Dedicated Deploy stage plus live HTTPS checksum tests. |
| Monitoring/logging (optional) | CloudWatch build logs and a deployment failure alarm; no notification subscription is configured. |
| Documentation | This README, architecture diagram, configuration files, operations guide, submission checklist. |

Infrastructure is provided as code; AWS setup and evidence of an actual successful deployment are still required for submission.
