import express from "express";
import supabase from "../config/supabaseClient.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ===========================
   SEND MESSAGE
=========================== */
router.post("/", verifyToken, async (req, res) => {
  const { content, parent_id } = req.body;

  const { data, error } = await supabase
    .from("messages")
    .insert([
      {
        user_id: req.user.id,
        content,
        parent_id
      }
    ])
    .select()
    .single();

  if (error) return res.status(400).json(error);

  res.json(data);
});

/* ===========================
   GET ALL MESSAGES
=========================== */
router.get("/", verifyToken, async (req, res) => {
  const { data, error } = await supabase
    .from("messages")
    .select(`
      *,
      users:user_id ( name )
    `)
    .order("created_at", { ascending: true });

  if (error) return res.status(400).json(error);

  res.json(data);
});
/* ===========================
   GET UNREAD COUNT
=========================== */
router.get("/unread-count", verifyToken, async (req, res) => {
  const userId = req.user.id;

  // 1️⃣ Get user's last seen time
  const { data: user } = await supabase
    .from("users")
    .select("last_seen_chat")
    .eq("id", userId)
    .single();

  const lastSeen = user?.last_seen_chat || "1970-01-01";

  // 2️⃣ Count ONLY messages sent by OTHER users
  const { count, error } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .gt("created_at", lastSeen)
    .neq("user_id", userId); // 👈 VERY IMPORTANT

  if (error) return res.status(400).json(error);

  res.json({ unread: count });
});
/* ===========================
   MARK CHAT AS READ
=========================== */
router.patch("/mark-read", verifyToken, async (req, res) => {
  const userId = req.user.id;

  const { error } = await supabase
    .from("users")
    .update({ last_seen_chat: new Date() })
    .eq("id", userId);

  if (error) return res.status(400).json(error);

  res.json({ success: true });
});
export default router;