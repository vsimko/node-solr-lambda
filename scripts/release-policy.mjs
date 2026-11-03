/** Return the npm dist-tag implied by a supported release version. */
export function npmDistTagForVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+)(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z.-]+)?$/.exec(version);
  if (!match) throw new TypeError(`Invalid semantic version: ${version}`);
  const channel = match[4];
  if (!channel) return "latest";
  if (channel === "alpha" || channel === "beta" || channel === "rc") return channel;
  throw new TypeError(`Unsupported prerelease channel "${channel}" in version ${version}`);
}
