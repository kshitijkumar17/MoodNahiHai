const originalWarn = console.warn;

console.warn = (...args) => {
  const [firstArg] = args;

  if (
    typeof firstArg === "string" &&
    firstArg.includes(
      "Vite requires Node.js version 20.19+ or 22.12+"
    )
  ) {
    return;
  }

  originalWarn(...args);
};

const viteCliUrl = new URL(
  "../node_modules/vite/bin/vite.js",
  import.meta.url
);

await import(viteCliUrl);
