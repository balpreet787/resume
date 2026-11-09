# Balpreet Sekhon — Resume website and AWS CD pipeline

A responsive resume website with automated build and test stages, deployed through AWS CodePipeline to **Amazon S3 static website hosting**.

Repository: https://github.com/balpreet787/resume

**Selected architecture:** GitHub → CodePipeline → CodeBuild → automated tests → native S3 deployment. Visitors use the S3 **HTTP website endpoint**. CloudFront, Elastic Beanstalk, and CloudFormation are not part of this setup.

**Status:** Website source and configuration are prepared. Local tests passed during implementation. AWS setup, successful pipeline execution, and submission evidence must still be completed and recorded in [docs/submission.md](docs/submission.md).

## Documentation and assignment coverage

| Required documentation | Where it is provided |
| --- | --- |
| Pipeline architecture and diagram | Architecture below |
| Setup steps | AWS console setup below |
| Configurations | Settings tables, JSON policies below, `buildspec-build.yml`, `buildspec-test.yml` |
| Maintenance, rollback, troubleshooting | [Operations guide](docs/operations.md) |
| Submission evidence and screenshots | [Submission checklist](docs/submission.md) |

The documentation is stored alongside the website code. Revised local documentation must be committed and pushed when ready before it appears on GitHub. Do not mark the AWS work complete based on local tests alone.

## Architecture

```text
Developer pushes to GitHub main
               |
               v
AWS CodeConnections (GitHub App, push detection)
               |
               v
+--------------------- AWS CodePipeline ----------------------+
|                                                            |
| Source ------> Build ---------> Test ----------> Deploy      |
| GitHub ZIP     CodeBuild        CodeBuild        Amazon S3   |
|               npm ci           Node tests       Extract     |
|               npm run build    against built    website     |
|                                artifact         files       |
+------------------------------------------------------------+
       |              |               |               |
       +------- PRIVATE S3 pipeline artifact bucket ---+
                      |               |
                      +-- CloudWatch build/test logs

Visitor --HTTP GET--> PUBLIC-READ S3 WEBSITE BUCKET
                     index.html, assets/, favicon.svg,
                     build-info.json
```

There are two different buckets. The **website bucket** exposes only generated site files for public read. The **artifact bucket** holds source/build ZIPs and remains private. Uploading source code to the public bucket is not part of deployment.

| Stage | Input | Processing | Output |
| --- | --- | --- | --- |
| Source | GitHub `balpreet787/resume`, branch `main` | Fetch source ZIP on pushes | `SourceArtifact` |
| Build | `SourceArtifact` | `buildspec-build.yml`: Node.js 22, `npm ci`, `npm run build` | `BuildArtifact`, containing the contents of `dist/` |
| Test | `SourceArtifact` + `BuildArtifact` | `buildspec-test.yml`: eight Node tests against the incoming built files | No output; failure blocks Deploy |
| Deploy | `BuildArtifact` | Native Amazon S3 action extracts files into website bucket root | Updated website objects |

## Local development

Install Node.js 22 or newer, then:

```sh
npm ci
npm test
npm run dev
```

Open http://127.0.0.1:4173. Stop with Ctrl+C. After editing source, restart `npm run dev` and refresh; this server does not hot-reload. There are no third-party npm dependencies.

- `src/index.html`: resume content and links.
- `src/styles.css`: desktop, mobile, focus, reduced-motion, and print styles.
- `src/app.js`: Print / save resume button.
- `scripts/build.mjs`: copies website files into `dist/`, hashes CSS/JS filenames, and creates `build-info.json` with file checksums and a source revision.
- `tests/site.test.mjs`: automated artifact/content checks.

**The build script does not convert a PDF.** The provided PDF was a content reference; edit the HTML to update the website. `dist/` is generated and ignored by Git. The browser's print view includes the new experience.

The full-time Incognito entry uses the official title QA Software Engineer, with release management, test plan design, and co-op supervision as responsibilities. Its start year is currently May **2026**, inferred from the supplied month and previous co-op dates; confirm the year before submission.

## AWS console setup

Use **Oregon (`us-west-2`)** for the buckets, pipeline, CodeBuild projects, and GitHub connection. Console labels may vary slightly. Use an account/role allowed to create these services and their IAM service roles. The previously checked default CLI user lacked CodeConnections permission; select an appropriate authorized console role if necessary.

### 1. Create a dedicated website bucket

Open **S3 → Create bucket**:

| Setting | Value |
| --- | --- |
| Bucket type | General purpose |
| Bucket name | `balpreet-resume-site-2026` (your existing website bucket) |
| Region | `us-west-2` |
| Object Ownership | Bucket owner enforced / ACLs disabled |
| Encryption | SSE-S3 |
| Versioning | Optional, useful for recovery |

The website contains public resume information. Keep credentials, source archives, and other private files out of this bucket.

### 2. Enable static website hosting

Open **your bucket → Properties → Static website hosting → Edit**:

1. Enable static website hosting.
2. Select **Host a static website**.
3. Set **Index document** to `index.html` (case-sensitive).
4. Leave the optional error document empty; this project does not contain an error page.
5. Save and copy the **Bucket website endpoint** shown in Properties.

Use this exact **http://** endpoint for the assignment. S3 website endpoints do not support HTTPS. Do not use the REST object URL or the console URL. [AWS static-hosting tutorial](https://docs.aws.amazon.com/AmazonS3/latest/userguide/HostingWebsiteOnS3Setup.html).

### 3. Allow public read of website objects

Under **Permissions → Block public access → Edit**, allow public **bucket policies** for this website bucket:

- Clear **Block all public access** to edit its individual settings.
- Turn off the two settings that block public bucket/access-point policies and public/cross-account access through those policies (`BlockPublicPolicy` and `RestrictPublicBuckets`).
- Keep the two public-ACL blocking settings enabled; ACLs are not used.
- Save and acknowledge the public access change.

Account-level Block Public Access can still prevent this. Check **S3 → Block Public Access settings for this account** if the bucket policy is rejected. In a managed/student account, ask the account administrator if policy-level public access is prohibited; bucket settings cannot override account or organization restrictions. Keep the separate artifact bucket fully blocked from public access.

Under **Permissions → Bucket policy**, paste the following, replacing `YOUR_WEBSITE_BUCKET` with the exact bucket name:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadWebsiteFiles",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR_WEBSITE_BUCKET/*"
    }
  ]
}
```

This permits reading objects, not uploading, deleting, or listing the bucket. The account and bucket settings must both allow it. [AWS website permissions](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteAccessPermissionsReqd.html).

### 4. Create CodePipeline and connect GitHub

Open **CodePipeline → Create pipeline**, selecting **Build custom pipeline** if prompted:

- Name: `resume-pipeline`.
- Pipeline type: V2; execution mode: **Queued**, if offered.
- Service role: create a new role and record its name.
- Artifact store: default location, in a **separate private bucket**.
- Source provider: **GitHub (via GitHub App)**.
- Create/select a connection and authorize the AWS Connector for GitHub for `balpreet787/resume`. Its status must be **Available**.
- Repository: `balpreet787/resume`.
- Branch: `main`.
- Output format: **CodePipeline default / ZIP**.
- Enable change detection for pushes to `main`; if using trigger filters, select push events including `main`.
- Source output artifact: `SourceArtifact`. Verify this name in the editor after creation if the wizard supplies it automatically.

[Current AWS GitHub connection instructions](https://docs.aws.amazon.com/codepipeline/latest/userguide/connections-github.html).

### 5. Configure the Build stage

On the pipeline wizard's **Build** screen:

1. Select **Other build providers** (the default **Commands** option is not this workflow).
2. Select **AWS CodeBuild**.
3. Click **Create project**. The environment, role, and buildspec fields below are in the separate CodeBuild project form, not on the initial pipeline screen.
4. Create the project with these settings:

| Setting | Value |
| --- | --- |
| Project name | `resume-build` |
| Environment | Managed image, EC2 compute, Linux container, Ubuntu |
| Image | `aws/codebuild/standard:7.0` |
| Compute size | Small |
| Privileged mode | Disabled |
| Service role | New service role |
| Build specification | Use a buildspec file |
| Buildspec path | `buildspec-build.yml` |
| Logging | CloudWatch logs enabled |

Return to CodePipeline. Choose single build and keep the default input **`SourceArtifact`** and output **`BuildArtifact`**. The test configuration uses these exact names.

The buildspec packages the **contents** of `dist/`, so `index.html` is at the artifact root. Node.js 22 is selected in the buildspec. [AWS runtime support](https://docs.aws.amazon.com/codebuild/latest/userguide/available-runtimes.html).

### 6. Configure the native S3 Deploy stage

Select Amazon S3 and **check Extract file before deploy before proceeding**. When extraction is unchecked, the console requires an S3 object key for a ZIP file. With extraction enabled, leave the object key/path empty so the website files go to the bucket root.

| Setting | Value |
| --- | --- |
| Deploy provider | Amazon S3 |
| Region | `us-west-2` |
| Bucket | Your website bucket |
| Input artifact | `BuildArtifact`, the Build output |
| Extract file before deploy | Enabled |
| Deployment path / object key | Empty; publish at bucket root |
| Canned ACL | Unset |
| CacheControl | `no-cache`, in optional action configuration |

Create the pipeline. It can start an initial run immediately. Add the Test stage below before recording the final working pipeline.

Expand **Additional configuration** for optional settings such as CacheControl. If a setting is not offered during creation, inspect the action in the pipeline editor afterward. Deploy must consume **the build output**, not `SourceArtifact`. Do not select `buildspec-deploy.yml`: the native S3 action handles deployment. [AWS S3 action reference](https://docs.aws.amazon.com/codepipeline/latest/userguide/action-reference-S3Deploy.html).

### 7. Add the Test stage and its action

Now return to **CodePipeline → your pipeline → Edit**:

1. Click **Add stage** between Build and Deploy, name it **`Test`**, and add it.
2. Inside the empty Test stage, click **+ Add action group**. This opens the action settings; entry/success/failure conditions are not test configuration.
3. Enter:

| Action setting | Value |
| --- | --- |
| Action name | `TestWebsite` |
| Action provider | AWS CodeBuild |
| Region | Oregon (`us-west-2`) |
| Input artifacts | Both `SourceArtifact` and `BuildArtifact` |
| Primary source | `SourceArtifact` |
| Project name | Select the existing `resume-test` project; refresh the list if needed (created below)| 
| Build type | Single build, if offered |
| Output artifacts | Leave empty |

 Configure `resume-test`:

| Setting | Value |
| --- | --- |
| Project name | `resume-test` |
| Source provider | GitHub |
| Authentication | Existing GitHub connection; grant repository access if prompted |
| Repository | `https://github.com/balpreet787/resume` |
| Source version | `main`, if offered |
| Webhook / rebuild on source change | Disabled; CodePipeline will start tests |
| Environment image | Managed image |
| Compute platform | EC2, Linux container |
| Operating system | Ubuntu |
| Image | `aws/codebuild/standard:7.0` |
| Compute size | Small |
| Privileged mode | Disabled |
| Service role | New service role |
| Build specification | Use a buildspec file |
| Buildspec name | `buildspec-test.yml` |
| Initial artifacts type | No artifacts for standalone creation only; convert to CODEPIPELINE below before attaching |
| Logging | CloudWatch logs enabled |

4. Click **Create build project** and confirm `resume-test` appears in Build projects.

4. Click **Done** in the action dialog, then **Done** on the Test stage.
5. Leave stage conditions unchanged and **Automated stage configuration** as **None**.
6. Save the pipeline. Verify the order is **Source → Build → Test → Deploy**, and Deploy still takes `BuildArtifact`.

`Test` is the stage, `TestWebsite` is its action, and `resume-test` is the separate CodeBuild project. The project must already have both source and artifact types set to CODEPIPELINE as shown in step 7. The primary input supplies the tests and buildspec; `CODEBUILD_SRC_DIR_BuildArtifact` supplies the already-built website. [AWS multiple-input configuration](https://docs.aws.amazon.com/codepipeline/latest/userguide/action-reference-CodeBuild.html).

### 8. Verify service-role permissions

Public read does not authorize deployment writes. Check the separate service roles:

| Role | Required access |
| --- | --- |
| CodePipeline role | Use the connection; read/write its artifact bucket; start/read both CodeBuild projects; write website objects |
| Build project role | Read/write the artifact bucket; write its CloudWatch logs |
| Test project role | Read the artifact bucket; write its CloudWatch logs |

The console may create these permissions. If missing, add scoped policies while keeping existing permissions. For the **pipeline role**, add this website deployment policy after replacing the bucket name:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetBucketVersioning", "s3:GetBucketAcl", "s3:GetBucketLocation"],
      "Resource": "arn:aws:s3:::YOUR_WEBSITE_BUCKET"
    },
    {
      "Effect": "Allow",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::YOUR_WEBSITE_BUCKET/*"
    }
  ]
}
```

No ACL-writing permission is needed for this configuration because CannedACL is unset and Object Ownership is Bucket owner enforced. Use SSE-S3 and no object-tagging configuration as described; KMS encryption or tagging can require additional permissions.

For the **Test project's role**, if artifact reads fail, find the actual artifact bucket in pipeline settings and add:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetBucketLocation", "s3:GetBucketAcl", "s3:ListBucket"],
      "Resource": "arn:aws:s3:::YOUR_ARTIFACT_BUCKET"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:GetObjectVersion"],
      "Resource": "arn:aws:s3:::YOUR_ARTIFACT_BUCKET/*"
    }
  ]
}
```

Also ensure the pipeline role's existing `codebuild:StartBuild` and `codebuild:BatchGetBuilds` permissions include **both project ARNs**. If the artifact store uses a customer-managed KMS key, its key permissions must also allow the relevant roles. Retain the logging permissions generated for each CodeBuild role.

Save the full pipeline and choose **Release change**.

### 10. Verify the live website

1. Wait for Source, Build, Test, and Deploy to succeed.
2. In the website bucket, confirm `index.html`, `favicon.svg`, `build-info.json`, and `assets/` are at root, not inside a `dist/` directory.
3. Open the exact **HTTP Bucket website endpoint** from S3 Properties.
4. Verify resume text, navigation, project/contact links, mobile layout, and Print / save resume.
5. Record the endpoint, pipeline name, execution ID, source revision, and screenshots in [docs/submission.md](docs/submission.md).

Native S3 deployment confirms upload, not correct browser rendering. It does not run `scripts/smoke.mjs`; that older script expects HTTPS and is not used for this HTTP setup.

### 11. Prove that a push deploys automatically

When ready to publish a deliberate visible change:

```sh
# Edit a sentence in src/index.html first.
npm test
git add src/index.html
git commit -m "Update resume introduction"
git push origin main
```

Watch a new execution start **without clicking Release change**. Confirm the commit matches, all four stages pass, and the updated text appears at the website endpoint after refresh. Capture this second execution for the assignment.

## Testing and deployment behavior

The eight automated checks cover HTML metadata/landmarks, required resume content, internal links, local assets, build checksums/hashed filenames, external link safety, artifact contents, and the presence of responsive/print/reduced-motion styles. They do not replace browser testing or a full accessibility audit.

A failed Test stage blocks Deploy. The exact tested `BuildArtifact` is deployed. Native S3 deployment does not guarantee HTML-last upload ordering, an atomic multi-file switch, deletion of obsolete objects, or an automatic live smoke test. Old asset hashes can accumulate. `CacheControl: no-cache` makes browsers revalidate; it does not add a CDN or HTTPS.

## Maintenance and troubleshooting

See [docs/operations.md](docs/operations.md) for updates, rollback, logging, failure diagnosis, and cleanup. All resource settings are maintained through the console in this workflow; editing files alone does not change AWS settings.

## Existing files outside this setup

`infra/template.yml`, `buildspec-deploy.yml`, and `scripts/smoke.mjs` remain from an earlier CloudFront/CloudFormation approach. They are **not used** by this pipeline. Its deployment provider is Amazon S3, and only `buildspec-build.yml` and `buildspec-test.yml` are configured in CodeBuild. No alarms, lifecycle policies, or log-retention periods are created automatically by these manual instructions.
