module.exports = [
"[project]/lib/workbench-types.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ANNOTATION_TAGS",
    ()=>ANNOTATION_TAGS,
    "COLLABORATOR_ROLES",
    ()=>COLLABORATOR_ROLES,
    "DEFAULT_RESEARCH_MILESTONES",
    ()=>DEFAULT_RESEARCH_MILESTONES,
    "PROJECT_RECORD_STATUSES",
    ()=>PROJECT_RECORD_STATUSES,
    "PROJECT_RECORD_STATUS_LABEL",
    ()=>PROJECT_RECORD_STATUS_LABEL,
    "PROJECT_STATUS",
    ()=>PROJECT_STATUS,
    "PROJECT_VISIBILITY",
    ()=>PROJECT_VISIBILITY,
    "TASK_PRIORITIES",
    ()=>TASK_PRIORITIES,
    "TASK_PRIORITY_LABEL",
    ()=>TASK_PRIORITY_LABEL,
    "TASK_REVIEW_TYPES",
    ()=>TASK_REVIEW_TYPES,
    "TASK_REVIEW_TYPE_LABEL",
    ()=>TASK_REVIEW_TYPE_LABEL,
    "TASK_STATUSES",
    ()=>TASK_STATUSES,
    "TASK_STATUS_LABEL",
    ()=>TASK_STATUS_LABEL,
    "WORKBENCH_BOARD_COLUMNS",
    ()=>WORKBENCH_BOARD_COLUMNS,
    "WORKBENCH_PROJECT_TYPES",
    ()=>WORKBENCH_PROJECT_TYPES,
    "isProjectRecordStatus",
    ()=>isProjectRecordStatus,
    "projectTypeLabel",
    ()=>projectTypeLabel,
    "taskBoardColumn",
    ()=>taskBoardColumn,
    "taskWorkflowGroup",
    ()=>taskWorkflowGroup
]);
const WORKBENCH_PROJECT_TYPES = [
    {
        id: "phd_literature_review",
        label: "PhD Literature Review"
    },
    {
        id: "masters_research_archive",
        label: "Master’s Research Archive"
    },
    {
        id: "decolonial_design_reading_list",
        label: "Decolonial Design Reading List"
    },
    {
        id: "community_memory_project",
        label: "Community Memory Project"
    },
    {
        id: "exhibition_research_folder",
        label: "Exhibition Research Folder"
    },
    {
        id: "african_philosophy_bibliography",
        label: "African Philosophy Bibliography"
    },
    {
        id: "visual_culture_case_study",
        label: "Visual Culture Case Study"
    },
    {
        id: "indigenous_knowledge_mapping",
        label: "Indigenous Knowledge Mapping Project"
    },
    {
        id: "teaching_resource",
        label: "Teaching Resource"
    },
    {
        id: "custom_project",
        label: "Custom Project"
    }
];
const PROJECT_RECORD_STATUSES = [
    "to_review",
    "reading",
    "to_annotate",
    "metadata_check",
    "rights_check",
    "cultural_review",
    "writing_annotation",
    "ready_to_publish",
    "completed",
    "exclude"
];
const PROJECT_RECORD_STATUS_LABEL = {
    to_review: "To Review",
    reading: "Reading",
    to_annotate: "To Annotate",
    metadata_check: "Metadata Check",
    rights_check: "Rights Check",
    cultural_review: "Cultural Review",
    writing_annotation: "Writing / Annotation",
    ready_to_publish: "Ready to Publish",
    completed: "Completed",
    exclude: "Exclude"
};
const WORKBENCH_BOARD_COLUMNS = [
    "to_review",
    "reading",
    "metadata_check",
    "rights_check",
    "cultural_review",
    "writing_annotation",
    "ready_to_publish",
    "completed"
];
const TASK_STATUSES = [
    "todo",
    "in_progress",
    "waiting",
    "done",
    "stuck",
    "needs_review"
];
const TASK_STATUS_LABEL = {
    todo: "To Do",
    in_progress: "In Progress",
    waiting: "Waiting",
    done: "Done",
    stuck: "Stuck",
    needs_review: "Needs Review"
};
const TASK_PRIORITIES = [
    "low",
    "medium",
    "high",
    "urgent"
];
const TASK_PRIORITY_LABEL = {
    low: "Low",
    medium: "Medium",
    high: "High",
    urgent: "Urgent"
};
const TASK_REVIEW_TYPES = [
    "general",
    "source_check",
    "citation_check",
    "metadata_check",
    "rights_check",
    "cultural_review",
    "writing",
    "supervisor_feedback",
    "publication_prep"
];
const TASK_REVIEW_TYPE_LABEL = {
    general: "General",
    source_check: "Source Check",
    citation_check: "Citation Check",
    metadata_check: "Metadata Check",
    rights_check: "Rights Check",
    cultural_review: "Cultural Review",
    writing: "Writing",
    supervisor_feedback: "Supervisor Feedback",
    publication_prep: "Publication Prep"
};
const ANNOTATION_TAGS = [
    "Theory",
    "Method",
    "Case Study",
    "Citation",
    "Useful Quote",
    "Needs Verification",
    "Rights Concern",
    "Cultural Note",
    "Teaching Use",
    "Exclude"
];
const COLLABORATOR_ROLES = [
    "owner",
    "editor",
    "reviewer",
    "viewer"
];
const PROJECT_VISIBILITY = [
    "private",
    "shared",
    "public"
];
const PROJECT_STATUS = [
    "active",
    "paused",
    "completed",
    "archived"
];
const DEFAULT_RESEARCH_MILESTONES = [
    "Literature Review",
    "Annotated Bibliography",
    "Ethics Notes",
    "Case Study Selection",
    "Data / Source Verification",
    "Writing Draft",
    "Supervisor Feedback",
    "Submission Deadline"
];
function projectTypeLabel(id) {
    return WORKBENCH_PROJECT_TYPES.find((t)=>t.id === id)?.label ?? id;
}
function taskBoardColumn(reviewType, taskStatus) {
    if (taskStatus === "done") return "completed";
    switch(reviewType){
        case "metadata_check":
        case "citation_check":
        case "source_check":
            return "metadata_check";
        case "rights_check":
            return "rights_check";
        case "cultural_review":
            return "cultural_review";
        case "writing":
        case "supervisor_feedback":
            return "writing_annotation";
        case "publication_prep":
            return "ready_to_publish";
        default:
            return "to_review";
    }
}
function taskWorkflowGroup(task) {
    const s = task.workflow_stage;
    if (s && WORKBENCH_BOARD_COLUMNS.includes(s)) {
        return s;
    }
    return taskBoardColumn(task.review_type, task.status);
}
function isProjectRecordStatus(value) {
    return PROJECT_RECORD_STATUSES.includes(value);
}
}),
"[project]/lib/workbench-inline-actions.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"4007a8be0557f58213f646f86a57650e4800d4c5b9":{"name":"renameWorkbenchProjectInline"},"4014621881f5729b2bf4c2fc71deac7dd31cf6ced2":{"name":"deleteWorkbenchProjectInline"},"402658ae4a896ef71a13a7d76856b57c8e8f2973b4":{"name":"moveWorkbenchTaskStage"},"4028dc515a6903ab1f7dac843f2655ed9e091203ba":{"name":"createWorkbenchProjectInline"},"403e4ef07ce76eba7536cccf25318febcd337a6d81":{"name":"deleteWorkbenchTaskInline"},"4061af14e7c6d211fa0517dfc7b2abbe00128d307a":{"name":"createWorkbenchTaskInline"},"409431cd9ece738c42ad9c21d6f4bda23519f0e2cb":{"name":"updateWorkbenchProjectInline"},"40a9d65323c41b3056c5006dd4f7e15fcb7c3d9880":{"name":"patchWorkbenchTask"},"40d796a5b1d6dd627f7e17fbe2c7d6d04f4119cc2d":{"name":"saveWorkbenchProjectNotes"}},"lib/workbench-inline-actions.ts",""] */ __turbopack_context__.s([
    "createWorkbenchProjectInline",
    ()=>createWorkbenchProjectInline,
    "createWorkbenchTaskInline",
    ()=>createWorkbenchTaskInline,
    "deleteWorkbenchProjectInline",
    ()=>deleteWorkbenchProjectInline,
    "deleteWorkbenchTaskInline",
    ()=>deleteWorkbenchTaskInline,
    "moveWorkbenchTaskStage",
    ()=>moveWorkbenchTaskStage,
    "patchWorkbenchTask",
    ()=>patchWorkbenchTask,
    "renameWorkbenchProjectInline",
    ()=>renameWorkbenchProjectInline,
    "saveWorkbenchProjectNotes",
    ()=>saveWorkbenchProjectNotes,
    "updateWorkbenchProjectInline",
    ()=>updateWorkbenchProjectInline
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/cache.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/auth.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase/server.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$workbench$2d$types$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/workbench-types.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
;
;
;
;
const WB = "/my/workbench";
function isBoardStage(v) {
    return Boolean(v && __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$workbench$2d$types$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["WORKBENCH_BOARD_COLUMNS"].includes(v));
}
function isTaskStatus(v) {
    return __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$workbench$2d$types$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TASK_STATUSES"].includes(v);
}
function isTaskPriority(v) {
    return __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$workbench$2d$types$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TASK_PRIORITIES"].includes(v);
}
function isReviewType(v) {
    return __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$workbench$2d$types$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TASK_REVIEW_TYPES"].includes(v);
}
function isProjectType(v) {
    return __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$workbench$2d$types$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["WORKBENCH_PROJECT_TYPES"].some((type)=>type.id === v);
}
function isProjectVisibility(v) {
    return __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$workbench$2d$types$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PROJECT_VISIBILITY"].includes(v);
}
function isProjectStatus(v) {
    return __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$workbench$2d$types$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PROJECT_STATUS"].includes(v);
}
function projectPermissionMessage(error) {
    const message = String(error || "");
    if (/row-level security|permission denied|not permitted|not found/i.test(message)) {
        return "You do not have permission to change this project. Check that you are signed in with the project owner account.";
    }
    return message || "Project action failed.";
}
async function patchWorkbenchTask(input) {
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["requireMember"])(WB);
    const { projectId, taskId, patch } = input;
    if (!projectId || !taskId) return {
        ok: false,
        error: "Missing project or task."
    };
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const row = {};
    if (patch.title !== undefined) {
        const t = String(patch.title ?? "").trim();
        if (!t) return {
            ok: false,
            error: "Title cannot be empty."
        };
        row.title = t;
    }
    if (patch.description !== undefined) row.description = patch.description;
    if (patch.notes !== undefined) row.notes = patch.notes;
    if (patch.owner_name !== undefined) row.owner_name = patch.owner_name;
    if (patch.due_date !== undefined) row.due_date = patch.due_date;
    if (patch.status !== undefined) {
        if (!isTaskStatus(patch.status)) return {
            ok: false,
            error: "Invalid status."
        };
        row.status = patch.status;
        if (patch.status === "done") {
            row.completed_at = new Date().toISOString();
            if (patch.workflow_stage === undefined) {
                row.workflow_stage = "completed";
            }
        } else {
            row.completed_at = null;
        }
    }
    if (patch.priority !== undefined) {
        if (!isTaskPriority(patch.priority)) return {
            ok: false,
            error: "Invalid priority."
        };
        row.priority = patch.priority;
    }
    if (patch.review_type !== undefined) {
        if (!isReviewType(patch.review_type)) return {
            ok: false,
            error: "Invalid review type."
        };
        row.review_type = patch.review_type;
    }
    if (patch.linked_record_ids !== undefined) {
        row.linked_record_ids = patch.linked_record_ids;
    }
    if (patch.workflow_stage !== undefined) {
        const ws = patch.workflow_stage;
        if (ws !== null && !isBoardStage(ws)) {
            return {
                ok: false,
                error: "Invalid workflow stage."
            };
        }
        row.workflow_stage = ws;
    }
    if (row.workflow_stage === "completed") {
        row.status = "done";
        row.completed_at = new Date().toISOString();
    } else if (row.status === "done" && row.workflow_stage !== undefined && row.workflow_stage !== "completed") {
        row.status = "in_progress";
        row.completed_at = null;
    } else if (row.workflow_stage !== undefined && row.workflow_stage !== null && row.workflow_stage !== "completed" && patch.status === undefined) {
        row.completed_at = null;
        if (row.status === undefined || row.status === "done") {
            row.status = "in_progress";
        }
    }
    const { data, error } = await supabase.from("workbench_tasks").update(row).eq("id", taskId).eq("project_id", projectId).select("*").maybeSingle();
    if (error) return {
        ok: false,
        error: error.message
    };
    if (!data) return {
        ok: false,
        error: "Task not found or not permitted."
    };
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])(`${WB}/projects/${projectId}`);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])(`${WB}/tasks`);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])(WB);
    return {
        ok: true,
        task: data
    };
}
async function moveWorkbenchTaskStage(input) {
    const { projectId, taskId, workflow_stage } = input;
    if (!isBoardStage(workflow_stage)) return {
        ok: false,
        error: "Invalid column."
    };
    const patch = {
        workflow_stage
    };
    if (workflow_stage === "completed") {
        patch.status = "done";
    } else {
        patch.status = "in_progress";
    }
    return patchWorkbenchTask({
        projectId,
        taskId,
        patch
    });
}
async function createWorkbenchTaskInline(input) {
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["requireMember"])(WB);
    const title = String(input.title ?? "").trim();
    if (!input.projectId || !title) return {
        ok: false,
        error: "Title and project are required."
    };
    const status = input.status && isTaskStatus(input.status) ? input.status : "todo";
    const priority = input.priority && isTaskPriority(input.priority) ? input.priority : "medium";
    const review_type = input.review_type && isReviewType(input.review_type) ? input.review_type : "general";
    let workflow_stage = null;
    if (input.workflow_stage !== undefined && input.workflow_stage !== null) {
        if (!isBoardStage(input.workflow_stage)) return {
            ok: false,
            error: "Invalid workflow stage."
        };
        workflow_stage = input.workflow_stage;
    } else {
        workflow_stage = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$workbench$2d$types$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["taskBoardColumn"])(review_type, status);
    }
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data, error } = await supabase.from("workbench_tasks").insert({
        project_id: input.projectId,
        title,
        description: input.description ?? null,
        due_date: input.due_date ?? null,
        status,
        priority,
        review_type,
        linked_record_ids: input.linked_record_ids ?? [],
        notes: input.notes ?? null,
        owner_name: input.owner_name ?? null,
        workflow_stage
    }).select("*").single();
    if (error) return {
        ok: false,
        error: error.message
    };
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])(`${WB}/projects/${input.projectId}`);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])(`${WB}/tasks`);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])(WB);
    return {
        ok: true,
        task: data
    };
}
async function createWorkbenchProjectInline(input) {
    const profile = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["requireMember"])(WB);
    const title = String(input.title ?? "").trim();
    if (!title) return {
        ok: false,
        error: "Project title is required."
    };
    const visibility = input.visibility && [
        "private",
        "shared",
        "public"
    ].includes(input.visibility) ? input.visibility : "private";
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data, error } = await supabase.from("workbench_projects").insert({
        owner_id: profile.id,
        title,
        description: input.description?.trim() || null,
        project_type: input.project_type || "custom_project",
        visibility,
        status: "active"
    }).select("*").single();
    if (error) return {
        ok: false,
        error: error.message
    };
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])(WB);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])(`${WB}/projects`);
    return {
        ok: true,
        project: data
    };
}
async function renameWorkbenchProjectInline(input) {
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["requireMember"])(WB);
    const title = String(input.title ?? "").trim();
    if (!input.projectId || !title) return {
        ok: false,
        error: "Project title is required."
    };
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data, error } = await supabase.from("workbench_projects").update({
        title
    }).eq("id", input.projectId).select("*").maybeSingle();
    if (error) return {
        ok: false,
        error: projectPermissionMessage(error.message)
    };
    if (!data) return {
        ok: false,
        error: projectPermissionMessage("not permitted")
    };
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])(WB);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])(`${WB}/projects`);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])(`${WB}/projects/${input.projectId}`);
    return {
        ok: true,
        project: data
    };
}
async function updateWorkbenchProjectInline(input) {
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["requireMember"])(WB);
    const title = String(input.patch.title ?? "").trim();
    if (!input.projectId || !title) return {
        ok: false,
        error: "Project title is required."
    };
    if (!isProjectType(input.patch.project_type)) return {
        ok: false,
        error: "Invalid project type."
    };
    if (!isProjectVisibility(input.patch.visibility)) return {
        ok: false,
        error: "Invalid visibility."
    };
    if (!isProjectStatus(input.patch.status)) return {
        ok: false,
        error: "Invalid project status."
    };
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data, error } = await supabase.from("workbench_projects").update({
        title,
        description: input.patch.description?.trim() || null,
        project_type: input.patch.project_type,
        visibility: input.patch.visibility,
        status: input.patch.status,
        deadline: input.patch.deadline || null
    }).eq("id", input.projectId).select("*").maybeSingle();
    if (error) return {
        ok: false,
        error: projectPermissionMessage(error.message)
    };
    if (!data) return {
        ok: false,
        error: projectPermissionMessage("not permitted")
    };
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])(WB);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])(`${WB}/projects`);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])(`${WB}/projects/${input.projectId}`);
    return {
        ok: true,
        project: data
    };
}
async function deleteWorkbenchProjectInline(input) {
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["requireMember"])(WB);
    if (!input.projectId) return {
        ok: false,
        error: "Missing project."
    };
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { error } = await supabase.from("workbench_projects").delete().eq("id", input.projectId);
    if (error) return {
        ok: false,
        error: projectPermissionMessage(error.message)
    };
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])(WB);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])(`${WB}/projects`);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])(`${WB}/tasks`);
    return {
        ok: true
    };
}
async function deleteWorkbenchTaskInline(input) {
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["requireMember"])(WB);
    const { projectId, taskId } = input;
    if (!projectId || !taskId) return {
        ok: false,
        error: "Missing task."
    };
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { error } = await supabase.from("workbench_tasks").delete().eq("id", taskId).eq("project_id", projectId);
    if (error) return {
        ok: false,
        error: error.message
    };
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])(`${WB}/projects/${projectId}`);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])(`${WB}/tasks`);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])(WB);
    return {
        ok: true
    };
}
async function saveWorkbenchProjectNotes(input) {
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["requireMember"])(WB);
    const { projectId, notes } = input;
    if (!projectId) return {
        ok: false,
        error: "Missing project."
    };
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { error } = await supabase.from("workbench_projects").update({
        notes
    }).eq("id", projectId);
    if (error) return {
        ok: false,
        error: error.message
    };
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])(`${WB}/projects/${projectId}`);
    return {
        ok: true
    };
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    patchWorkbenchTask,
    moveWorkbenchTaskStage,
    createWorkbenchTaskInline,
    createWorkbenchProjectInline,
    renameWorkbenchProjectInline,
    updateWorkbenchProjectInline,
    deleteWorkbenchProjectInline,
    deleteWorkbenchTaskInline,
    saveWorkbenchProjectNotes
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(patchWorkbenchTask, "40a9d65323c41b3056c5006dd4f7e15fcb7c3d9880", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(moveWorkbenchTaskStage, "402658ae4a896ef71a13a7d76856b57c8e8f2973b4", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(createWorkbenchTaskInline, "4061af14e7c6d211fa0517dfc7b2abbe00128d307a", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(createWorkbenchProjectInline, "4028dc515a6903ab1f7dac843f2655ed9e091203ba", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(renameWorkbenchProjectInline, "4007a8be0557f58213f646f86a57650e4800d4c5b9", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(updateWorkbenchProjectInline, "409431cd9ece738c42ad9c21d6f4bda23519f0e2cb", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(deleteWorkbenchProjectInline, "4014621881f5729b2bf4c2fc71deac7dd31cf6ced2", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(deleteWorkbenchTaskInline, "403e4ef07ce76eba7536cccf25318febcd337a6d81", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(saveWorkbenchProjectNotes, "40d796a5b1d6dd627f7e17fbe2c7d6d04f4119cc2d", null);
}),
"[project]/.next-internal/server/app/(app)/my/workbench/page/actions.js { ACTIONS_MODULE0 => \"[project]/lib/workbench-inline-actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$workbench$2d$inline$2d$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/workbench-inline-actions.ts [app-rsc] (ecmascript)");
;
;
;
;
;
;
;
}),
"[project]/.next-internal/server/app/(app)/my/workbench/page/actions.js { ACTIONS_MODULE0 => \"[project]/lib/workbench-inline-actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "4007a8be0557f58213f646f86a57650e4800d4c5b9",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$workbench$2d$inline$2d$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["renameWorkbenchProjectInline"],
    "4014621881f5729b2bf4c2fc71deac7dd31cf6ced2",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$workbench$2d$inline$2d$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["deleteWorkbenchProjectInline"],
    "4028dc515a6903ab1f7dac843f2655ed9e091203ba",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$workbench$2d$inline$2d$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createWorkbenchProjectInline"],
    "403e4ef07ce76eba7536cccf25318febcd337a6d81",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$workbench$2d$inline$2d$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["deleteWorkbenchTaskInline"],
    "4061af14e7c6d211fa0517dfc7b2abbe00128d307a",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$workbench$2d$inline$2d$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createWorkbenchTaskInline"],
    "409431cd9ece738c42ad9c21d6f4bda23519f0e2cb",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$workbench$2d$inline$2d$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["updateWorkbenchProjectInline"],
    "40a9d65323c41b3056c5006dd4f7e15fcb7c3d9880",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$workbench$2d$inline$2d$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["patchWorkbenchTask"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f28$app$292f$my$2f$workbench$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$lib$2f$workbench$2d$inline$2d$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i('[project]/.next-internal/server/app/(app)/my/workbench/page/actions.js { ACTIONS_MODULE0 => "[project]/lib/workbench-inline-actions.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <locals>');
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$workbench$2d$inline$2d$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/workbench-inline-actions.ts [app-rsc] (ecmascript)");
}),
];

//# sourceMappingURL=_0h-p8ph._.js.map