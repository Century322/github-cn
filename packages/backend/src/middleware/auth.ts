import { Request, Response, NextFunction } from "express";
import { ADMIN_PASSWORD } from "../config/env.js";

export function authCheck(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${ADMIN_PASSWORD}`) {
    res.status(401).json({ error: "未授权访问" });
    return;
  }
  next();
}
