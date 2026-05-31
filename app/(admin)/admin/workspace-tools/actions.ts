"use server";

import { requireAdmin } from "@/src/lib/auth";
import { createClient } from "@/src/lib/supabase/server";

export type AdminProjectStatus = "active" | "paused" | "completed" | "archived";
export type AdminKanbanStatus =
  | "backlog"
  | "todo"
  | "in_progress"
  | "review"
  | "done"
  | "blocked";

export type AdminProject = {
  id: string;
  user_id: string | null;
  title: string;
  description: string | null;
  status: AdminProjectStatus;
  owner: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminKanbanTask = {
  id: string;
  user_id: string | null;
  title: string;
  description: string | null;
  status: AdminKanbanStatus;
  position: number;
  project_id: string | null;
  created_at: string;
  updated_at: string;
  project_title?: string | null;
};

export type AdminCalendarEvent = {
  id: string;
  user_id: string | null;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  event_type: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminChatChannel = {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  created_at: string;
};

export type AdminChatMessage = {
  id: string;
  user_id: string | null;
  sender_name: string | null;
  body: string;
  channel: string;
  channel_id: string | null;
  created_at: string;
};

type ActionErr = { ok: false; error: string };
type ActionOk<T> = { ok: true; data: T };

function err(message: string): ActionErr {
  return { ok: false, error: message };
}

async function verifyProjectExists(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string | null,
): Promise<boolean> {
  if (!projectId) return true;
  const { data, error } = await supabase
    .from("admin_projects")
    .select("id")
    .eq("id", projectId)
    .maybeSingle();
  if (error) return false;
  return !!data;
}

export async function fetchAdminProjects(): Promise<ActionOk<AdminProject[]> | ActionErr> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("admin_projects")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return err(error.message);
  return { ok: true, data: (data ?? []) as AdminProject[] };
}

export async function createAdminProject(input: {
  title: string;
  description?: string | null;
  status?: AdminProjectStatus;
  owner?: string | null;
  due_date?: string | null;
}): Promise<ActionOk<AdminProject> | ActionErr> {
  const admin = await requireAdmin();
  const title = input.title.trim();
  if (!title) return err("Title is required.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("admin_projects")
    .insert({
      user_id: admin.id,
      title,
      description: input.description?.trim() || null,
      status: input.status ?? "active",
      owner: input.owner?.trim() || null,
      due_date: input.due_date || null,
    })
    .select("*")
    .single();
  if (error) return err(error.message);
  return { ok: true, data: data as AdminProject };
}

export async function updateAdminProject(
  id: string,
  patch: {
    title?: string;
    description?: string | null;
    status?: AdminProjectStatus;
    owner?: string | null;
    due_date?: string | null;
  },
): Promise<ActionOk<AdminProject> | ActionErr> {
  const admin = await requireAdmin();
  const supabase = await createClient();
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) {
    const t = patch.title.trim();
    if (!t) return err("Title is required.");
    row.title = t;
  }
  if (patch.description !== undefined) row.description = patch.description?.trim() || null;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.owner !== undefined) row.owner = patch.owner?.trim() || null;
  if (patch.due_date !== undefined) row.due_date = patch.due_date || null;
  if (Object.keys(row).length === 0) return err("Nothing to update.");
  const { data, error } = await supabase
    .from("admin_projects")
    .update(row)
    .eq("id", id)
    .select("*")
    .single();
  if (error) return err(error.message);
  return { ok: true, data: data as AdminProject };
}

export async function deleteAdminProject(id: string): Promise<ActionOk<void> | ActionErr> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("admin_projects").delete().eq("id", id);
  if (error) return err(error.message);
  return { ok: true, data: undefined };
}

export async function fetchAdminKanbanTasks(): Promise<ActionOk<AdminKanbanTask[]> | ActionErr> {
  await requireAdmin();
  const supabase = await createClient();
  const { data: tasks, error: tErr } = await supabase.from("admin_kanban_tasks").select("*");
  if (tErr) return err(tErr.message);
  const statusOrder: AdminKanbanStatus[] = [
    "backlog",
    "todo",
    "in_progress",
    "review",
    "done",
    "blocked",
  ];
  const raw = [...(tasks ?? [])] as AdminKanbanTask[];
  raw.sort((a, b) => {
    const ia = statusOrder.indexOf(a.status);
    const ib = statusOrder.indexOf(b.status);
    if (ia !== ib) return ia - ib;
    return (a.position ?? 0) - (b.position ?? 0);
  });
  const { data: projects } = await supabase.from("admin_projects").select("id, title");
  const titleById = new Map((projects ?? []).map((p) => [p.id as string, p.title as string]));
  const withTitles = raw.map((t) => ({
    ...t,
    project_title: t.project_id ? titleById.get(t.project_id) ?? null : null,
  }));
  return { ok: true, data: withTitles };
}

export async function createAdminKanbanTask(input: {
  title: string;
  description?: string | null;
  status?: AdminKanbanStatus;
  project_id?: string | null;
}): Promise<ActionOk<AdminKanbanTask> | ActionErr> {
  const admin = await requireAdmin();
  const title = input.title.trim();
  if (!title) return err("Title is required.");
  const supabase = await createClient();
  const pid = input.project_id ?? null;
  if (!(await verifyProjectExists(supabase, pid))) {
    return err("Invalid project.");
  }
  const status = input.status ?? "todo";
  const { data: maxRow } = await supabase
    .from("admin_kanban_tasks")
    .select("position")
    .eq("status", status)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = (typeof maxRow?.position === "number" ? maxRow.position : -1) + 1;
  const { data, error } = await supabase
    .from("admin_kanban_tasks")
    .insert({
      user_id: admin.id,
      title,
      description: input.description?.trim() || null,
      status,
      position,
      project_id: pid,
    })
    .select("*")
    .single();
  if (error) return err(error.message);
  return { ok: true, data: data as AdminKanbanTask };
}

export async function updateAdminKanbanTask(
  id: string,
  patch: {
    title?: string;
    description?: string | null;
    project_id?: string | null;
  },
): Promise<ActionOk<AdminKanbanTask> | ActionErr> {
  const admin = await requireAdmin();
  const supabase = await createClient();
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) {
    const t = patch.title.trim();
    if (!t) return err("Title is required.");
    row.title = t;
  }
  if (patch.description !== undefined) row.description = patch.description?.trim() || null;
  if (patch.project_id !== undefined) {
    if (!(await verifyProjectExists(supabase, patch.project_id))) {
      return err("Invalid project.");
    }
    row.project_id = patch.project_id;
  }
  if (Object.keys(row).length === 0) return err("Nothing to update.");
  const { data, error } = await supabase
    .from("admin_kanban_tasks")
    .update(row)
    .eq("id", id)
    .select("*")
    .single();
  if (error) return err(error.message);
  return { ok: true, data: data as AdminKanbanTask };
}

export async function deleteAdminKanbanTask(id: string): Promise<ActionOk<void> | ActionErr> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("admin_kanban_tasks").delete().eq("id", id);
  if (error) return err(error.message);
  return { ok: true, data: undefined };
}

const KANBAN_STATUSES: AdminKanbanStatus[] = [
  "backlog",
  "todo",
  "in_progress",
  "review",
  "done",
  "blocked",
];

export async function saveAdminKanbanOrder(
  order: Record<AdminKanbanStatus, string[]>,
): Promise<ActionOk<void> | ActionErr> {
  const admin = await requireAdmin();
  const supabase = await createClient();
  for (const status of KANBAN_STATUSES) {
    const ids = order[status] ?? [];
    for (let i = 0; i < ids.length; i++) {
      const { error } = await supabase
        .from("admin_kanban_tasks")
        .update({ status, position: i })
        .eq("id", ids[i]);
      if (error) return err(error.message);
    }
  }
  return { ok: true, data: undefined };
}

export async function fetchAdminCalendarEvents(): Promise<
  ActionOk<AdminCalendarEvent[]> | ActionErr
> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("admin_calendar_events")
    .select("*")
    .order("event_date", { ascending: true })
    .order("event_time", { ascending: true });
  if (error) return err(error.message);
  return { ok: true, data: (data ?? []) as AdminCalendarEvent[] };
}

export async function createAdminCalendarEvent(input: {
  title: string;
  description?: string | null;
  event_date: string;
  event_time?: string | null;
  event_type?: string | null;
}): Promise<ActionOk<AdminCalendarEvent> | ActionErr> {
  const admin = await requireAdmin();
  const title = input.title.trim();
  if (!title) return err("Title is required.");
  const event_date = input.event_date.trim();
  if (!event_date) return err("Event date is required.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("admin_calendar_events")
    .insert({
      user_id: admin.id,
      title,
      description: input.description?.trim() || null,
      event_date,
      event_time: input.event_time?.trim() || null,
      event_type: input.event_type?.trim() || "general",
    })
    .select("*")
    .single();
  if (error) return err(error.message);
  return { ok: true, data: data as AdminCalendarEvent };
}

export async function updateAdminCalendarEvent(
  id: string,
  patch: {
    title?: string;
    description?: string | null;
    event_date?: string;
    event_time?: string | null;
    event_type?: string | null;
  },
): Promise<ActionOk<AdminCalendarEvent> | ActionErr> {
  const admin = await requireAdmin();
  const supabase = await createClient();
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) {
    const t = patch.title.trim();
    if (!t) return err("Title is required.");
    row.title = t;
  }
  if (patch.description !== undefined) row.description = patch.description?.trim() || null;
  if (patch.event_date !== undefined) {
    if (!patch.event_date.trim()) return err("Event date is required.");
    row.event_date = patch.event_date.trim();
  }
  if (patch.event_time !== undefined) row.event_time = patch.event_time?.trim() || null;
  if (patch.event_type !== undefined) row.event_type = patch.event_type?.trim() || "general";
  if (Object.keys(row).length === 0) return err("Nothing to update.");
  const { data, error } = await supabase
    .from("admin_calendar_events")
    .update(row)
    .eq("id", id)
    .select("*")
    .single();
  if (error) return err(error.message);
  return { ok: true, data: data as AdminCalendarEvent };
}

export async function deleteAdminCalendarEvent(id: string): Promise<ActionOk<void> | ActionErr> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("admin_calendar_events").delete().eq("id", id);
  if (error) return err(error.message);
  return { ok: true, data: undefined };
}

export async function fetchAdminChatChannels(): Promise<ActionOk<AdminChatChannel[]> | ActionErr> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("admin_chat_channels")
    .select("*")
    .order("name", { ascending: true });
  if (error) return err(error.message);
  return { ok: true, data: (data ?? []) as AdminChatChannel[] };
}

export async function fetchAdminChatMessages(
  channelSlug = "general",
): Promise<ActionOk<AdminChatMessage[]> | ActionErr> {
  await requireAdmin();
  const supabase = await createClient();
  const { data: channel } = await supabase
    .from("admin_chat_channels")
    .select("id, slug")
    .eq("slug", channelSlug)
    .maybeSingle();

  let query = supabase.from("admin_chat_messages").select("*").order("created_at", { ascending: true }).limit(200);

  if (channel?.id) {
    query = query.or(`channel_id.eq.${channel.id},channel.eq.${channelSlug}`);
  } else {
    query = query.eq("channel", channelSlug === "general" ? "team" : channelSlug);
  }

  const { data, error } = await query;
  if (error) return err(error.message);
  return { ok: true, data: (data ?? []) as AdminChatMessage[] };
}

export async function sendAdminChatMessage(
  body: string,
  channelSlug = "general",
): Promise<ActionOk<AdminChatMessage> | ActionErr> {
  const admin = await requireAdmin();
  const text = body.trim();
  if (!text) return err("Message is empty.");
  const sender_name =
    admin.full_name?.trim() || admin.email?.trim() || "Team member";
  const supabase = await createClient();
  const { data: channel } = await supabase
    .from("admin_chat_channels")
    .select("id, slug")
    .eq("slug", channelSlug)
    .maybeSingle();

  const { data, error } = await supabase
    .from("admin_chat_messages")
    .insert({
      user_id: admin.id,
      sender_name,
      body: text,
      channel: channelSlug,
      channel_id: channel?.id ?? null,
    })
    .select("*")
    .single();
  if (error) return err(error.message);
  return { ok: true, data: data as AdminChatMessage };
}
