import type { Task } from "./task.types.js";

const tasks: Task[] = [];

export const taskRepository = {
  findAll(): Task[] {
    return [...tasks];
  },

  findById(id: string): Task | null {
    return tasks.find((task) => task.id === id) || null;
  },

  create(task: Task): Task {
    tasks.push(task);
    return task;
  },

  update(id: string, updates: Partial<Omit<Task, "id" | "createdAt">>): Task | null {
    const index = tasks.findIndex((task) => task.id === id);
    if (index === -1) return null;

    const updatedTask = {
      ...tasks[index],
      ...updates,
      id,
      createdAt: tasks[index].createdAt,
      updatedAt: new Date().toISOString(),
    };

    tasks[index] = updatedTask;
    return updatedTask;
  },

  remove(id: string): boolean {
    const index = tasks.findIndex((task) => task.id === id);
    if (index === -1) return false;

    tasks.splice(index, 1);
    return true;
  },
};
