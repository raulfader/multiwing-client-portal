# Protected Provider Media Boundary

The isolated Multiwing duplicate has completed the copy of direct legacy S3 media and the accessible public CloudFront thumbnails. The remaining provider links are intentionally not copied automatically.

| Provider | Reference count | Observed boundary | Current action |
|---|---:|---|---|
| Frame.io | 19 | Share/download links require provider-managed access and do not expose direct media bytes through the public reference check. | Defer until an owner-authorized, read-only provider export or download path is available. |
| OneDrive | 2 | Short links resolve `1drv.ms → onedrive.live.com` and end as Microsoft-hosted HTML share pages rather than direct media bytes. Independent OpenAI, Grok, and Claude review reached the same conclusion. | Defer until an owner-authorized, read-only provider export or download path is available. |

No migration workflow may create, alter, expire, or revoke a provider share. The live portal records retain these links unchanged. Any later copy must derive its allowlist from the approved source archive, place copied bytes only in the private isolated media bucket, verify every destination object, and rewrite only the staging duplicate reference that corresponds to a verified copied object.

Provider access must be read-only and owner-authorized. Credentials, shared passwords, session tokens, or one-time codes must not be sent through chat or placed in source control.

## Browser-only Share-Link Mapping Outcome

On 2026-08-19, the owner used Frame.io's **All Share Links** metadata list in the browser while the migration process recorded no archive changes. The 19 approved legacy Frame.io references were matched one-for-one against visible share metadata. The local verification report confirmed 19 planned codes, 19 mapped codes, no duplicates, no missing approved codes, no unexpected codes, and no match to the newly created unapproved test share.

This mapping confirms only the identity of the approved share records; it does **not** authorize a download, provider API access, asset inspection, share-setting change, or source-archive mutation. The 19 Frame.io assets remain deferred until a separate owner-authorized, read-only export method is reviewed. The owner-created test share remains excluded from the migration and may be cleaned up only after explicit owner approval.
