# PRD — FlowBoard Frontend Prototype V1

**Status:** Prototype Frontend  
**Primary Goal:** Validate the core user experience before backend integration  
**Primary Build Tool:** Google AI Studio  
**Frontend Stack:** Next.js + React + TypeScript + Tailwind CSS + shadcn/ui  
**Whiteboard:** `@excalidraw/excalidraw`  
**Calendar:** shadcn/ui Calendar + React Day Picker  
**Temporary Persistence:** localStorage  
**Backend / Database / Realtime:** Out of scope for this prototype phase

---

## 1. Product Summary

FlowBoard is a visual planning workspace that connects brainstorming with deadlines.

The product has two main modes:

1. **Canvas** — for thinking, brainstorming, mapping ideas, drawing flows, and visual planning.
2. **Calendar** — for turning plans into tasks with deadlines and managing when those tasks need to be completed.

The core product idea is:

> **Think visually. Plan your time.**

Users can start from either direction:

- Canvas first → brainstorm → convert idea into task → task appears in Calendar.
- Calendar first → create task → optionally link it to a Canvas → open Canvas when deeper thinking is needed.

The product is designed to remain general-purpose. It can be used by students, teachers, developers, researchers, freelancers, workers, or anyone who benefits from visual planning and deadline management.

---

## 2. Problem Statement

Visual thinking tools and deadline/task management tools are usually separated.

Example:

- A user brainstorms ideas in Excalidraw.
- A user manages deadlines in another calendar/task application.
- Context is split between two tools.
- The user has to manually move information from visual planning into an actionable schedule.

FlowBoard aims to reduce this gap by connecting the visual planning process directly with deadline-based task management.

---

## 3. Prototype Objective

This frontend prototype is NOT intended to validate backend architecture, authentication, payments, or realtime infrastructure.

The prototype must answer one main question:

> **Does connecting Canvas and Calendar create a useful and intuitive workflow?**

The prototype is successful if a user can understand and complete the main Canvas ↔ Calendar workflow without explanation.

---

## 4. Prototype Scope

### Included

- Next.js frontend application.
- Responsive desktop-first interface.
- Canvas mode.
- Calendar mode.
- Maximum 3 canvases per user.
- Create, rename, switch, and delete canvases.
- Excalidraw whiteboard integration.
- Local autosave using localStorage.
- Convert Canvas into Task.
- Create Task directly from Calendar.
- Deadline-based task management.
- Optional task time.
- Task status.
- Link task to a Canvas.
- Open linked Canvas from Calendar.
- Share modal UI.
- View/Edit permission states simulated in frontend.
- localStorage persistence.
- Empty states.
- Error/limit states.

### Not Included

- Express API.
- PostgreSQL.
- Firebase Authentication.
- Firebase realtime collaboration.
- Real multi-user collaboration.
- Midtrans.
- Subscription plans.
- AI features.
- Google Calendar sync.
- Email reminders.
- Push notifications.
- Recurring tasks.
- Subtasks.
- Priorities.
- Tags.
- Kanban.
- Analytics.
- Comments/chat.
- File attachments.
- Version history.

These features belong to later phases.

---

# 5. Core Product Navigation

The product should feel like one tool with two modes, not two separate applications.

Primary navigation:

```text
[ Calendar | Canvas ]
```

This navigation should remain compact and visually consistent with the existing design.

The user can switch between Canvas and Calendar at any time.

Suggested routes:

```text
/app/canvas
/app/canvas/[canvasId]
/app/calendar
```

For the frontend prototype, no authentication route is required yet.

---

# 6. Design Direction

The existing Figma design is the visual reference.

## Global characteristics

- Dark interface.
- Minimal chrome.
- Large workspace area.
- Floating UI controls.
- Avoid traditional dashboard layouts.
- Avoid large permanent sidebars.
- Keep the workspace visually clean.
- Calendar and Canvas should share the same visual language.
- Orange can be used as an action/accent color.
- Blue can remain for Share / secondary action where appropriate.
- Use subtle neutral surfaces for panels and controls.
- Prefer rounded corners but avoid overly soft/mobile-app styling.
- Desktop-first design.

## Main principle

The content/workspace should dominate the screen.

Controls should feel secondary.

---

# 7. Canvas Screen

## 7.1 Layout

Canvas should use nearly the full viewport.

Expected structure:

```text
┌──────────────────────────────────────────────────────────┐
│ ☰                           Convert to Task     Share    │
│                                                          │
│                                                          │
│                    EXCALIDRAW CANVAS                      │
│                                                          │
│                                                          │
│                                                          │
│                 [ Calendar | Canvas ]                    │
│                [ Excalidraw toolbar ]                    │
│                                                          │
│ + 100% -                                                  │
└──────────────────────────────────────────────────────────┘
```

The exact Excalidraw toolbar implementation can use the package's native UI where appropriate.

---

## 7.2 Excalidraw Capabilities

Use `@excalidraw/excalidraw`.

The user should be able to use standard Excalidraw capabilities including:

- Select.
- Hand / pan.
- Rectangle.
- Diamond.
- Ellipse.
- Arrow.
- Line.
- Free draw.
- Text.
- Eraser.
- Move.
- Resize.
- Multi-select.
- Undo.
- Redo.
- Zoom.

Do not recreate the drawing engine manually.

---

# 8. Canvas Management

Each user can have a maximum of **3 canvases**.

For this prototype, canvas ownership is simulated locally.

## 8.1 Canvas Menu

The hamburger button opens a compact canvas menu.

Example:

```text
CANVASES

● API Brainstorming
○ Research Notes
○ Presentation Plan

--------------------

+ New Canvas

Settings
```

Settings does not need to be functional in the prototype.

---

## 8.2 Canvas Actions

The user can:

- Create a canvas.
- Rename a canvas.
- Switch between canvases.
- Delete a canvas.

Maximum:

```text
3 canvases
```

If the user already has 3 canvases:

- Disable `New Canvas`.
- Show feedback:

> You've reached the maximum of 3 canvases.

---

## 8.3 Canvas Data

Recommended frontend type:

```ts
type CanvasWorkspace = {
  id: string;
  title: string;
  sceneData: {
    elements: unknown[];
    appState?: Record<string, unknown>;
    files?: Record<string, unknown>;
  };
  createdAt: string;
  updatedAt: string;
};
```

Exact Excalidraw types may replace `unknown` during implementation.

---

# 9. Canvas Autosave

Canvas should autosave to localStorage.

The user should not need to press a Save button.

Suggested behavior:

```text
Canvas changes
      ↓
debounce ~500–1000 ms
      ↓
save local state
      ↓
"Saved"
```

Optional small status:

```text
Saving...
Saved
```

Reloading the page must restore the Canvas.

---

# 10. Convert to Task

This is one of the most important prototype features.

The user does NOT need to select a specific Excalidraw element.

The user simply clicks:

```text
Convert to Task
```

A modal/popup appears.

---

## 10.1 Convert to Task Form

Fields:

```text
Title          required
Deadline       required
Time           optional
Description    optional
```

Example:

```text
Convert to Task

Title
[ Build authentication flow ]

Deadline
[ 30 August 2026 ]

Time
[ 10:00 ] optional

Description
[ Implement the login flow... ]

[ Cancel ] [ Add Task ]
```

When the task is created:

- The task is automatically linked to the currently open Canvas.
- The task is stored locally.
- The task must appear on the correct Calendar date.

No automatic redirect is required after task creation.

Show a success state/toast such as:

> Task added to Calendar.

---

# 11. Calendar Screen

The Calendar is **deadline-oriented**, not meeting-oriented.

Do NOT implement a Google Calendar-style hour grid.

Use:

- shadcn/ui Calendar.
- React Day Picker.

Primary time model:

```text
deadline date
optional time
```

Do NOT use:

```text
start time
end time
```

---

# 12. Calendar Layout

Follow the current Figma direction:

```text
┌──────────────────────────┬────────────────────────┐
│                          │                        │
│       August 2026        │      August 25         │
│                          │                        │
│ Sun Mon Tue Wed Thu...   │      Task list         │
│                          │                        │
│        24 25 26          │      Task A            │
│                          │      Task B            │
│                          │                        │
│                          │      + New Task        │
└──────────────────────────┴────────────────────────┘

               [ Calendar | Canvas ]
```

The left side is the month Calendar.

The right side is a context panel for the selected date.

---

# 13. Date Selection

When a user selects a date:

The right panel should display:

```text
August — 25

Tasks

Task A
Task B

+ New Task
```

If no task exists:

```text
August — 25

No tasks scheduled.

+ New Task
```

Dates that contain tasks should have a clear but minimal visual indicator.

---

# 14. Create Task from Calendar

Clicking `New Task` opens the input state.

Fields:

```text
Title          required
Deadline       required
Time           optional
Description    optional
Canvas         optional
Status         default To Do
```

Example:

```text
NEW TASK

Title
[ Bikin konsep API ]

Deadline
[ August 25, 2026 ]

Time
[ optional ]

Description
[ ... ]

Canvas
[ None ▼ ]

Status
[ To Do ]

[ Add Task ]
```

Canvas options:

```text
None
Canvas 1
Canvas 2
Canvas 3
```

A task does NOT need to be linked to a Canvas.

---

# 15. Task Status

Only three statuses are required:

```text
To Do
In Progress
Done
```

Recommended internal values:

```ts
type TaskStatus = "todo" | "in_progress" | "done";
```

The UI should make status recognizable without adding excessive color.

---

# 16. Task Data Model

Recommended frontend type:

```ts
type Task = {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  dueTime?: string;
  status: "todo" | "in_progress" | "done";
  canvasId?: string | null;
  createdAt: string;
  updatedAt: string;
};
```

---

# 17. Task Detail State

Clicking a task should show its details in the right panel or a compact dialog.

Example:

```text
Build Authentication

Deadline
Aug 30, 2026

Time
10:00

Status
In Progress

Canvas
API Brainstorming

[ Open Canvas ]

[ Edit ]
[ Delete ]
```

If there is no linked Canvas:

```text
Canvas
Not linked
```

Provide:

```text
[ Link Canvas ]
```

or allow linking when editing.

Do not automatically create a Canvas.

---

# 18. Calendar → Canvas

If a task has a linked Canvas:

```text
Open Canvas
```

should:

1. Switch to Canvas mode.
2. Open the linked Canvas.
3. Preserve the task data.

No automatic Excalidraw node creation is required in this prototype.

---

# 19. Canvas → Calendar Relationship

When a task is created from `Convert to Task`:

```text
task.canvasId = currentCanvas.id
```

When a task is created directly from Calendar:

```text
canvasId = selectedCanvasId OR null
```

This is the key relationship between the two product modes.

---

# 20. Share Feature — Prototype

The Share UI is included in this frontend prototype.

Real collaboration is NOT included yet.

Clicking `Share` opens:

```text
Share Canvas

General Access

○ Private
○ Anyone with link

Permission
[ Can View ▼ ]

Can View
Can Edit

[ Copy Link ]
```

---

## 20.1 Share Modes

Supported UI states:

```text
Private
View
Edit
```

Recommended type:

```ts
type SharePermission = "private" | "view" | "edit";
```

For the prototype, share settings can be stored in localStorage.

Generated share links can be simulated.

Example:

```text
/app/shared/demo-canvas-id?permission=view
```

---

# 21. View Mode

When opening a simulated shared Canvas with View permission:

Allowed:

- View.
- Zoom.
- Pan.

Disabled:

- Drawing.
- Editing.
- Deleting.
- Convert to Task.

Clearly show a subtle:

```text
View only
```

indicator.

---

# 22. Edit Mode

For the frontend prototype:

Edit mode only needs to simulate the editor permission state.

Allowed:

- Draw.
- Move.
- Edit text.
- Delete.
- Use standard Canvas tools.

Convert to Task should still be hidden/disabled for simulated collaborators.

Real synchronization between users is NOT required yet.

Realtime collaboration will be implemented later using Firebase.

---

# 23. Frontend State

Recommended approach:

Use simple React state/context for the prototype.

Possible state domains:

```text
Canvas state
Task state
Selected date
Current canvas
Share permission
```

Avoid introducing complex state management libraries unless genuinely needed.

Persist important data to localStorage:

```text
flowboard_canvases
flowboard_tasks
flowboard_current_canvas
flowboard_share_settings
flowboard_last_mode
```

---

# 24. Suggested Frontend Structure

```text
src/
│
├── app/
│   ├── app/
│   │   ├── canvas/
│   │   │   └── [canvasId]/
│   │   │       └── page.tsx
│   │   │
│   │   └── calendar/
│   │       └── page.tsx
│   │
│   └── layout.tsx
│
├── components/
│   └── ui/
│
├── features/
│   │
│   ├── canvas/
│   │   ├── components/
│   │   │   ├── CanvasWorkspace.tsx
│   │   │   ├── CanvasMenu.tsx
│   │   │   ├── ConvertTaskDialog.tsx
│   │   │   └── ShareCanvasDialog.tsx
│   │   ├── hooks/
│   │   ├── types.ts
│   │   └── storage.ts
│   │
│   ├── calendar/
│   │   ├── components/
│   │   │   ├── CalendarWorkspace.tsx
│   │   │   ├── DayTaskPanel.tsx
│   │   │   ├── TaskForm.tsx
│   │   │   └── TaskDetail.tsx
│   │   ├── types.ts
│   │   └── storage.ts
│   │
│   └── navigation/
│       └── WorkspaceSwitcher.tsx
│
├── hooks/
├── lib/
├── types/
└── utils/
```

The exact folder layout can be adjusted, but keep Canvas and Calendar feature logic separated.

---

# 25. Prototype User Flows

## Flow A — Canvas First

```text
Open app
   ↓
Canvas
   ↓
Brainstorm using Excalidraw
   ↓
Click Convert to Task
   ↓
Fill title + deadline
   ↓
Add Task
   ↓
Task saved
   ↓
Open Calendar
   ↓
Task appears on deadline date
```

---

## Flow B — Calendar First

```text
Open app
   ↓
Calendar
   ↓
Select date
   ↓
New Task
   ↓
Fill task information
   ↓
Optionally link Canvas
   ↓
Add Task
   ↓
Task appears
   ↓
Open Task
   ↓
Open Canvas
```

---

## Flow C — Multiple Canvas

```text
Canvas
   ↓
Open Canvas menu
   ↓
New Canvas
   ↓
Create Canvas 2
   ↓
Create Canvas 3
   ↓
Attempt Canvas 4
   ↓
Show max limit message
```

---

## Flow D — Share Prototype

```text
Canvas
   ↓
Share
   ↓
Choose View or Edit
   ↓
Copy simulated link
   ↓
Open shared state
   ↓
View permission → read only
Edit permission → editable canvas
```

---

# 26. Empty States

## No Canvas

If no Canvas exists:

```text
Start your first canvas

Turn ideas into something visual.

[ Create Canvas ]
```

---

## Empty Calendar Date

```text
No tasks scheduled.

[ + New Task ]
```

---

## No Tasks in Month

Do not show a large dashboard empty state.

Keep the Calendar usable and quiet.

---

# 27. Error / Feedback States

Required:

### Maximum Canvas

```text
You've reached the maximum of 3 canvases.
```

### Missing Task Title

```text
Task title is required.
```

### Missing Deadline

```text
Please select a deadline.
```

### Delete Canvas

Confirmation:

```text
Delete this canvas?

Tasks linked to this canvas will remain,
but their canvas link will be removed.

[ Cancel ] [ Delete ]
```

### Delete Task

Use a simple confirmation.

---

# 28. Responsive Scope

Desktop is the priority.

Minimum target:

```text
1280px+
```

Basic responsive behavior for smaller laptop screens is required.

Mobile optimization is NOT part of this frontend prototype.

Do not spend prototype time recreating full mobile Excalidraw behavior.

---

# 29. Accessibility Basics

Prototype should still include:

- Buttons with accessible labels.
- Keyboard-focus states.
- Semantic dialog structure.
- Good contrast.
- Form labels.
- Disabled-state visibility.

---

# 30. Prototype Acceptance Criteria

The frontend prototype is considered complete when all of the following work locally:

### Canvas

- [ ] User can create a Canvas.
- [ ] User can create maximum 3 Canvases.
- [ ] Canvas 4 is blocked.
- [ ] User can rename a Canvas.
- [ ] User can switch Canvas.
- [ ] User can delete Canvas.
- [ ] Excalidraw drawing works.
- [ ] Refresh restores Canvas data.
- [ ] Canvas autosaves locally.

### Convert to Task

- [ ] Convert to Task opens form.
- [ ] Title is required.
- [ ] Deadline is required.
- [ ] Time is optional.
- [ ] Description is optional.
- [ ] Created task is linked to current Canvas.
- [ ] Task appears in Calendar.

### Calendar

- [ ] Month Calendar renders correctly.
- [ ] User can change month.
- [ ] User can select date.
- [ ] Selected date shows task list.
- [ ] User can create task.
- [ ] User can edit task.
- [ ] User can delete task.
- [ ] User can change task status.
- [ ] Task time is optional.
- [ ] Task can exist without Canvas.
- [ ] Task can link to a Canvas.
- [ ] Open Canvas opens correct Canvas.

### Share Prototype

- [ ] Share dialog opens.
- [ ] User can choose Private.
- [ ] User can choose View.
- [ ] User can choose Edit.
- [ ] Simulated share link is generated.
- [ ] View state is read-only.
- [ ] Edit state enables Canvas editing.
- [ ] Convert to Task is disabled for collaborator state.

### Persistence

- [ ] Refresh does not remove Canvas.
- [ ] Refresh does not remove Tasks.
- [ ] Current Canvas can be restored.
- [ ] Last mode can be restored.

---

# 31. Prototype Definition of Done

A tester must be able to complete this journey:

```text
Open FlowBoard
→ Create Canvas
→ Draw a brainstorming flow
→ Convert it into a Task
→ Set a deadline
→ Open Calendar
→ See the Task on that date
→ Create another Task directly from Calendar
→ Link the new Task to another Canvas
→ Open that Canvas from Task Detail
→ Create two more Canvases
→ Be blocked from creating Canvas #4
→ Change a Task to Done
→ Open Share
→ Switch between View and Edit permissions
→ Refresh
→ All local data remains
```

If this journey works reliably, the frontend prototype is complete.

---

# 32. Explicit Instructions for Google AI Studio

When generating the application:

1. Build only the frontend prototype described in this PRD.
2. Do not add backend APIs.
3. Do not add Firebase yet.
4. Do not add PostgreSQL.
5. Do not add Express.
6. Do not invent additional dashboard pages.
7. Do not add AI features.
8. Do not add Kanban, Pomodoro, analytics, notifications, or other productivity features.
9. Use localStorage for persistence.
10. Keep the Canvas and Calendar as the only primary working modes.
11. Use Excalidraw instead of building a drawing system from scratch.
12. Use shadcn/ui Calendar + React Day Picker for the Calendar.
13. Follow the supplied Figma visual direction.
14. Keep components modular so the localStorage layer can later be replaced with the Express API.
15. Prefer clear and maintainable code over clever abstractions.
16. Use TypeScript.
17. Do not implement real collaboration in this phase.
18. Simulate View/Edit share permissions only.

---

# 33. Future Architecture — Context Only

The final product is planned to use:

```text
Frontend
Next.js + React + TypeScript + Tailwind CSS + shadcn/ui

Canvas
Excalidraw

Calendar
React Day Picker

Backend
Node.js + Express.js

Database
PostgreSQL

Firebase
Authentication + realtime collaboration
```

This information is context only.

The prototype must NOT implement the backend architecture yet.

---

# 34. Next Phase After Prototype

When this prototype has been tested and the UX is approved:

```text
Frontend Prototype
      ↓
GitHub
      ↓
VS Code
      ↓
Code Review / Refactor
      ↓
Express REST API
      ↓
PostgreSQL
      ↓
Firebase Authentication
      ↓
Replace localStorage
      ↓
Share permissions
      ↓
Firebase realtime collaboration
      ↓
Deployment
```

Do not begin these phases until the frontend prototype is accepted.
