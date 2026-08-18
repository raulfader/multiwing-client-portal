# Isolated Media Copy Boundary

The AWS duplicate imports portal records separately from media bytes. No media-copy workflow runs automatically on deployment, and no workflow writes to the legacy portal, legacy database, source S3 bucket, DNS, client sessions, or email systems.

## Approved Copy Set

The validated source export contains **31** unique objects hosted at `faderlabs-client-uploads.s3.us-east-2.amazonaws.com`: six WAV tracks, nineteen MP4 files, and six QuickTime files. The aggregate source size is **8,189,440,006 bytes**. Every source object returned HTTP 200 during the read-only inventory.

The manual workflow derives an object manifest directly from the owner-approved source archive. It accepts only URLs on the approved legacy source host, copies objects only to the private `PrivateMediaBucket` under the `legacy-source/` prefix, and then invokes a private VPC rewriter that verifies every target object before updating only staging database references.

## Deferred External Links

The source export also contains forty external media or thumbnail references: nineteen Frame.io links, nineteen CloudFront links, and two OneDrive links. These references are deliberately outside the source-S3 copy boundary. They remain untouched in both the live portal and the staging duplicate until a separate read-only export or owner-authorized copy path is prepared for each provider.

## Safety Controls

The copy workflow is `workflow_dispatch` only. The Lambda rewriter refuses to alter references unless the workflow declares that the corresponding objects were already copied and verified in the isolated bucket. Duplicate mode, source-mutation blocking, client-email blocking, and DNS-change blocking remain enabled throughout the process.
