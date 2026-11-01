# YouTube HD

Firefox extension (140+) that sets YouTube video quality to a configured
target, or the highest available quality below it.

## Configuration
Click the toolbar icon to open Settings and pick the target quality (144p to
2160p, default 1080p). Changes apply to the open video immediately.

## Behavior
- On each video load (including in-page navigation), the quality is re-applied
  every 500 ms for about 20 seconds, because YouTube adaptive quality can
  override it after it is set.
- Uses the page player API (`setPlaybackQualityRange`) via `wrappedJSObject`.
