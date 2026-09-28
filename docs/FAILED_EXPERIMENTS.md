# Failed / rejected experiments

- **Pure primitive geometry as the final premium vehicle**: functionally robust, but visually too synthetic for the requested target. Retained only as fallback.
- **Headless Chromium high-detail QA inside the current container**: external CDN access is blocked in this environment, so Three.js/model imports could not complete. This is an environment/network limitation rather than a proven page failure.
- **One-file-only final architecture**: rejected because a high-detail GLB and maintainable renderer benefit from modular code. The one-file build remains as fallback.
