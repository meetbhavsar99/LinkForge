import { Router, Request, Response } from "express";
import { prisma } from "../db/prisma";

const router = Router();

// GET /:code - public redirect endpoint
// This is the hot path: 100:1 read-heavy. Every optimization matters here.
router.get("/:code", async (req: Request, res: Response) => {
  const code = Array.isArray(req.params.code)
    ? req.params.code[0]
    : req.params.code;

  // Basic validation: Base62 codes are alphanumeric only.
  // Reject obviously malformed requests before hitting the DB.
  // This also stops favicon.ico and other noise from causing DB queries.
  if (!code || !/^[0-9A-Za-z]+$/.test(code) || code.length > 12) {
    return res.status(404).send("Not found");
  }

  try {
    const url = await prisma.url.findUnique({
      where: { shortCode: code },
      select: { longUrl: true }, // only fetch what we need
    });

    if (!url) {
      return res.status(404).send("Not found");
    }

    // 301 = permanent redirect. Browsers and proxies cache 301s aggressively,
    // which is what we want for short URLs. Use 302 if ever need to
    // change destinations dynamically.
    return res.redirect(301, url.longUrl);
  } catch (err) {
    console.error("Redirect lookup failed:", err);
    return res.status(500).send("Internal error");
  }
});

export default router;
