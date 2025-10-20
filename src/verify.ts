import crypto from "crypto";
import { Request, Response, NextFunction } from "express";

export function verifyHubSpotRequest(req: Request, res: Response, next: NextFunction) {
  try {
    const secret = process.env.HUBSPOT_APP_SECRET!;
    const signature = req.header("X-HubSpot-Signature-v3") || "";
    const method = req.method;
    const url = req.protocol + "://" + req.get("host") + req.originalUrl;
    const rawBody: Buffer = (req as any).rawBody;

    const baseString = method + url + rawBody.toString();
    const expected = crypto.createHmac("sha256", secret).update(baseString).digest("base64");
    if (expected !== signature) return res.status(401).send("Bad signature");
    next();
  } catch {
    return res.status(401).send("Verification error");
  }
}

