export default async function handler(req: any, res: any) {
  try {
    const serverModule = await import("../server" as any);
    const app = serverModule.app || serverModule.default;
    return app(req, res);
  } catch (err: any) {
    console.error("API Startup Crash:", err);
    res.status(500).json({ 
      error: "API Startup Crash", 
      message: err?.message || String(err),
      stack: err?.stack
    });
  }
}
