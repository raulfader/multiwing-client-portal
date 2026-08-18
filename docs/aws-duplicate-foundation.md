# Multiwing AWS Duplicate Foundation

This CloudFormation template creates an **empty, isolated staging foundation** for the Multiwing duplicate. It intentionally omits a public hostname, CloudFront distribution, Cognito invitations, deployment of runtime code, data-copy action, media-copy action, and all client email automation.

The template establishes a distinct VPC, private MySQL database, three encrypted private S3 buckets, security groups, and a Secrets Manager configuration that explicitly disables source mutation, client email, and live-DNS changes. The database is private, single-AZ, encrypted, and configured to snapshot rather than silently delete. All buckets retain their contents on stack deletion so copy evidence and recovered media are not lost.

## What This Does Not Do

No source information is read or copied when this stack is created. The current Manus portal remains untouched. No record points `multiwing.faderlabs.ai` to AWS, no production password or guest link is changed, and no client receives a message.

## Foundation Deployment Gate

Deploying this template creates billable staging resources, notably the NAT Gateway and RDS instance. It should be deployed only through a separate Multiwing GitHub deployment role after a cost acknowledgment and a final check that the stack name is `multiwing-staging`.
