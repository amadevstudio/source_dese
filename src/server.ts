import app from "./app.js";
import config from "./config/config.js";

app.listen(config.port, () => {
  console.log(`sourcemap-decode-service running on port ${config.port}`);
  console.log(`Sourcemaps path: ${config.sourcemapAssetsPath}`);
  console.log(`API docs: http://localhost:${config.port}/api-docs`);
});
