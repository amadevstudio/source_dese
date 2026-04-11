import { formatUser, validateEmail } from "./utils";

function initApp() {
  const user = formatUser("Alice", 30);
  console.log(user);

  // This will throw
  validateEmail("not-an-email");
}

function bootstrap() {
  try {
    initApp();
  } catch (err) {
    // Simulate what a browser error reporter would capture
    if (err instanceof Error) {
      console.error(err.stack);
    }
  }
}

bootstrap();
