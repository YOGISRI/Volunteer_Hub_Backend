import express from "express";
import supabase from "../config/supabaseClient.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router(); // ✅ THIS WAS MISSING

/* ===========================
   CREATE GROUP EVENT
=========================== */
router.post("/", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "organization") {
      return res.status(403).json({ error: "Only organizations allowed" });
    }

    const { opportunity_id, name, description } = req.body;

    const { data, error } = await supabase
      .from("group_events")
      .insert([
        {
          opportunity_id,
          organization_id: req.user.id,
          name,
          description
        }
      ])
      .select()
      .single();

    if (error) return res.status(400).json(error);

    res.json(data);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ===========================
   JOIN GROUP EVENT
=========================== */
router.post("/:id/join", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "volunteer") {
      return res.status(403).json({ error: "Only volunteers allowed" });
    }

    const { id } = req.params;

    // 🔍 Check if already joined
    const { data: existing } = await supabase
      .from("group_event_members")
      .select("*")
      .eq("group_event_id", id)
      .eq("volunteer_id", req.user.id)
      .single();

    if (existing) {
      return res.status(400).json({ message: "Already joined this group" });
    }

    // ✅ Insert if not exists
    const { error } = await supabase
      .from("group_event_members")
      .insert([
        {
          group_event_id: id,
          volunteer_id: req.user.id
        }
      ]);

    if (error) return res.status(400).json(error);

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ===========================
   GROUP STATS
=========================== */
router.get("/:id/stats", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: members } = await supabase
      .from("group_event_members")
      .select("volunteer_id")
      .eq("group_event_id", id);

    const memberIds = members?.map(m => m.volunteer_id) || [];

    if (memberIds.length === 0) {
      return res.json({ totalMembers: 0, totalHours: 0 });
    }

    const { data: apps } = await supabase
      .from("applications")
      .select("hours")
      .in("volunteer_id", memberIds)
      .eq("completed", true);

    const totalHours = apps.reduce((sum, a) => sum + (a.hours || 0), 0);

    res.json({
      totalMembers: memberIds.length,
      totalHours
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
/* ===========================
   GET ALL GROUP EVENTS (FOR VOLUNTEERS)
=========================== */
router.get("/", verifyToken, async (req, res) => {
  const { data, error } = await supabase
    .from("group_events")
    .select(`
      *,
      opportunities(title),
      users:organization_id(name)
    `)
    .order("created_at", { ascending: false });

  if (error) return res.status(400).json(error);

  res.json(data);
});
/* ===========================
   GET SINGLE GROUP EVENT
=========================== */
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("group_events")
      .select(`
        *,
        opportunities(title),
        users:organization_id(name)
      `)
      .eq("id", id)
      .single();

    if (error) return res.status(404).json({ message: "Group not found" });

    res.json(data);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get("/:id/check", verifyToken, async (req, res) => {
  const { id } = req.params;

  const { data } = await supabase
    .from("group_event_members")
    .select("*")
    .eq("group_event_id", id)
    .eq("volunteer_id", req.user.id)
    .single();

  res.json({ joined: !!data });
});
export default router;