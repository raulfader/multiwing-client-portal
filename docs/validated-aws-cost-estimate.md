# Multiwing AWS Cost Estimate — Validated Against Current Source

**Prepared:** 2026-08-17  
**Scope:** AWS-only estimate for an isolated Multiwing staging environment and a future production environment. This is an operational planning estimate, not an AWS invoice or binding quote.

## What Was Validated in the Current Multi-wing Client Portal Source

The checked repository is `raulfader/multiwing-client-portal`, the source corresponding to the Multi-wing Client Portal task. The code confirms that Multiwing is not a simple static site. It contains MySQL-backed project, deliverable, comment, approval, share, OTP, session, contact, email-log, analytics, request, settings, and activity-log records. It also creates presigned S3 upload, download, and two-hour streaming URLs; it has a six-hour activity digest; sends transactional portal mail over Gmail SMTP; and accepts a callback from an AWS Lambda media-transcoding workflow.

> The practical implication is that database/network availability and media storage/delivery are the meaningful cost drivers. Lambda, HTTP API, and four scheduled digest checks per day are comparatively small at normal portal volume.

The current source defaults to an existing direct S3 integration named `faderlabs-client-uploads` in `us-east-2`, and it contains public URL helpers alongside presigned URL helpers. The AWS migration should use a new **private** Multiwing bucket, access only through signed client/guest flows and CloudFront. Because the actual current bucket total, playback transfer, and monthly proxy-video minutes were not available from source code alone, those variables are shown explicitly rather than invented.

## Cost Assumptions Used

| Component | Planning assumption | Why it is appropriate |
|---|---:|---|
| Network availability | One NAT Gateway, 730 hours/month | The approved private-RDS/Lambda design needs outbound access for AWS service calls and email until an endpoint-only design is evaluated. AWS bills the NAT Gateway hourly and for processed data. |
| Database | One single-AZ `db.t4g.micro`-class MySQL instance plus 20 GB initial storage | Suitable as a conservative empty staging baseline. Production database sizing must be revisited after measuring actual row counts and workload. |
| Storage | 25 GB staging, then formulas for 50 GB, 250 GB, and 1 TB production media | The source confirms media objects but does not expose aggregate size. |
| API, compute, digest | Normal low-to-moderate client-portal use; no provisioned concurrency | Lambda has a 1M-request/400,000 GB-second monthly free tier, HTTP API has usage-based pricing, and the four daily digest checks are far below the EventBridge Scheduler free tier. |
| Media conversion | Modeled separately by source-video minutes | The portal already invokes an AWS transcode workflow; AWS bills MediaConvert by output minute and job configuration. |

## Predictable Monthly Baseline

The following values use a 730-hour month. The NAT Gateway fixed hourly portion is `0.045 × 730 = $32.85`. A `db.t4g.micro` planning value of `$0.016/hour` yields `0.016 × 730 = $11.68`; 20 GB of initial database storage at `$0.115/GB-month` yields `$2.30`. These are planning inputs, not an AWS quote.

| Environment | NAT Gateway | Small RDS + 20 GB storage | Initial S3 storage | Logs / secrets / small API allowance | Estimated predictable baseline |
|---|---:|---:|---:|---:|---:|
| **Empty isolated staging** | $32.85 | $13.98 | $0.58 for 25 GB | about $3 | **about $50/month** |
| **Future production, excluding media transfer and conversion** | $32.85 | $13.98 | $1.15 for 50 GB | about $6 | **about $54/month** |
| **Staging + production together** | $65.70 | $27.96 | $1.73 for 75 GB | about $9 | **about $104/month** |

These figures intentionally exclude client media delivery, final source-media storage, media conversion, and any optional high-availability upgrades. They are the fixed infrastructure floor for the private design—not a realistic maximum.

## Variable Media and Delivery Costs

| Driver | Transparent planning formula | Example only |
|---|---|---|
| Private S3 media storage | `stored GB × $0.023/month` | 250 GB ≈ **$5.75/month**; 1 TB ≈ **$23.55/month** before requests and lifecycle savings. |
| Client video/audio playback and downloads | `GB delivered to viewers × applicable CloudFront rate` | This can be near zero at low usage and can become the principal recurring charge for heavily reviewed video. Measure actual monthly delivery before committing to a production budget. |
| MediaConvert proxy generation | `output minutes × job-specific output-minute rate` | AWS’s Video on Demand reference estimates a 60-minute source in `us-east-1` at about **$4.23** for its illustrated workflow; 10 hours of equivalent source material would be about **$42**. Actual Multiwing jobs may differ substantially by output settings. |
| Portal email | `emails sent × SES rate` | Low-volume transactional invitations, OTPs, and digests are expected to be a small charge relative to video storage/delivery. |
| API and Lambda | requests + GB-seconds | Typically negligible at normal client-portal volume compared with the always-on NAT/RDS baseline and media use. |

## Cost-Conscious Recommendation

The source audit changes the prior generic recommendation in one important way: **do not assume that moving the portal to AWS will make video/media costs disappear.** Multiwing already depends on AWS-style S3 and a Lambda transcode callback. The migration’s value is data ownership, private media controls, clean isolation, reproducible deployment, and predictable rollback—not an automatic reduction in media cost.

For the approved first stage, the cost-conscious path is to create an empty staging environment but control the always-on baseline carefully. A staging RDS/NAT environment should be used only while performing real synthetic validation; it can be decommissioned when validation pauses, or we can prepare the infrastructure definition without deploying it. Production should remain single-AZ initially only if the agreed client-risk tolerance permits it; a Multi-AZ RDS configuration is a reliability decision that increases the fixed cost and should be separately approved.

Before any production media migration, run a **read-only aggregate inventory** that reports only total object count, total bytes, object classes, and recent access/transcode counts. That measurement will replace the media placeholders with an evidence-based forecast and determine whether lifecycle tiers, cached playback, or changes to proxy settings are worthwhile.

## References

[1] [AWS VPC Pricing](https://aws.amazon.com/vpc/pricing/) — NAT Gateway hourly and data-processing pricing.  
[2] [Amazon RDS for MySQL Pricing](https://aws.amazon.com/rds/mysql/pricing/) — RDS usage-based pricing.  
[3] [Amazon S3 Pricing](https://aws.amazon.com/s3/pricing/) — storage, request, and transfer pricing.  
[4] [AWS Lambda Pricing](https://aws.amazon.com/lambda/pricing/) — requests, duration, and free-tier information.  
[5] [Amazon API Gateway Pricing](https://aws.amazon.com/api-gateway/pricing/) — HTTP API usage-based pricing.  
[6] [Amazon CloudFront Pricing](https://aws.amazon.com/cloudfront/pricing/) — delivery and pricing-plan information.  
[7] [Amazon EventBridge Pricing](https://aws.amazon.com/eventbridge/pricing/) — Scheduler free tier and invocation pricing.  
[8] [AWS Elemental MediaConvert Pricing](https://aws.amazon.com/mediaconvert/pricing/) — output-minute pricing model.  
[9] [AWS Video on Demand Cost Reference](https://docs.aws.amazon.com/solutions/latest/video-on-demand-on-aws/cost.html) — illustrative source-video transcode estimate.  
[10] [Amazon SES Pricing](https://aws.amazon.com/ses/pricing/) — usage-based email pricing.
