# Provider Read-Only Export Methods

## Frame.io

Frame.io's API can return asset metadata and a time-limited original-download URL when called with an authorized JWT, OAuth token, or developer token. The supported path is to identify each asset through an owner-authorized read-only provider session, request the asset with the original-media include, and stream the temporary download URL into private isolated AWS storage. A share link alone is not sufficient to determine its assets in the standard API; Frame.io's developer discussion identifies a separate experimental share-asset listing capability.

No Frame.io share may be created, edited, expired, revoked, or reconfigured. The later migration workflow must read existing approved assets only, download each to staging storage, verify byte count or checksum, and update only the matching isolated portal record after verification.

## OneDrive

Microsoft Graph can resolve an existing sharing URL through `GET /shares/{encoded-sharing-url}/driveItem` and download a file through the corresponding `content` endpoint. The documented least-privileged delegated scope for content download is `Files.Read`. A read-only Microsoft sign-in must be used without the `redeemSharingLink` preference, because that preference can grant durable access; the metadata-only preference is appropriate for initial inspection. Download URLs are temporary and must be used immediately rather than persisted.

No OneDrive share, permission, link, or folder may be changed. The later migration workflow must resolve only the two source links in the approved archive, download verified bytes to private isolated AWS storage, and update only matching isolated staging records.

## References

1. [Frame.io Get an Asset](https://developer.frame.io/api/reference/operation/getAsset/)
2. [Frame.io Media Links](https://next.developer.frame.io/platform/docs/guides/media-links)
3. [Frame.io share-asset API discussion](https://forum.frame.io/t/new-frame-io-api-does-not-provide-a-way-to-retrieve-assets-associated-with-a-shared-link/3250)
4. [Microsoft Graph: Accessing shared DriveItems](https://learn.microsoft.com/en-us/graph/api/shares-get?view=graph-rest-1.0)
5. [Microsoft Graph: Download driveItem content](https://learn.microsoft.com/en-us/graph/api/driveitem-get-content?view=graph-rest-1.0)
