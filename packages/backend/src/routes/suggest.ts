import { Router } from "express";
import { githubService } from "../services/github.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const query = (req.query.q as string) || "";
    if (!query || query.length < 2) {
      res.json([]);
      return;
    }
    const suggestions = await githubService.getSuggestions(query);
    res.json(suggestions);
  } catch (error: unknown) {
    res.json([]);
  }
});

export default router;
