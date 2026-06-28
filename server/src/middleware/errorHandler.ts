import { Request, Response, NextFunction } from "express";

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error("[Error]", err.message);

  res.status(500).json({
    error: "Erreur interne du serveur",
    ...(process.env.NODE_ENV === "development" && { details: err.message }),
  });
}
