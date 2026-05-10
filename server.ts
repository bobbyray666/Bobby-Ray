import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API Route to provide current project files for syncing
  app.get("/api/files", (req, res) => {
    const files: { path: string, content: string }[] = [];
    const rootDir = process.cwd();

    function walkDir(currentPath: string) {
      const items = fs.readdirSync(currentPath);
      for (const item of items) {
        if (item === 'node_modules' || item === '.git' || item === 'dist' || item === '.next') continue;
        const fullPath = path.join(currentPath, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          walkDir(fullPath);
        } else {
          const relativePath = path.relative(rootDir, fullPath);
          // Skip large binary files or non-source files if needed
          if (stat.size < 1024 * 1024) { // 1MB limit for sync
            files.push({
              path: relativePath,
              content: fs.readFileSync(fullPath, 'utf-8')
            });
          }
        }
      }
    }

    try {
      walkDir(rootDir);
      res.json(files);
    } catch (error) {
      res.status(500).json({ error: "Failed to read workspace files" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
