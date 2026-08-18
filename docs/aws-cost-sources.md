# AWS Cost Estimate Sources — Multiwing

The following official AWS pricing facts were retrieved on 2026-08-17 for a US East (N. Virginia) Multiwing estimate.

| Service | Relevant official pricing fact | Source |
|---|---|---|
| NAT Gateway | Charged hourly plus per GB processed; the published US East hourly rate returned in the AWS pricing result was `$0.045/hour`. At 730 hours, the fixed hourly component is `$32.85/month`, before data processing. | [AWS VPC Pricing](https://aws.amazon.com/vpc/pricing/) |
| RDS MySQL | RDS is usage-priced with no minimum or upfront fee. The estimate will model a smallest suitable single-AZ instance and storage separately, then list Multi-AZ as an optional reliability uplift. | [AWS RDS for MySQL Pricing](https://aws.amazon.com/rds/mysql/pricing/) |
| S3 Standard | US East Standard storage is commonly priced at `$0.023/GB-month`; requests and retrieval/transfer can add costs. | [AWS S3 Pricing](https://aws.amazon.com/s3/pricing/) |
| Lambda | Functions are priced by requests and GB-seconds. The cited free tier includes 1 million requests and 400,000 GB-seconds per month. | [AWS Lambda Pricing](https://aws.amazon.com/lambda/pricing/) |
| API Gateway HTTP API | No minimum fee; charges are based on API calls and data transfer. The official example prices 300 million HTTP API calls at `$1.00/million` and the next tier at `$0.90/million`. | [AWS API Gateway Pricing](https://aws.amazon.com/api-gateway/pricing/) |
| CloudFront | CloudFront offers both pay-as-you-go and flat-rate plans. The official pricing page states that CloudFront-to-AWS-origin transfer is waived and that plans begin at `$0/month`; production delivery remains traffic-sensitive under pay-as-you-go. | [AWS CloudFront Pricing](https://aws.amazon.com/cloudfront/pricing/) |
| EventBridge Scheduler | The Scheduler free tier allows 14 million invocations per month; additional scheduled invocations are priced at `$1.00/million`. | [AWS EventBridge Pricing](https://aws.amazon.com/eventbridge/pricing/) |
| MediaConvert | On-demand MediaConvert is charged by output-content minutes, with rate dependent on region, resolution, codec, and enabled features. This is a major variable cost and should be modeled using actual proxy-video minutes rather than a flat monthly line item. | [AWS MediaConvert Pricing](https://aws.amazon.com/mediaconvert/pricing/) |
| SES | SES is usage-priced by email volume. At Multiwing’s expected low transactional volume, it is likely a small variable cost, but attachments and inbound/received mail features can affect billing. | [AWS SES Pricing](https://aws.amazon.com/ses/pricing/) |
| CloudWatch | CloudWatch log ingestion, retention, metrics, and alarms are usage-priced. The estimate will keep log retention bounded and separate observability from storage/compute assumptions. | [AWS CloudWatch Pricing](https://aws.amazon.com/cloudwatch/pricing/) |

The final estimate will clearly separate predictable baseline charges from media-delivery and transcoding usage, which require actual Multiwing storage, playback, upload, and conversion measurements.
