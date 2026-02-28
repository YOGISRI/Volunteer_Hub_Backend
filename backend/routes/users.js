import express from "express";
import supabase from "../config/supabaseClient.js";
import {verifyToken} from "../middleware/authMiddleware.js";

const router = express.Router();

// GET current user
router.get("/me", verifyToken, async (req, res) => {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", req.user.id)
    .single();

  if (error) return res.status(400).json({ error: error.message });

  res.json(data);
});

// UPDATE current user
router.put("/me", verifyToken, async (req, res) => {
  const { skills, availability } = req.body;

  const { data, error } = await supabase
    .from("users")
    .update({ skills, availability })
    .eq("id", req.user.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });

  res.json(data);
});
router.get("/:id/rating", async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("users")
    .select("rating_score")
    .eq("id", id)
    .single();

  if (error) return res.status(400).json({ error: error.message });

  res.json({
    score: data.rating_score || 0
  });
});
router.get("/:id/streak", async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("applications")
      .select("completed_at")
      .eq("volunteer_id", id)
      .eq("completed", true);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!data.length) {
      return res.json({ streak: 0 });
    }

    // Extract unique months
    const months = data.map(d => {
      const date = new Date(d.completed_at);
      return `${date.getFullYear()}-${date.getMonth()}`;
    });

    const uniqueMonths = [...new Set(months)].sort();

    // Calculate consecutive streak backwards
    let streak = 1;

    for (let i = uniqueMonths.length - 1; i > 0; i--) {
      const [y1, m1] = uniqueMonths[i].split("-").map(Number);
      const [y2, m2] = uniqueMonths[i - 1].split("-").map(Number);

      if (y1 === y2 && m1 - m2 === 1) {
        streak++;
      } else if (y1 - y2 === 1 && m1 === 0 && m2 === 11) {
        // December → January case
        streak++;
      } else {
        break;
      }
    }

    res.json({ streak });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get("/:id/hours", async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("applications")
    .select("hours, completed_at")
    .eq("volunteer_id", id)
    .eq("completed", true);

  if (error) return res.status(400).json({ error: error.message });

  const totalHours = data.reduce((sum, app) => sum + (app.hours || 0), 0);

  res.json({
    totalHours,
    history: data
  });
});

export default router;